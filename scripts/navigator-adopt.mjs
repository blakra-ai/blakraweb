#!/usr/bin/env node
/*
 * Adopt a delivered model as the Navigator.
 *
 *   node scripts/navigator-adopt.mjs <model.glb> [names.json] [--augment] [--eyes x,y,z,r] [--head y] [--simplify ratio] [--optimize] [--dry]
 *
 * --simplify 0.2 keeps 20% of the triangles (meshoptimizer, error-bounded), applied to the model's
 * own meshes before the injected parts; use it to bring a 500k-triangle sculpt under the 150k budget.
 *
 * --augment: for a single-mesh auto-rigged model (Meshy, Tripo, Mixamo), injects what the site
 * needs and the tool cannot give: Eye_L/R spheres and Lid_L/R shells under Head, a Jaw node with
 * the Mouth empty, the seven Sys_* lights along the spine, and an Inner_* set for the X-ray.
 * Positions are derived from the Head bone and the mesh's top; --eyes overrides the eye offset
 * from the Head bone in metres (x, y, z) and the radius r. Mixamo's "mixamorig:" prefix is
 * stripped automatically.
 *
 * Reads the artist's GLB, lists its node and morph-target names against the contract
 * (src/features/navigator/figure/contract.ts), renames nodes from names.json ({ "theirName":
 * "Eye_L", ... }), optionally optimises (dedup, prune, weld, meshopt), and writes
 * src/assets/navigator/navigator.glb. The contract test (tests/navigator-contract.test.ts) then
 * guards the file. With --dry nothing is written: you get the report and a names.json skeleton.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, meshopt, simplify, textureCompress } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import { MeshoptEncoder } from 'meshoptimizer'
import { CONTRACT, validateNames } from '../src/features/navigator/figure/names.ts'
import { CHAKRAS } from '../src/features/navigator/yantra.ts'

const args = process.argv.slice(2)
const WITH_VALUE = new Set(['--eyes', '--head', '--simplify'])
const flags = new Set(args.filter((a) => a.startsWith('--')))
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && WITH_VALUE.has(args[i - 1])))
const [input, namesPath] = positional
if (!input) {
  console.error('usage: node scripts/navigator-adopt.mjs <model.glb> [names.json] [--optimize] [--dry]')
  process.exit(2)
}
const OUT = 'src/assets/navigator/navigator.glb'
if (!existsSync(input)) {
  console.error(`No file at "${input}". Export the model from the AI tool as GLB first, then pass its real path, e.g.\n  node scripts/navigator-adopt.mjs ~/Downloads/model.glb --augment --dry`)
  process.exit(2)
}

await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(input)
const root = doc.getRoot()

// Renames first, so the report describes the file as it will be written.
const map = namesPath ? JSON.parse(readFileSync(namesPath, 'utf8')) : {}
let renamed = 0
for (const node of root.listNodes()) {
  const to = map[node.getName()]
  if (to && to !== node.getName()) {
    node.setName(to)
    renamed++
  }
}


// Mixamo-style prefixes fall away; the contract uses the bare humanoid names.
for (const node of root.listNodes()) {
  const bare = node.getName().replace(/^mixamorig\d*:/, '')
  if (bare !== node.getName()) {
    node.setName(bare)
    renamed++
  }
}

// ---- Augmentation: the parts a single-mesh model lacks --------------------------------------
const byName = (n) => root.listNodes().find((x) => x.getName() === n) ?? null
const scratch = root.listBuffers()[0] ?? doc.createBuffer()

function mat4Invert(m) {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7]
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15]
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (!det) return null
  det = 1 / det
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det, (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det, (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det, (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det, (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det,
  ]
}
const xform = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]
const worldPos = (node) => { const m = node.getWorldMatrix(); return [m[12], m[13], m[14]] }
const worldScale = (node) => { const m = node.getWorldMatrix(); return Math.hypot(m[0], m[1], m[2]) }

/** A UV sphere (or its upper half) as a primitive, in the parent's local units. */
function spherePrim(r, material, { half = false, seg = 20, ring = 14 } = {}) {
  const pos = [], nor = [], idx = []
  const rings = half ? Math.ceil(ring / 2) : ring
  for (let i = 0; i <= rings; i++) {
    const v = (i / ring) * Math.PI
    for (let j = 0; j <= seg; j++) {
      const u = (j / seg) * Math.PI * 2
      const x = Math.sin(v) * Math.cos(u), y = Math.cos(v), z = Math.sin(v) * Math.sin(u)
      pos.push(x * r, y * r, z * r)
      nor.push(x, y, z)
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + seg + 1
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const prim = doc.createPrimitive().setMaterial(material)
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(scratch))
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(scratch))
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(scratch))
  return prim
}
/** A named sphere mesh node at a WORLD point, parented to `parent` (local transform derived). */
function addSphere(name, parent, world, r, material, opts) {
  const inv = mat4Invert(parent.getWorldMatrix())
  const local = inv ? xform(inv, world) : world
  const k = worldScale(parent) || 1
  const mesh = doc.createMesh(name).addPrimitive(spherePrim(r / k, material, opts))
  const node = doc.createNode(name).setMesh(mesh).setTranslation(local)
  parent.addChild(node)
  return node
}
function addEmpty(name, parent, world) {
  const inv = mat4Invert(parent.getWorldMatrix())
  const node = doc.createNode(name).setTranslation(inv ? xform(inv, world) : world)
  parent.addChild(node)
  return node
}
const mat = (name, color, extra = {}) => {
  const m = doc.createMaterial(name).setBaseColorFactor([...color, 1]).setMetallicFactor(extra.metal ?? 0).setRoughnessFactor(extra.rough ?? 0.5)
  if (extra.emissive) m.setEmissiveFactor(extra.emissive)
  return m
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)

if (flags.has('--augment')) {
  // No skeleton (a sculpted bust from Rodin/Meshy): build a plain one down the mesh's axis, so the
  // head can turn and the parts have bones to follow. --head <y> places the Head bone (metres);
  // otherwise it sits one head-length below the top, where a bust's head is about a third of its height.
  if (!byName('Head')) {
    let top = -Infinity, bottom = Infinity, cx = 0, cz = 0, n = 0
    for (const node of root.listNodes()) {
      const mesh = node.getMesh()
      if (!mesh) continue
      const m = node.getWorldMatrix()
      for (const prim of mesh.listPrimitives()) {
        const p = prim.getAttribute('POSITION')
        if (!p) continue
        const v = []
        for (let i = 0; i < p.getCount(); i++) {
          const w = xform(m, p.getElement(i, v))
          if (w[1] > top) top = w[1]
          if (w[1] < bottom) bottom = w[1]
          cx += w[0]; cz += w[2]; n++
        }
      }
    }
    cx /= n || 1; cz /= n || 1
    const h = top - bottom
    const headY = flags.has('--head') ? Number(args[args.indexOf('--head') + 1]) : top - (h > 1.2 ? 0.235 : 0.34 * h)
    const chain = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head']
    const ys = h > 1.2
      ? [bottom + 0.53 * h, bottom + 0.6 * h, bottom + 0.68 * h, bottom + 0.77 * h, headY - 0.07, headY]
      : [bottom, bottom + 0.15 * (headY - bottom), bottom + 0.4 * (headY - bottom), bottom + 0.7 * (headY - bottom), headY - 0.25 * (headY - bottom), headY]
    const scene = root.listScenes()[0] ?? doc.createScene()
    let parent = null
    chain.forEach((name, i) => {
      // The skeleton stands on the origin; the meshes are moved onto it below (sculpts often sit off-centre).
      const node = doc.createNode(name).setTranslation([0, i === 0 ? ys[0] : ys[i] - ys[i - 1], 0])
      if (parent) parent.addChild(node)
      else scene.addChild(node)
      parent = node
    })
    // Every mesh follows the Head when the figure turns: parent the mesh nodes to it (a bust is all
    // head). Sculpt exports carry only a translation, so the local offset is the difference of
    // world positions; rotation and scale stay the node's own.
    const headNode = byName('Head')
    const HW = [cx, headY, cz] // where the head is in the sculpt's own space
    for (const node of root.listNodes()) {
      if (!node.getMesh() || chain.includes(node.getName())) continue
      const w = worldPos(node)
      const oldParent = node.listParents().find((x) => x.propertyType === 'Node' || x.propertyType === 'Scene')
      oldParent?.removeChild?.(node)
      node.setTranslation([w[0] - HW[0], w[1] - HW[1], w[2] - HW[2]])
      headNode.addChild(node)
    }
    console.log(`augment: no skeleton; built Hips…Head down the axis (mesh ${bottom.toFixed(2)}…${top.toFixed(2)} m, Head bone at y=${headY.toFixed(3)}); meshes parented to Head`)
  }
  const head = byName('Head'), neck = byName('Neck'), hips = byName('Hips'), spine = byName('Spine'), spine1 = byName('Spine1'), spine2 = byName('Spine2')
  if (!head || !hips) {
    console.error('--augment needs Head and Hips bones (after renames). Found: ' + [...root.listNodes().map((n) => n.getName())].filter((n) => /head|hips|spine|neck/i.test(n)).join(', '))
    process.exit(1)
  }
  // The mesh's top in world space gives the head's length above the Head bone.
  // The mesh's top gives the head's length above the Head bone; the face's front at eye height
  // puts the eyes on the skin, not inside it (a skinned mesh's bind pose is model space already;
  // a rigid mesh takes its node's matrix).
  let topY = -Infinity
  const H = worldPos(head)
  const verts = []
  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    const m = node.getWorldMatrix()
    for (const prim of mesh.listPrimitives()) {
      const p = prim.getAttribute('POSITION')
      if (!p) continue
      const v = []
      for (let i = 0; i < p.getCount(); i++) {
        const w = node.getSkin() ? [...p.getElement(i, v)] : xform(m, p.getElement(i, v))
        if (w[1] > topY) topY = w[1]
        verts.push(w)
      }
    }
  }
  const headLen = Math.max(0.12, topY - H[1]) // typical adult: 0.20–0.24 m
  // Eye height band is 0.3–0.6 of a 0.24 m head above the bone; the face's front is the band's max z.
  let frontZ = -Infinity
  for (const w of verts) if (w[1] > H[1] + 0.3 * headLen && w[1] < H[1] + 0.6 * headLen && Math.abs(w[0] - H[0]) < 0.25 * headLen && w[2] > frontZ) frontZ = w[2]
  if (frontZ === -Infinity) frontZ = H[2] + 0.45 * headLen
  const defaultR = 0.11 * headLen
  const [ex, ey, ez, er] = flags.has('--eyes') ? args[args.indexOf('--eyes') + 1].split(',').map(Number) : [0.19 * headLen, 0.45 * headLen, frontZ - H[2] - 0.35 * defaultR, defaultR]
  console.log(`augment: head bone at y=${H[1].toFixed(3)}, mesh top y=${topY.toFixed(3)}, head length ${headLen.toFixed(3)} m; eyes at ±${ex.toFixed(3)}, +${ey.toFixed(3)}, +${ez.toFixed(3)} r ${er.toFixed(3)}`)

  const white = mat('Eye_White', [0.95, 0.95, 0.95])
  const lidMat = mat('Lid', hex('#e7e4de'), { rough: 0.6 })
  const graphite = mat('Inner', hex('#2a2a30'), { metal: 0.3, rough: 0.6 })
  if (!byName('Eye_L')) addSphere('Eye_L', head, [H[0] - ex, H[1] + ey, H[2] + ez], er, white)
  if (!byName('Eye_R')) addSphere('Eye_R', head, [H[0] + ex, H[1] + ey, H[2] + ez], er, white)
  if (!byName('Lid_L')) addSphere('Lid_L', head, [H[0] - ex, H[1] + ey, H[2] + ez], er * 1.12, lidMat, { half: true })
  if (!byName('Lid_R')) addSphere('Lid_R', head, [H[0] + ex, H[1] + ey, H[2] + ez], er * 1.12, lidMat, { half: true })
  if (!byName('Jaw')) {
    const jaw = addEmpty('Jaw', head, [H[0], H[1] + 0.2 * headLen, H[2] + 0.2 * headLen])
    if (!byName('Mouth')) addEmpty('Mouth', jaw, [H[0], H[1] + 0.18 * headLen, H[2] + 0.42 * headLen])
  } else if (!byName('Mouth')) addEmpty('Mouth', byName('Jaw'), [H[0], H[1] + 0.18 * headLen, H[2] + 0.42 * headLen])
  if (![...root.listNodes()].some((n) => CONTRACT.inner.test(n.getName()))) {
    addSphere('Inner_Skull', head, [H[0], H[1] + 0.55 * headLen, H[2] + 0.05 * headLen], 0.3 * headLen, graphite)
    for (const [i, b] of [spine, spine1, spine2].entries()) if (b) addSphere(`Inner_Spine_${i + 1}`, b, worldPos(b), 0.07 * headLen, graphite)
  }
  // The seven systems, root to crown, on the body's front, each following its bone.
  const P = (b) => worldPos(b)
  const fz = 0.5 * headLen
  const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2)
  const spots = [
    [hips, P(hips)], [spine ?? hips, spine ? mid(P(hips), P(spine)) : P(hips)], [spine1 ?? spine ?? hips, P(spine1 ?? spine ?? hips)], [spine2 ?? spine1 ?? hips, P(spine2 ?? spine1 ?? hips)],
    [neck ?? head, P(neck ?? head)], [head, [H[0], H[1] + 0.62 * headLen, H[2]]], [head, [H[0], H[1] + headLen * 1.02, H[2] - 0.3 * headLen]],
  ]
  spots.forEach(([bone, p], i) => {
    const name = CONTRACT.systems[i]
    if (byName(name)) return
    const z = i === 5 ? p[2] + 0.47 * headLen : i === 6 ? p[2] : p[2] + fz
    const c = hex(CHAKRAS[i].color)
    addSphere(name, bone, [p[0], p[1], z], 0.06 * headLen, mat(name, c, { emissive: c, rough: 0.4 }))
  })
  // A sculpt without materials renders as porcelain: the brand's ceramic.
  let bare = 0
  const porcelain = () => mat('Porcelain', hex('#e7e4de'), { rough: 0.45 })
  let porcelainMat = null
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) if (!prim.getMaterial()) { prim.setMaterial((porcelainMat ??= porcelain())); bare++ }
  if (bare) console.log(`augment: ${bare} primitive(s) had no material; porcelain assigned`)
  // A single-mesh model: its one mesh is the Face for the loader's head box.
  if (!byName('Face')) {
    const meshes = root.listNodes().filter((n) => n.getMesh())
    meshes.sort((a, b) => (b.getMesh().listPrimitives()[0]?.getAttribute('POSITION')?.getCount() ?? 0) - (a.getMesh().listPrimitives()[0]?.getAttribute('POSITION')?.getCount() ?? 0))
    if (meshes[0]) { console.log(`augment: "${meshes[0].getName()}" becomes Face`); meshes[0].setName('Face') }
  }
}

const nodes = new Set(root.listNodes().map((n) => n.getName()))
const morphs = new Set()
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) for (const name of prim.getParent?.()?.getExtras?.()?.targetNames ?? mesh.getExtras()?.targetNames ?? []) morphs.add(name)
const report = validateNames(nodes, morphs)

let tris = 0
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) tris += Math.floor((p.getIndices()?.getCount() ?? p.getAttribute('POSITION')?.getCount() ?? 0) / 3)
const textures = root.listTextures().map((t) => `${t.getName() || '(unnamed)'} ${t.getSize()?.join('×') ?? '?'} ${t.getMimeType()}`)
const skins = root.listSkins().length

console.log(`\n${input}: ${root.listNodes().length} nodes, ${tris} triangles, ${skins} skin(s), ${textures.length} texture(s)${renamed ? `, ${renamed} renamed` : ''}`)
for (const t of textures) console.log('  texture', t)
console.log(`contract: ${report.ok ? 'OK' : 'MISSING ' + report.missing.join(', ')} · hair chains ${report.hairChains} · blink ${report.blink} · jaw ${report.jaw}`)
if (tris > 150000) console.log(`warning: ${tris} triangles is over the 150k budget; ask for a decimated delivery or run with --optimize and a simplify pass`)

if (!report.ok) {
  // A skeleton to fill: every required name on the left is what we need; put their node name on the right... then invert.
  const skeleton = Object.fromEntries([...CONTRACT.meshes.required, ...CONTRACT.systems, ...CONTRACT.bones.required].filter((n) => !nodes.has(n)).map((n) => ['<their node name>', n]))
  console.log('\nTheir node names:\n  ' + [...nodes].sort().join('\n  '))
  console.log('\nnames.json skeleton ({ "theirName": "contractName" }):\n' + JSON.stringify(skeleton, null, 2))
}

if (flags.has('--simplify')) {
  const ratio = Number(args[args.indexOf('--simplify') + 1])
  await MeshoptSimplifier.ready
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001, lockBorder: true }))
  let after = 0
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) after += Math.floor((p.getIndices()?.getCount() ?? 0) / 3)
  console.log(`simplified to ratio ${ratio}: ${after} triangles`)
}
if (flags.has('--optimize')) {
  await MeshoptEncoder.ready
  // keepLeaves: the Jaw and Mouth empties are part of the contract.
  await doc.transform(dedup(), prune({ keepLeaves: true }), weld(), meshopt({ encoder: MeshoptEncoder }))
  console.log('optimised: dedup, prune, weld, meshopt')
}

if (flags.has('--dry')) {
  console.log('\n--dry: nothing written')
  process.exit(report.ok ? 0 : 1)
}
if (!report.ok) {
  console.error(`\nnot written: the contract is not met. Fill names.json and run again.`)
  process.exit(1)
}
const bytes = await io.writeBinary(doc)
writeFileSync(OUT, bytes)
console.log(`\nwrote ${OUT}: ${bytes.byteLength} bytes. Now: npx vitest run tests/navigator-contract.test.ts`)

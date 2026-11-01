#!/usr/bin/env node
/*
 * Adopt a delivered model as the Navigator.
 *
 *   node scripts/navigator-adopt.mjs <model.glb> [names.json] [--augment] [--eyes x,y,z,r] [--head y|x,y,z] [--simplify ratio] [--drop regex] [--webp quality] [--optimize] [--dry]
 *       [--yaw deg] [--head-meshes regex] [--skin-head regex --neck y0,y1] [--bake-look] [--tint r,g,b:regex] [--tex-max px] [--tex-hi regex]
 *
 * A Sketchfab-style scene (Astraía): --yaw turns the whole scene about Y so she faces +Z; with
 * --augment and no skeleton, --head x,y,z puts the Head pivot at a world point (the neck),
 * --cap <regex> closes every open boundary loop of the matching meshes with a fan (a doll's arm
 * segments with open tube ends; the fan takes the loop's own material, skinning and UVs); with
 * --augment, --same-eyes gives Eye_R Eye_L's mesh and orientation so both eyes are identical.
 * --head-meshes limits which rigid nodes follow it (through bridge nodes, so their own animation
 * tracks keep working), --upright gives the matching nodes an identity world rotation (their
 * children compensate), so a model's own eyeballs mapped to Eye_L/R turn about world axes for the
 * gaze, and --skin-head skins the matching rigid meshes between Spine1 and Head
 * with a blend across --neck y0,y1, so one shell from head to hips turns at the neck. --bake-look
 * moves a baked emissive map into the base colour (lit by our lights, not its own), drops
 * transmission and clearcoat and sets a matte PBR; --tint multiplies the base colour of the
 * materials matching the regex (a blue bake made porcelain). --tex-max caps every texture
 * (default 2048 with --webp); --tex-hi keeps that cap for the matching materials' base and normal
 * maps and halves it for the rest.
 *
 * --drop <regex> removes every node whose name matches, with its subtree (a second copy of the
 * figure, preview props); --webp <q> re-encodes textures as WebP at that quality (needs sharp).
 * names.json may map the model's eye bones to EyeSocket_L / EyeSocket_R: the eye spheres then sit
 * exactly on them instead of the estimate.
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
const WITH_VALUE = new Set(['--eyes', '--head', '--simplify', '--drop', '--webp', '--eye-forward', '--yaw', '--head-meshes', '--skin-head', '--neck', '--tint', '--tex-max', '--tex-hi', '--upright', '--cap'])
const value = (flag) => args[args.indexOf(flag) + 1]
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

// ---- Drop: a second copy of the figure, preview props, anything named ------------------------
if (flags.has('--drop')) {
  const re = new RegExp(args[args.indexOf('--drop') + 1])
  let dropped = 0
  const victims = root.listNodes().filter((n) => re.test(n.getName()))
  const disposeTree = (n) => { for (const c of n.listChildren()) disposeTree(c); n.dispose() }
  for (const n of victims) { if (n.isDisposed?.() ) continue; disposeTree(n); dropped++ }
  await doc.transform(prune())
  console.log(`dropped ${dropped} node(s) matching ${re}; pruned unused meshes, skins, materials and textures`)
}

// ---- Yaw: turn the scene's top-level nodes about Y (she faces +Z, the camera) ------------------
if (flags.has('--yaw')) {
  const deg = Number(value('--yaw'))
  const h = (deg * Math.PI) / 360
  const qy = [0, Math.sin(h), 0, Math.cos(h)]
  const mulQ = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ]
  const rotV = ([x, y, z]) => [x * Math.cos(2 * h) + z * Math.sin(2 * h), y, -x * Math.sin(2 * h) + z * Math.cos(2 * h)]
  for (const scene of root.listScenes()) for (const top of scene.listChildren()) {
    top.setRotation(mulQ(qy, top.getRotation()))
    top.setTranslation(rotV(top.getTranslation()))
  }
  console.log(`yawed the scene by ${deg}°`)
}

// ---- Cap: close the open ends of the matching meshes ------------------------------------------
if (flags.has('--cap')) {
  const re = new RegExp(value('--cap'))
  let caps = 0
  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh || !re.test(node.getName())) continue
    for (const prim of mesh.listPrimitives()) {
      const idxAcc = prim.getIndices()
      if (!idxAcc) continue
      const idx = Array.from(idxAcc.getArray())
      // Boundary edges: used by one triangle only, kept in their triangle's direction.
      const count = new Map()
      const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`)
      for (let i = 0; i < idx.length; i += 3) for (const [a, b] of [[idx[i], idx[i + 1]], [idx[i + 1], idx[i + 2]], [idx[i + 2], idx[i]]]) count.set(key(a, b), (count.get(key(a, b)) ?? 0) + 1)
      const edges = []
      for (let i = 0; i < idx.length; i += 3) for (const [a, b] of [[idx[i], idx[i + 1]], [idx[i + 1], idx[i + 2]], [idx[i + 2], idx[i]]]) if (count.get(key(a, b)) === 1) edges.push([a, b])
      if (!edges.length) continue
      // Loops: connected components of the boundary edges (union-find), one fan centre each.
      const parent = new Map()
      const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
      for (const [a, b] of edges) { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); parent.set(find(a), find(b)) }
      const loops = new Map()
      for (const [a, b] of edges) { const r = find(a); if (!loops.has(r)) loops.set(r, []); loops.get(r).push([a, b]) }
      const attrs = prim.listSemantics().map((sem) => [sem, prim.getAttribute(sem)])
      const base = prim.getAttribute('POSITION').getCount()
      const extra = new Map(attrs.map(([sem]) => [sem, []]))
      const newIdx = []
      let c = base
      for (const loop of loops.values()) {
        if (loop.length < 3) continue
        const verts = [...new Set(loop.flat())]
        for (const [sem, acc] of attrs) {
          const n = acc.getElementSize()
          const sum = new Array(n).fill(0)
          const v = []
          for (const i of verts) { acc.getElement(i, v); for (let k = 0; k < n; k++) sum[k] += v[k] }
          // Averaged for positions, UVs and normals; the first vertex's for joints and weights (a blend of indices is nonsense).
          const el = /^(JOINTS|WEIGHTS)/.test(sem) ? acc.getElement(verts[0], []) : sum.map((x) => x / verts.length)
          if (sem === 'NORMAL') { const l = Math.hypot(...el) || 1; for (let k = 0; k < 3; k++) el[k] /= l }
          extra.get(sem).push(...el)
        }
        // The fan: each boundary edge reversed, so the cap faces the way the tube's wall does.
        for (const [a, b] of loop) newIdx.push(b, a, c)
        c++
        caps++
      }
      if (c === base) continue
      for (const [sem, acc] of attrs) {
        const old = acc.getArray()
        const add = extra.get(sem)
        const out = new old.constructor(old.length + add.length)
        out.set(old)
        out.set(add.map((x) => (old instanceof Float32Array ? x : Math.round(x))), old.length)
        acc.setArray(out)
      }
      const all = [...idx, ...newIdx]
      idxAcc.setArray(c > 65535 ? new Uint32Array(all) : new Uint16Array(all))
      prim.getMaterial()?.setDoubleSided(true)
    }
  }
  console.log(`capped ${caps} open loop(s) on meshes matching ${re}`)
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
const mat4Mul = (a, b) => {
  const o = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
/** A column-major TRS matrix as translation, quaternion and scale (no shear). */
function mat4Decompose(m) {
  const sx = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]), sz = Math.hypot(m[8], m[9], m[10])
  const r = [m[0] / sx, m[1] / sx, m[2] / sx, 0, m[4] / sy, m[5] / sy, m[6] / sy, 0, m[8] / sz, m[9] / sz, m[10] / sz, 0, 0, 0, 0, 1]
  return { t: [m[12], m[13], m[14]], r: worldQuatOf(r), sc: [sx, sy, sz] }
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
    // Counter-clockwise seen from outside, so the front faces survive culling.
    idx.push(a, a + 1, b, b, a + 1, b + 1)
  }
  const prim = doc.createPrimitive().setMaterial(material)
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(scratch))
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(scratch))
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(scratch))
  return prim
}
/** The rotation part of a world matrix as a quaternion [x, y, z, w] (scale removed). */
function worldQuat(node) {
  return worldQuatOf(node.getWorldMatrix())
}
function worldQuatOf(m) {
  const sx = Math.hypot(m[0], m[1], m[2]) || 1, sy = Math.hypot(m[4], m[5], m[6]) || 1, sz = Math.hypot(m[8], m[9], m[10]) || 1
  const r00 = m[0] / sx, r01 = m[4] / sy, r02 = m[8] / sz, r10 = m[1] / sx, r11 = m[5] / sy, r12 = m[9] / sz, r20 = m[2] / sx, r21 = m[6] / sy, r22 = m[10] / sz
  const t = r00 + r11 + r22
  let x, y, z, w
  if (t > 0) { const S = Math.sqrt(t + 1) * 2; w = S / 4; x = (r21 - r12) / S; y = (r02 - r20) / S; z = (r10 - r01) / S }
  else if (r00 > r11 && r00 > r22) { const S = Math.sqrt(1 + r00 - r11 - r22) * 2; w = (r21 - r12) / S; x = S / 4; y = (r01 + r10) / S; z = (r02 + r20) / S }
  else if (r11 > r22) { const S = Math.sqrt(1 + r11 - r00 - r22) * 2; w = (r02 - r20) / S; x = (r01 + r10) / S; y = S / 4; z = (r12 + r21) / S }
  else { const S = Math.sqrt(1 + r22 - r00 - r11) * 2; w = (r10 - r01) / S; x = (r02 + r20) / S; y = (r12 + r21) / S; z = S / 4 }
  return [x, y, z, w]
}
/**
 * A named sphere mesh node at a WORLD point, parented to `parent` (local transform derived). With
 * `upright`, the node's world rotation is identity, so its local +Z faces the viewer and its local
 * X is horizontal: the eye shader's pupil and the lids' blink axis depend on it.
 */
function addSphere(name, parent, world, r, material, opts = {}) {
  const inv = mat4Invert(parent.getWorldMatrix())
  const local = inv ? xform(inv, world) : world
  const k = worldScale(parent) || 1
  const mesh = doc.createMesh(name).addPrimitive(spherePrim(r / k, material, opts))
  const node = doc.createNode(name).setMesh(mesh).setTranslation(local)
  if (opts.upright) {
    const [x, y, z, w] = worldQuat(parent)
    let q = [-x, -y, -z, w] // the inverse of the parent's world rotation: identity in the world
    if (opts.tiltX) {
      // q × rotX(tiltX): the cap tilts back at rest, so an open eye shows the lid only as a rim.
      const h = opts.tiltX / 2, bx = Math.sin(h), bw = Math.cos(h)
      const [ax, ay, az, aw] = q
      q = [aw * bx + ax * bw, ay * bw + az * bx, az * bw - ay * bx, aw * bw - ax * bx]
    }
    node.setRotation(q)
  }
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
    const headArg = flags.has('--head') ? value('--head').split(',').map(Number) : null
    const headY = headArg ? headArg[headArg.length === 3 ? 1 : 0] : top - (h > 1.2 ? 0.235 : 0.34 * h)
    // --head x,y,z: the pivot stands at that world point (the chain is built there and recentred below).
    const [hx, hz] = headArg && headArg.length === 3 ? [headArg[0], headArg[2]] : [0, 0]
    const chain = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head']
    const ys = h > 1.2
      ? [bottom + 0.53 * h, bottom + 0.6 * h, bottom + 0.68 * h, bottom + 0.77 * h, headY - 0.07, headY]
      : [bottom, bottom + 0.15 * (headY - bottom), bottom + 0.4 * (headY - bottom), bottom + 0.7 * (headY - bottom), headY - 0.25 * (headY - bottom), headY]
    const scene = root.listScenes()[0] ?? doc.createScene()
    let parent = null
    chain.forEach((name, i) => {
      // The skeleton stands on the origin; the meshes are moved onto it below (sculpts often sit off-centre).
      const node = doc.createNode(name).setTranslation([i === 0 ? hx : 0, i === 0 ? ys[0] : ys[i] - ys[i - 1], i === 0 ? hz : 0])
      if (parent) parent.addChild(node)
      else scene.addChild(node)
      parent = node
    })
    // Every mesh follows the Head when the figure turns: parent the mesh nodes to it (a bust is all
    // head). With --head-meshes only the matching nodes follow, each through a bridge node that
    // carries its old parent's frame, so the node's own TRS (and any animation track on it) is kept.
    const headNode = byName('Head')
    const HW = [cx, headY, cz] // where the head is in the sculpt's own space
    const headRe = flags.has('--head-meshes') ? new RegExp(value('--head-meshes')) : null
    const skinRe = flags.has('--skin-head') ? new RegExp(value('--skin-head')) : null
    const bridges = new Map()
    const topLevel = new Set(root.listScenes().flatMap((sc) => sc.listChildren()))
    for (const node of root.listNodes()) {
      if (!node.getMesh() || chain.includes(node.getName()) || node.getSkin()) continue
      if (skinRe && (skinRe.test(node.getName()) || skinRe.test(node.listParents().find((x) => x.propertyType === 'Node')?.getName() ?? ''))) continue
      const oldParent = node.listParents().find((x) => x.propertyType === 'Node' || x.propertyType === 'Scene')
      if (headRe) {
        if (!headRe.test(node.getName()) && !headRe.test(oldParent?.getName?.() ?? '')) continue
        // The bridge: Head-local = inv(HeadWorld) × oldParentWorld (the Head node is built upright and unscaled).
        const key = oldParent?.propertyType === 'Node' ? oldParent : null
        let bridge = bridges.get(key)
        if (!bridge) {
          const HWm = headNode.getWorldMatrix()
          const PW = key ? key.getWorldMatrix() : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
          const inv = mat4Invert(HWm)
          const local = mat4Mul(inv, PW)
          bridge = doc.createNode(`HeadRig_${bridges.size + 1}`)
          const { t, r, sc } = mat4Decompose(local)
          bridge.setTranslation(t).setRotation(r).setScale(sc)
          headNode.addChild(bridge)
          bridges.set(key, bridge)
        }
        if (topLevel.has(node)) topLevel.delete(node)
        oldParent?.removeChild?.(node)
        bridge.addChild(node)
        continue
      }
      const w = worldPos(node)
      oldParent?.removeChild?.(node)
      node.setTranslation([w[0] - HW[0], w[1] - HW[1], w[2] - HW[2]])
      headNode.addChild(node)
    }
    // --skin-head: one shell from head to hips turns at the neck: the matching rigid meshes are
    // baked to world space and skinned between Spine1 (still) and Head across the --neck band.
    if (skinRe) {
      const [n0, n1] = flags.has('--neck') ? value('--neck').split(',').map(Number) : [headY - 0.04, headY + 0.04]
      const spine1 = byName('Spine1')
      const scene = root.listScenes()[0]
      const ibm = (joint) => mat4Invert(joint.getWorldMatrix())
      const skin = doc.createSkin('HeadSkin').addJoint(spine1).addJoint(headNode)
      skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(new Float32Array([...ibm(spine1), ...ibm(headNode)])).setBuffer(scratch))
      let skinned = 0
      for (const node of root.listNodes()) {
        if (!node.getMesh() || node.getSkin()) continue
        const parent = node.listParents().find((x) => x.propertyType === 'Node')
        if (!(skinRe.test(node.getName()) || skinRe.test(parent?.getName() ?? ''))) continue
        const m = node.getWorldMatrix()
        const mesh = node.getMesh()
        for (const prim of mesh.listPrimitives()) {
          const pos = prim.getAttribute('POSITION')
          const nor = prim.getAttribute('NORMAL')
          const n = pos.getCount()
          const P = new Float32Array(n * 3), N = nor ? new Float32Array(n * 3) : null
          const J = new Uint8Array(n * 4), W = new Float32Array(n * 4)
          const v = []
          for (let i = 0; i < n; i++) {
            const w = xform(m, pos.getElement(i, v))
            P.set(w, i * 3)
            if (N) {
              const q = nor.getElement(i, v)
              const r = [m[0] * q[0] + m[4] * q[1] + m[8] * q[2], m[1] * q[0] + m[5] * q[1] + m[9] * q[2], m[2] * q[0] + m[6] * q[1] + m[10] * q[2]]
              const l = Math.hypot(...r) || 1
              N.set([r[0] / l, r[1] / l, r[2] / l], i * 3)
            }
            const t = Math.max(0, Math.min(1, (w[1] - n0) / Math.max(1e-6, n1 - n0)))
            const wh = t * t * (3 - 2 * t)
            J.set([0, 1, 0, 0], i * 4)
            W.set([1 - wh, wh, 0, 0], i * 4)
          }
          pos.setArray(P)
          if (N) nor.setArray(N)
          prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(J).setBuffer(scratch))
          prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(W).setBuffer(scratch))
        }
        // The node now holds world-space geometry: it stands at the scene root with the identity.
        parent?.removeChild(node)
        node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]).setSkin(skin)
        scene.addChild(node)
        skinned++
      }
      console.log(`augment: skinned ${skinned} mesh node(s) to Spine1 → Head across y ${n0}…${n1}`)
    }
    // --upright: the matching nodes get an identity world rotation; their children take the old
    // rotation, so nothing moves. The gaze then turns the node about world x and y.
    if (flags.has('--upright')) {
      const re = new RegExp(value('--upright'))
      let n = 0
      for (const node of root.listNodes()) {
        if (!re.test(node.getName())) continue
        const parent = node.listParents().find((x) => x.propertyType === 'Node')
        const [px, py, pz, pw] = parent ? worldQuat(parent) : [0, 0, 0, 1]
        const oldLocal = node.getMatrix()
        node.setRotation([-px, -py, -pz, pw]).setScale([1, 1, 1])
        const fix = mat4Mul(mat4Invert(node.getMatrix()), oldLocal)
        for (const child of node.listChildren()) {
          const { t, r, sc } = mat4Decompose(mat4Mul(fix, child.getMatrix()))
          child.setTranslation(t).setRotation(r).setScale(sc)
        }
        n++
      }
      console.log(`augment: ${n} node(s) set upright`)
    }
    console.log(`augment: no skeleton; built Hips…Head down the axis (mesh ${bottom.toFixed(2)}…${top.toFixed(2)} m, Head bone at y=${headY.toFixed(3)}); ${headRe ? `nodes matching ${headRe} parented to Head through ${bridges.size} bridge(s)` : 'meshes parented to Head'}`)
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
        // Skinned or not, the bind pose lives in the mesh node's space: its world matrix maps it to metres.
        const w = xform(m, p.getElement(i, v))
        if (w[1] > topY) topY = w[1]
        verts.push(w)
      }
    }
  }
  // A rigged model's bind pose is not readable from the mesh alone (skins fold the node transforms
  // in), so the head length comes from the eye sockets when mapped (about 3.5 interpupillary
  // distances), else from the mesh's top (a sculpt).
  const _sL = byName('EyeSocket_L'), _sR = byName('EyeSocket_R')
  const headLen = _sL && _sR ? Math.hypot(...worldPos(_sR).map((v, i) => v - worldPos(_sL)[i])) * 3.5 : Math.max(0.12, topY - H[1]) // typical adult: 0.20–0.24 m
  // Eye height band is 0.3–0.6 of a 0.24 m head above the bone; the face's front is the band's max z.
  let frontZ = -Infinity
  for (const w of verts) if (w[1] > H[1] + 0.3 * headLen && w[1] < H[1] + 0.6 * headLen && Math.abs(w[0] - H[0]) < 0.25 * headLen && w[2] > frontZ) frontZ = w[2]
  if (frontZ === -Infinity) frontZ = H[2] + 0.45 * headLen
  const defaultR = 0.11 * headLen
  let [ex, ey, ez, er] = flags.has('--eyes') ? args[args.indexOf('--eyes') + 1].split(',').map(Number) : [0.19 * headLen, 0.45 * headLen, frontZ - H[2] - 0.35 * defaultR, defaultR]
  // Eye bones mapped as EyeSocket_L/R: the spheres sit on them (midpoint x, their y, their z plus a
  // little forward so the shader's disk clears the model's own eyeball).
  const sockL = byName('EyeSocket_L'), sockR = byName('EyeSocket_R')
  let eyeWorld = null
  if (sockL && sockR) {
    const L = worldPos(sockL), R = worldPos(sockR)
    const half = Math.abs(R[0] - L[0]) / 2
    er = flags.has('--eyes') ? er : Math.min(defaultR, half * 0.45)
    // A socket that is the model's own eyeball mesh: the sphere takes its radius and replaces it.
    let ownR = 0
    for (const holder of [sockL, sockR].flatMap((sock) => [sock, ...sock.listChildren()])) {
      const sock = holder
      const mesh = sock.getMesh()
      if (!mesh) continue
      const m = sock.getWorldMatrix()
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
      for (const prim of mesh.listPrimitives()) {
        const p = prim.getAttribute('POSITION'), v = []
        for (let i = 0; i < p.getCount(); i++) { const w = xform(m, p.getElement(i, v)); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], w[k]); mx[k] = Math.max(mx[k], w[k]) } }
      }
      ownR = Math.max(ownR, Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2)
      sock.setMesh(null)
    }
    if (ownR && !flags.has('--eyes')) er = ownR
    // Forward by most of a radius: the shader's disk must clear the model's own eyeball and lids.
    const fwd = flags.has('--eye-forward') ? Number(args[args.indexOf('--eye-forward') + 1]) : 1.6
    eyeWorld = { L: [L[0], L[1], L[2] + fwd * er], R: [R[0], R[1], R[2] + fwd * er] }
    console.log(`augment: eye sockets found at ${L.map((v) => v.toFixed(3))} / ${R.map((v) => v.toFixed(3))}, r ${er.toFixed(3)}`)
  }
  console.log(`augment: head bone at y=${H[1].toFixed(3)}, mesh top y=${topY.toFixed(3)}, head length ${headLen.toFixed(3)} m; eyes at ±${ex.toFixed(3)}, +${ey.toFixed(3)}, +${ez.toFixed(3)} r ${er.toFixed(3)}`)

  const white = mat('Eye_White', [0.95, 0.95, 0.95])
  // Lids: porcelain on a porcelain figure; a skin tone over a textured face.
  const lidMat = mat('Lid', hex(root.listTextures().length ? '#c7906f' : '#e7e4de'), { rough: 0.7 })
  const graphite = mat('Inner', hex('#2a2a30'), { metal: 0.3, rough: 0.6 })
  const EL = eyeWorld ? eyeWorld.L : [H[0] - ex, H[1] + ey, H[2] + ez]
  const ER = eyeWorld ? eyeWorld.R : [H[0] + ex, H[1] + ey, H[2] + ez]
  if (!byName('Eye_L')) addSphere('Eye_L', head, EL, er, white, { upright: true })
  if (!byName('Eye_R')) addSphere('Eye_R', head, ER, er, white, { upright: true })
  // The model's own eyeballs mapped to Eye_L/R keep their look: the lids are empties (blink off).
  const ownEyes = byName('Eye_L') && byName('Eye_R') && !eyeWorld
  if (ownEyes) {
    const eL = byName('Eye_L'), eR = byName('Eye_R')
    if (flags.has('--same-eyes')) {
      // Eye_R takes Eye_L's child (mesh and orientation): two identical eyes, pupils where Eye_L's are.
      for (const ch of eR.listChildren()) ch.dispose()
      for (const ch of eL.listChildren()) {
        const copy = doc.createNode(ch.getName() + '_R').setMesh(ch.getMesh()).setTranslation(ch.getTranslation()).setRotation(ch.getRotation()).setScale(ch.getScale())
        eR.addChild(copy)
      }
      if (eR.getMesh()) eR.setMesh(eL.getMesh())
      console.log('augment: Eye_R made identical to Eye_L')
    }
    // Glass: one material of their own, smooth enough for a faint highlight from the key light.
    let glass = null
    for (const eye of [eL, eR]) for (const holder of [eye, ...eye.listChildren()]) for (const prim of holder.getMesh()?.listPrimitives() ?? []) {
      const src = prim.getMaterial()
      if (!glass) glass = (src ? src.clone() : doc.createMaterial()).setName('Eye_Glass').setMetallicFactor(0).setRoughnessFactor(0.18)
      prim.setMaterial(glass)
    }
  }
  if (!byName('Lid_L')) ownEyes ? addEmpty('Lid_L', head, worldPos(byName('Eye_L'))) : addSphere('Lid_L', head, EL, er * 1.12, lidMat, { half: true, upright: true, tiltX: -1.05 })
  if (!byName('Lid_R')) ownEyes ? addEmpty('Lid_R', head, worldPos(byName('Eye_R'))) : addSphere('Lid_R', head, ER, er * 1.12, lidMat, { half: true, upright: true, tiltX: -1.05 })
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
  // The figure stands on the origin: the loader and the poses assume the head is at x = z = 0, so
  // the whole scene is shifted by the Head bone's world offset (a rigged model keeps its skin:
  // the shift goes on the scene's top-level nodes, bones and meshes together).
  {
    const HW0 = worldPos(byName('Head'))
    if (!flags.has('--no-centre') && (Math.abs(HW0[0]) > 0.005 || Math.abs(HW0[2]) > 0.005)) {
      for (const scene of root.listScenes()) for (const top of scene.listChildren()) {
        const t = top.getTranslation()
        const k = worldScale(top) || 1
        // top-level nodes have no parent transform: a world shift is a local shift.
        top.setTranslation([t[0] - HW0[0], t[1], t[2] - HW0[2]])
        void k
      }
      console.log(`augment: recentred the figure by (${(-HW0[0]).toFixed(3)}, 0, ${(-HW0[2]).toFixed(3)}) so the head stands on the origin`)
    }
  }
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

// ---- Look: a baked Sketchfab look (emissive maps) becomes lit PBR; a tint warms a blue bake -----
if (flags.has('--bake-look')) {
  let baked = 0
  for (const m of root.listMaterials()) {
    const em = m.getEmissiveTexture()
    if (em) {
      // The bake is the colour: it goes in the base slot (lit by our key and fill), the emissive goes dark.
      const info = m.getEmissiveTextureInfo()
      m.setBaseColorTexture(em)
      if (info) { m.getBaseColorTextureInfo().setTexCoord(info.getTexCoord()) }
      m.setEmissiveTexture(null)
      m.setEmissiveFactor([0, 0, 0])
      m.setBaseColorFactor([1, 1, 1, m.getBaseColorFactor()[3]])
      baked++
    }
    m.setMetallicRoughnessTexture(null)
    m.setMetallicFactor(0)
    m.setRoughnessFactor(0.55)
    for (const e of m.listExtensions()) if (/transmission|clearcoat|ior|specular|volume/.test(e.extensionName)) e.dispose()
  }
  await doc.transform(prune({ keepLeaves: true }))
  console.log(`bake-look: ${baked} emissive map(s) moved to base colour; metallic and transmission dropped; ${root.listTextures().length} texture(s) remain`)
}
if (flags.has('--tint')) {
  // r,g,b:regex multiplies the matching materials' base colour (gains over 1 are applied to the
  // pixels, a dark blue bake made porcelain); grey:regex turns their base map monochrome.
  const sharp = (await import('sharp')).default
  for (const spec of value('--tint').split(';')) {
    const [what, re] = spec.split(':')
    const test = new RegExp(re ?? '.')
    const done = new Set()
    let n = 0
    for (const m of root.listMaterials()) {
      if (!test.test(m.getName())) continue
      n++
      const t = m.getBaseColorTexture()
      if (what === 'grey') {
        if (t && !done.has(t)) { t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).grayscale().png().toBuffer())).setMimeType('image/png'); done.add(t) }
        continue
      }
      const f = what.split(',').map(Number)
      const b = m.getBaseColorFactor()
      if (f.some((x) => x > 1) && t) {
        if (!done.has(t)) { t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).linear(f, [0, 0, 0]).png().toBuffer())).setMimeType('image/png'); done.add(t) }
      } else m.setBaseColorFactor([b[0] * f[0], b[1] * f[1], b[2] * f[2], b[3]])
    }
    console.log(`tint ${what} on ${n} material(s) matching ${test}`)
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
if (flags.has('--webp')) {
  const q = Number(args[args.indexOf('--webp') + 1]) || 82
  const sharp = (await import('sharp')).default
  const before = root.listTextures().reduce((a, t) => a + (t.getImage()?.byteLength ?? 0), 0)
  const max = flags.has('--tex-max') ? Number(value('--tex-max')) : 2048
  // Textures are named after their material and slot, so --tex-hi can pick them by pattern.
  for (const m of root.listMaterials()) for (const slot of ['BaseColor', 'Normal', 'MetallicRoughness', 'Emissive', 'Occlusion']) {
    const t = m[`get${slot}Texture`]()
    if (t && !t.getName()) t.setName(`${m.getName()}:${slot}`)
  }
  if (flags.has('--tex-hi')) {
    const hi = new RegExp(`^(${value('--tex-hi')}):(BaseColor|Normal)$`)
    await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: q, resize: [max, max], pattern: hi }))
    const lo = new RegExp(`^(?!(${value('--tex-hi')}):(BaseColor|Normal)$)`)
    await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: q, resize: [max / 2, max / 2], pattern: lo }))
  } else await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: q, resize: [max, max] }))
  const after = root.listTextures().reduce((a, t) => a + (t.getImage()?.byteLength ?? 0), 0)
  console.log(`textures → webp q${q}: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB (${root.listTextures().length} textures)`)
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

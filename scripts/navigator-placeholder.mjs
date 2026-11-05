/*
 * The Navigator's stand-in: an elf-android built from three.js geometry and exported as a GLB
 * that satisfies the node-name contract (src/features/navigator/figure/contract.ts). The
 * commissioned model replaces the file; the code relies on the names, never on these shapes.
 *
 *   npm run navigator:glb   →  src/assets/navigator/navigator.glb
 *
 * Metres, Y-up, feet at y = 0, 1.78 m tall, 8 heads.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Bone,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Scene,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
  BufferGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { CHAKRAS } from '../src/features/navigator/yantra.ts'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../src/assets/navigator/navigator.glb')

// GLTFExporter is browser-first: it reads its own Blobs back through FileReader.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result = null
    onloadend = null
    onload = null
    onerror = null
    #read(blob, finish) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = finish(buf)
          this.onload?.({ target: this })
          this.onloadend?.({ target: this })
        })
        .catch((e) => this.onerror?.(e))
    }
    readAsArrayBuffer(blob) {
      this.#read(blob, (b) => b)
    }
    readAsDataURL(blob) {
      this.#read(blob, (b) => `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`)
    }
  }
}

/* ---------- proportions (metres) ---------- */
const HEIGHT = 1.78
const HEAD_H = HEIGHT / 8 // 0.2225
const Y = { hips: 0.95, spine: 1.05, spine1: 1.2, spine2: 1.38, neck: 1.5, head: 1.56 }
const HEAD_C = 0.11 // head centre above the Head bone
const HEAD_R = { x: HEAD_H * 0.42, y: HEAD_H * 0.5, z: HEAD_H * 0.45 }

/* ---------- materials ---------- */
const ceramic = new MeshStandardMaterial({ name: 'Ceramic', color: '#e7e4de', roughness: 0.35, metalness: 0.05 })
const graphite = new MeshStandardMaterial({ name: 'Graphite', color: '#2a2a30', roughness: 0.6, metalness: 0.3 })
const chrome = new MeshStandardMaterial({ name: 'Chrome', color: '#d8d8dc', roughness: 0.18, metalness: 1 })
const brass = new MeshStandardMaterial({ name: 'Brass', color: '#c9a24a', roughness: 0.3, metalness: 1 })
const eyeWhite = new MeshStandardMaterial({ name: 'EyeWhite', color: '#ffffff', roughness: 0.2, metalness: 0 })
const hairMat = new MeshStandardMaterial({ name: 'Hair', color: '#f2f0ea', roughness: 0.55, metalness: 0.1, side: DoubleSide })

/* ---------- geometry (from figure.ts) ---------- */

/** A comms fin / elf ear: a sphere drawn into a leaf, base at the origin, tip at y = height. */
function finGeometry(width, height, thickness, ws = 28, hs = 18) {
  const g = new SphereGeometry(1, ws, hs)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const u = (y + 1) / 2
    const w = Math.sin(Math.PI * Math.pow(u, 0.58))
    p.setXYZ(i, x * (width / 2) * w + u * u * 0.12 * height, u * height, z * (thickness / 2) * (0.5 + 0.5 * w) - u * u * 0.55 * height * 0.4)
  }
  g.computeVertexNormals()
  return g
}

/** A curved plate: a rounded box bent round the figure's axis. */
function bentPlate(width, height, depth, radius) {
  const g = new RoundedBoxGeometry(width, height, depth, 3, Math.min(width, height) * 0.15)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    p.setZ(i, p.getZ(i) + Math.sqrt(Math.max(0, radius * radius - x * x)) - radius)
  }
  g.computeVertexNormals()
  return g
}

/** The collar's profile (radius, height above its seat), unit scale. */
const COLLAR = [
  [0.6, 0.18],
  [0.8, 0.15],
  [0.885, 0.06],
  [0.9, -0.05],
  [0.875, -0.16],
  [0.78, -0.23],
  [0.6, -0.24],
].map(([r, y]) => new Vector2(r, y))

/* ---------- helpers ---------- */
const bone = (name, parent, x, y, z) => {
  const b = new Bone()
  b.name = name
  b.position.set(x, y, z)
  parent.add(b)
  return b
}
const mesh = (name, geometry, material, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => {
  const m = new Mesh(geometry, material)
  m.name = name
  m.position.set(...pos)
  m.rotation.set(...rot)
  m.scale.set(...scale)
  parent.add(m)
  return m
}
const empty = (name, parent, pos) => {
  const o = new Object3D()
  o.name = name
  o.position.set(...pos)
  parent.add(o)
  return o
}

/* ---------- build ---------- */
const scene = new Scene()
scene.name = 'Navigator'
const root = new Group()
root.name = 'Armature'
scene.add(root)

const hips = bone('Hips', root, 0, Y.hips, 0)
const spine = bone('Spine', hips, 0, Y.spine - Y.hips, 0)
const spine1 = bone('Spine1', spine, 0, Y.spine1 - Y.spine, 0)
const spine2 = bone('Spine2', spine1, 0, Y.spine2 - Y.spine1, 0)
const neck = bone('Neck', spine2, 0, Y.neck - Y.spine2, 0)
const head = bone('Head', neck, 0, Y.head - Y.neck, 0)

// Head: the face shell (a slightly oval sphere), eyes, lids, jaw, mouth.
mesh('Face', new SphereGeometry(1, 40, 28), ceramic, head, [0, HEAD_C, 0], [0, 0, 0], [HEAD_R.x, HEAD_R.y, HEAD_R.z])
const EYE_R = HEAD_H * 0.12
const EYE_Y = HEAD_C + HEAD_H * 0.05
const EYE_X = HEAD_R.x * 0.42
const EYE_Z = HEAD_R.z * 0.84
mesh('Eye_L', new SphereGeometry(EYE_R, 24, 16), eyeWhite, head, [-EYE_X, EYE_Y, EYE_Z])
mesh('Eye_R', new SphereGeometry(EYE_R, 24, 16), eyeWhite, head, [EYE_X, EYE_Y, EYE_Z])
// Lids: upper half-shells over each eye; the runtime rotates them about x to close.
const lidGeo = new SphereGeometry(EYE_R * 1.12, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)
mesh('Lid_L', lidGeo, ceramic, head, [-EYE_X, EYE_Y, EYE_Z])
mesh('Lid_R', lidGeo, ceramic, head, [EYE_X, EYE_Y, EYE_Z])
// The brow circlet (the crown's mark, brass).
mesh('Circlet', new CylinderGeometry(HEAD_R.x * 1.01, HEAD_R.x * 1.01, 0.006, 40, 1, true), brass, head, [0, HEAD_C + HEAD_R.y * 0.45, 0], [0, 0, 0], [1, 1, HEAD_R.z / HEAD_R.x])
const jaw = bone('Jaw', head, 0, HEAD_C - HEAD_R.y * 0.35, HEAD_R.z * 0.2)
mesh('Chin', new SphereGeometry(1, 20, 12), ceramic, jaw, [0, -HEAD_R.y * 0.35, HEAD_R.z * 0.35], [0, 0, 0], [HEAD_R.x * 0.6, HEAD_R.y * 0.32, HEAD_R.z * 0.45])
empty('Mouth', jaw, [0, -HEAD_R.y * 0.05, HEAD_R.z * 0.78])

// Ears: long leaves swept back and up at 35°, tips a little outward.
const EAR_LEN = HEAD_H * 1.1
const earGeo = finGeometry(HEAD_H * 0.3, EAR_LEN, HEAD_H * 0.09)
const EAR_TILT = (Math.PI / 180) * 55 // 90° − 35°: the tip rises 35° above horizontal
const earL = bone('Ear_L', head, -HEAD_R.x * 0.92, HEAD_C + HEAD_H * 0.02, -HEAD_R.z * 0.05)
earL.rotation.set(0, 0, EAR_TILT)
mesh('Ear_L_Mesh', earGeo, ceramic, earL, [0, 0, 0], [0, Math.PI, 0])
const earR = bone('Ear_R', head, HEAD_R.x * 0.92, HEAD_C + HEAD_H * 0.02, -HEAD_R.z * 0.05)
earR.rotation.set(0, 0, -EAR_TILT)
mesh('Ear_R_Mesh', earGeo, ceramic, earR)

// Neck and collar.
mesh('NeckRod', new CylinderGeometry(0.018, 0.018, Y.head - Y.neck + 0.02, 12), chrome, neck, [0, (Y.head - Y.neck) / 2, 0])
const collarGeo = new LatheGeometry(COLLAR, 48)
collarGeo.scale(0.11, 0.11, 0.11)
collarGeo.computeVertexNormals()
mesh('Collar', collarGeo, ceramic, neck, [0, 0.01, 0])

// Torso, shoulders, arms, legs: rigid meshes parented to bones.
const torsoGeo = new CylinderGeometry(0.15, 0.11, 0.46, 32, 1)
torsoGeo.scale(1, 1, 0.62)
mesh('Torso', torsoGeo, ceramic, spine1, [0, 0.13, 0])
mesh('Chest_Plate', bentPlate(0.22, 0.2, 0.02, 0.2), ceramic, spine2, [0, -0.08, 0.085])
mesh('Pelvis', new SphereGeometry(1, 24, 14), graphite, hips, [0, 0.0, 0], [0, 0, 0], [0.13, 0.09, 0.09])
for (const [side, sx] of [
  ['L', -1],
  ['R', 1],
]) {
  mesh(`Shoulder_${side}`, new SphereGeometry(0.04, 18, 12), chrome, spine2, [sx * 0.19, 0.1, 0])
  mesh(`Pauldron_${side}`, new SphereGeometry(0.065, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), ceramic, spine2, [sx * 0.2, 0.13, 0])
  mesh(`Arm_${side}`, new CapsuleGeometry(0.04, 0.5, 4, 16), ceramic, spine2, [sx * 0.2, -0.2, 0])
  mesh(`Hand_${side}`, new RoundedBoxGeometry(0.05, 0.1, 0.03, 2, 0.01), chrome, spine2, [sx * 0.2, -0.52, 0.01])
  mesh(`Leg_${side}`, new CapsuleGeometry(0.058, 0.78, 4, 16), graphite, hips, [sx * 0.085, -Y.hips / 2 + 0.058 / 2, 0])
  mesh(`Boot_${side}`, new RoundedBoxGeometry(0.08, 0.05, 0.22, 2, 0.015), graphite, hips, [sx * 0.085, -Y.hips + 0.025, 0.05])
}

// The inner set: what the X-ray lens shows.
const inner = new Group()
inner.name = 'Inner'
root.add(inner)
mesh('Inner_Skull', bentPlate(0.12, 0.1, 0.012, 0.08), graphite, head, [0, HEAD_C + 0.01, -0.03])
const spineProfile = []
for (let i = 0; i <= 24; i++) {
  const t = i / 24
  spineProfile.push(new Vector2(0.022 + 0.012 * Math.abs(Math.sin(t * Math.PI * 7)), t * 0.55))
}
mesh('Inner_Spine', new LatheGeometry(spineProfile, 14), graphite, hips, [0, 0.02, -0.03])
mesh('Inner_Rod', new CylinderGeometry(0.008, 0.008, 0.6, 8), chrome, hips, [0, 0.32, -0.03])
mesh('Inner_Core', new SphereGeometry(0.045, 20, 14), brass, spine1, [0, 0.02, 0.02])
mesh('Inner_Control', new BoxGeometry(0.1, 0.06, 0.05), graphite, spine2, [0, -0.02, 0.02])

// The seven systems: small emissive spheres at the chakra points, root to crown.
const SYS = [
  [hips, [0, 0, 0.1]], // root: pelvis
  [spine, [0, 0.03, 0.095]], // sacral: lower belly
  [spine1, [0, 0.02, 0.1]], // solar plexus: the core window
  [spine2, [0, -0.02, 0.1]], // heart: the control unit
  [neck, [0, 0.01, 0.1]], // throat: the collar's front
  [head, [0, HEAD_C + HEAD_R.y * 0.45, HEAD_R.z * 0.92]], // brow: the circlet's mark
  [head, [0, HEAD_C + HEAD_H * 0.02 + Math.sin((Math.PI / 180) * 35) * EAR_LEN, -HEAD_R.z * 0.1]], // crown: between the ear tips
]
SYS.forEach(([parent, pos], i) => {
  const mat = new MeshStandardMaterial({
    name: `Sys_${String(i + 1).padStart(2, '0')}`,
    color: '#111114',
    emissive: new Color(CHAKRAS[i].color),
    emissiveIntensity: 1,
    roughness: 0.4,
    metalness: 0,
  })
  mesh(`Sys_${String(i + 1).padStart(2, '0')}`, new SphereGeometry(0.014, 12, 8), mat, parent, pos)
})

// Hair: seven chains of five bones rooted on the scalp, hanging down the back and sides.
const CHAINS = 7
const SEG = 0.1
const chains = []
for (let c = 0; c < CHAINS; c++) {
  // Azimuth across the back of the head: −115° … +115° from straight back, a touch higher at the centre.
  const a = Math.PI + ((c / (CHAINS - 1)) * 2 - 1) * (Math.PI / 180) * 115
  const lift = 0.35 + 0.25 * Math.cos(a - Math.PI)
  const rx = HEAD_R.x * 0.98
  const rz = HEAD_R.z * 0.98
  const rootPos = new Vector3(Math.sin(a) * rx * Math.cos(lift), HEAD_C + HEAD_R.y * Math.sin(lift), Math.cos(a) * rz * Math.cos(lift))
  const out = new Vector3(rootPos.x, 0, rootPos.z).normalize()
  const list = []
  let parent = head
  for (let k = 1; k <= 5; k++) {
    const name = `Hair_${String(c + 1).padStart(2, '0')}_${k}`
    let b
    if (k === 1) b = bone(name, parent, rootPos.x, rootPos.y, rootPos.z)
    else if (k === 2) b = bone(name, parent, out.x * 0.03, -SEG * 0.8, out.z * 0.03)
    else b = bone(name, parent, 0, -SEG, 0)
    list.push(b)
    parent = b
  }
  chains.push(list)
}
scene.updateMatrixWorld(true)

// One skinned mesh of card strips, one strip per chain, each row weighted to one bone.
{
  const allBones = chains.flat()
  const pos = []
  const nrm = []
  const uv = []
  const idx = []
  const sIdx = []
  const sW = []
  const W = 0.045
  const p = new Vector3()
  const q = new Vector3()
  chains.forEach((list, c) => {
    const base = pos.length / 3
    const rows = list.length + 1
    for (let r = 0; r < rows; r++) {
      const b = list[Math.min(r, list.length - 1)]
      b.getWorldPosition(p)
      if (r === rows - 1) p.y -= SEG // the tip hangs one segment below the last bone
      // The card faces outward from the head's axis.
      q.set(p.x, 0, p.z).normalize()
      const tx = -q.z
      const tz = q.x
      pos.push(p.x - tx * W * 0.5, p.y, p.z - tz * W * 0.5, p.x + tx * W * 0.5, p.y, p.z + tz * W * 0.5)
      nrm.push(q.x, 0, q.z, q.x, 0, q.z)
      uv.push(0, r / (rows - 1), 1, r / (rows - 1))
      const bi = allBones.indexOf(b)
      sIdx.push(bi, 0, 0, 0, bi, 0, 0, 0)
      sW.push(1, 0, 0, 0, 1, 0, 0, 0)
    }
    for (let r = 0; r < rows - 1; r++) {
      const a0 = base + r * 2
      idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2)
    }
    void c
  })
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setAttribute('skinIndex', new Uint16BufferAttribute(sIdx, 4))
  g.setAttribute('skinWeight', new Float32BufferAttribute(sW, 4))
  g.setIndex(idx)
  const hair = new SkinnedMesh(g, hairMat)
  hair.name = 'Hair'
  root.add(hair)
  hair.bind(new Skeleton(allBones), new Matrix4())
}
scene.updateMatrixWorld(true)

// Checks before export: height, triangle count.
let tris = 0
scene.traverse((o) => {
  if (!o.isMesh) return
  const g = o.geometry
  tris += (g.index ? g.index.count : g.attributes.position.count) / 3
})
const tip = new Vector3(0, 1, 0).applyQuaternion(new Quaternion().setFromEuler(earR.rotation)).multiplyScalar(EAR_LEN).add(earR.getWorldPosition(new Vector3()))
console.log(`ear tip y = ${tip.y.toFixed(3)} m, crown light y = ${SYS[6][1][1] + Y.head}`)

const exporter = new GLTFExporter()
const out = await exporter.parseAsync(scene, { binary: true, trs: true, embedImages: false, onlyVisible: true })
const buffer = Buffer.from(out)
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, buffer)

// Verify the names survived the round trip by reading the JSON chunk back.
const jsonLen = buffer.readUInt32LE(12)
const json = JSON.parse(buffer.subarray(20, 20 + jsonLen).toString('utf8'))
const names = new Set((json.nodes ?? []).map((n) => n.name))
const want = ['Face', 'Eye_L', 'Eye_R', 'Hair', 'Collar', 'Torso', 'Hips', 'Head', 'Jaw', 'Mouth', 'Ear_L', 'Ear_R', 'Sys_01', 'Sys_07', 'Hair_07_5', 'Inner_Core']
const lost = want.filter((n) => !names.has(n))
if (lost.length) {
  console.error(`node names lost in export: ${lost.join(', ')}`)
  process.exit(1)
}
console.log(`wrote ${OUT}: ${tris} triangles, ${buffer.length} bytes, ${json.nodes.length} nodes, ${json.skins?.length ?? 0} skin(s)`)

import {
  AdditiveBlending,
  type AnimationClip,
  Bone,
  Box3,
  SkinnedMesh,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { glowTexture } from '../figure'
import { lens, withLens } from '../lens'
import { eyeFragment, eyeVertex } from '../visor'
import { CHAKRAS } from '../yantra'
import { afterReveal } from '../../observatory/ready'
import { CONTRACT, FIGURE_TEXTURES, HAIR_BONES, validateNames, type Figure, type FigureBoneName } from './contract'

/*
 * Loads the Navigator's GLB and resolves it by name into a `Figure`: bones, eyes, lids, jaw,
 * mouth, the seven systems, the inner set, with every material cloned per mesh and wrapped for
 * the X-ray lens, the eye shader installed and the metrics measured from the bones. The parsed
 * glTF is cached by URL; every `loadFigure` call works on its own skeleton clone, so the world
 * and the dock each get an independent figure from one download.
 */

const LID_CLOSE = 1.1 // rad: an upper half-shell turned down over the eye
const JAW_OPEN = 0.12 // rad: the lips part 2–3 mm on a head this size
const GLOW_SIZE = 0.09 // m: the soft sprite behind each system's light

const sources = new Map<string, Promise<GLTF>>()

function loader(): GLTFLoader {
  const l = new GLTFLoader()
  l.setMeshoptDecoder(MeshoptDecoder)
  if (FIGURE_TEXTURES === 'ktx2') {
    // TODO(FIGURE_TEXTURES): new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer); l.setKTX2Loader(...).
    // Needs the renderer and `basis_transcoder.{js,wasm}` under public/basis/. Not wired until the asset ships compressed textures.
    console.warn('[navigator] FIGURE_TEXTURES is "ktx2" but the KTX2 loader is not wired; textures will not decode.')
  }
  return l
}

/** The parsed glTF for a URL, downloaded once. The scene is pristine: callers clone before touching it. */
export function getFigureSource(url: string): Promise<GLTF> {
  let p = sources.get(url)
  if (!p) {
    p = loader().loadAsync(url)
    sources.set(url, p)
  }
  return p
}

function collectNames(root: Object3D) {
  const nodes = new Set<string>()
  const morphs = new Set<string>()
  root.traverse((o) => {
    if (o.name) nodes.add(o.name)
    const dict = (o as Mesh).morphTargetDictionary
    if (dict) for (const k of Object.keys(dict)) morphs.add(k)
  })
  return { nodes, morphs }
}

function byName(root: Object3D): Map<string, Object3D> {
  const m = new Map<string, Object3D>()
  root.traverse((o) => {
    if (o.name && !m.has(o.name)) m.set(o.name, o)
  })
  return m
}

/** Every mesh under `o` (inclusive), for material work. */
function meshesUnder(o: Object3D): Mesh[] {
  const out: Mesh[] = []
  o.traverse((c) => {
    if ((c as Mesh).isMesh) out.push(c as Mesh)
  })
  return out
}

/** What `loadFigure` adds beyond the contract, for the component that applies the performance. */
export interface LoadedFigure extends Figure {
  /** The glow sprites' materials, one per system (opacity follows the light). */
  glows: SpriteMaterial[]
  outer: Mesh[]
  inner: Mesh[]
  /** The model's own clips ("Walk", "Idle" on the deer), bound by node name; empty for a still model. */
  clips: AnimationClip[]
}

/** Load the figure at `url`. Rejects when the GLB breaks the contract (throws in dev, warns in prod). */
export async function loadFigure(url: string): Promise<LoadedFigure> {
  const gltf = await getFigureSource(url)
  // The measuring below is a long task: never on the brand loader's reveal.
  await afterReveal()
  const { nodes, morphs } = collectNames(gltf.scene)
  const report = validateNames(nodes, morphs)
  if (!report.ok) {
    const msg = `[navigator] the GLB at ${url} misses: ${report.missing.join(', ')}`
    if (import.meta.env.DEV) throw new Error(msg)
    console.warn(msg)
    throw new Error(msg)
  }

  const root = cloneSkeleton(gltf.scene) as Group
  root.name = 'NavigatorFigure'
  const named = byName(root)
  const need = (name: string) => {
    const o = named.get(name)
    if (!o) throw new Error(`[navigator] node ${name} vanished in the clone`)
    return o
  }

  // Bones.
  const bones = {} as Figure['bones']
  for (const n of CONTRACT.bones.required) bones[n as FigureBoneName] = need(n) as Bone
  for (const n of ['Jaw', 'Ear_L', 'Ear_R'] as const) {
    const o = named.get(n)
    if (o) bones[n] = o as Bone
  }

  // Eyes: rigid meshes under Head; the hole shader shares the lens uniform with every other material.
  const eyes: [Object3D, Object3D] = [need('Eye_L'), need('Eye_R')]
  const uTime = { value: 0 }
  const uShow = { value: 0 }
  const uBright = { value: 0 }
  const uBand = { value: -1 }
  // A model that brings its own textured eyeballs keeps them; the
  // hole shader goes only on bare spheres. The shader material still exists so the uniforms the
  // performance writes (uShow, uBright, uBand) have a home either way.
  const eyeMats = eyes.map((e) => {
    const m = new ShaderMaterial({ vertexShader: eyeVertex, fragmentShader: eyeFragment, uniforms: { uLens: lens, uTime, uShow, uBright, uBand } })
    for (const mesh of meshesUnder(e)) {
      const own = (mesh.material as MeshStandardMaterial | undefined)?.map
      if (!own) mesh.material = m
    }
    return m
  }) as [ShaderMaterial, ShaderMaterial]

  // The seven systems: emissive, kept; a soft additive glow sprite behind each.
  const glowMap = glowTexture()
  const systems: Object3D[] = []
  const sysMats: MeshStandardMaterial[] = []
  const glows: SpriteMaterial[] = []
  CONTRACT.systems.forEach((n, i) => {
    const o = need(n)
    systems.push(o)
    const mesh = meshesUnder(o)[0]
    const src = mesh?.material as Material | undefined
    const mat = src instanceof MeshStandardMaterial ? src.clone() : new MeshStandardMaterial({ color: '#111114' })
    mat.emissive.set(CHAKRAS[i].color)
    mat.emissiveIntensity = 0.3
    withLens(mat, 'outside')
    if (mesh) mesh.material = mat
    sysMats.push(mat)
    const glow = new SpriteMaterial({ map: glowMap, color: CHAKRAS[i].color, transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false })
    glows.push(glow)
    const sprite = new Sprite(glow)
    sprite.name = `${n}_Glow`
    sprite.position.set(0, 0, 0.006)
    sprite.scale.set(GLOW_SIZE, GLOW_SIZE, 1)
    o.add(sprite)
  })

  // Every other mesh: its own material, cut by the lens (outer: outside kept; Inner_*: inside kept).
  const taken = new Set<Object3D>([...eyes.flatMap(meshesUnder), ...systems.flatMap(meshesUnder)])
  const outer: Mesh[] = []
  const inner: Mesh[] = []
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || taken.has(mesh) || (mesh as unknown as Sprite).isSprite) return
    let insideSet = false
    for (let p: Object3D | null = mesh; p && p !== root; p = p.parent) {
      if (CONTRACT.inner.test(p.name)) insideSet = true
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const cloned = mats.map((m) => withLens(m.clone(), insideSet ? 'inside' : 'outside'))
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]
    ;(insideSet ? inner : outer).push(mesh)
  })

  // Lids and jaw: rotation drivers from the nodes, or morph drivers from Face.
  const face = need('Face') as Mesh
  const rest = (o: Object3D) => o.rotation.x
  let blink: Figure['blink']
  if (report.blink === 'lids') {
    const lids = [need('Lid_L'), need('Lid_R')]
    const rests = lids.map(rest)
    blink = (closed) => lids.forEach((l, i) => (l.rotation.x = rests[i] + closed * LID_CLOSE))
  } else if (report.blink === 'morph' && face.morphTargetDictionary && face.morphTargetInfluences) {
    const iL = face.morphTargetDictionary.Blink_L
    const iR = face.morphTargetDictionary.Blink_R
    const inf = face.morphTargetInfluences
    blink = (closed) => {
      inf[iL] = closed
      inf[iR] = closed
    }
  } else blink = () => {}

  let jaw: Figure['jaw']
  if (report.jaw === 'bone' && bones.Jaw) {
    const j = bones.Jaw
    const r = rest(j)
    jaw = (open) => (j.rotation.x = r + open * JAW_OPEN)
  } else if (report.jaw === 'morph' && face.morphTargetDictionary && face.morphTargetInfluences) {
    const i = face.morphTargetDictionary.MouthOpen
    const inf = face.morphTargetInfluences
    jaw = (open) => (inf[i] = open)
  } else jaw = () => {}

  // Hair chains, by name, in order.
  let hair: Figure['hair'] = null
  if (report.hairChains > 0) {
    const chains: Bone[][] = []
    for (let c = 1; c <= 8; c++) {
      const list: Bone[] = []
      for (let k = 1; k <= HAIR_BONES; k++) {
        const b = named.get(`Hair_${String(c).padStart(2, '0')}_${k}`)
        if (b) list.push(b as Bone)
      }
      if (list.length === HAIR_BONES) chains.push(list)
    }
    root.updateMatrixWorld(true)
    const restPts = new Float32Array(chains.length * HAIR_BONES * 3)
    const v = new Vector3()
    chains.forEach((list, c) =>
      list.forEach((b, k) => {
        b.getWorldPosition(v)
        restPts.set([v.x, v.y, v.z], (c * HAIR_BONES + k) * 3)
      }),
    )
    // The same points in the Head bone's space (what hair.ts simulates in), and Spine2 for the shoulders' capsule.
    const headInv = new Matrix4().copy(bones.Head.matrixWorld).invert()
    const restHead = new Float32Array(restPts.length)
    for (let i = 0; i < restPts.length; i += 3) {
      v.set(restPts[i], restPts[i + 1], restPts[i + 2]).applyMatrix4(headInv)
      restHead.set([v.x, v.y, v.z], i)
    }
    bones.Spine2.getWorldPosition(v).applyMatrix4(headInv)
    hair = { bones: chains, rest: restPts, restHead, shoulder: [v.x, v.y, v.z] }
  }

  // Metrics, in world space with the root at rest (identity transform): nothing here is a constant.
  root.updateMatrixWorld(true)
  // A skinned mesh's bounds come from its bones, not its node: update the skeletons first and
  // let Box3 use the skinned bounding boxes (precise), else a rigged model measures as its bind
  // buffer in the exporter's units.
  root.traverse((o) => {
    const sk = o as SkinnedMesh
    if (sk.isSkinnedMesh) {
      sk.skeleton.update()
      sk.computeBoundingBox()
    }
  })
  const box = new Box3().setFromObject(root, true)
  const height = box.max.y - box.min.y
  // The head's top includes the hair when the model names it: a face mesh often stops at the brow.
  const hairNode = named.get('Hair')
  const headTop = Math.max(new Box3().setFromObject(face, true).max.y, hairNode ? new Box3().setFromObject(hairNode, true).max.y : -Infinity)
  const headAt = bones.Head.getWorldPosition(new Vector3())
  // The Head bone sits at the skull's base (the jaw line), so base → top of the Face mesh is the head's height.
  const headHeight = Math.max(1e-3, headTop - headAt.y)
  const eL = eyes[0].getWorldPosition(new Vector3())
  const eR = eyes[1].getWorldPosition(new Vector3())
  const eyeMid = eL.clone().add(eR).multiplyScalar(0.5)
  const mouth = named.get('Mouth') ?? bones.Jaw ?? bones.Head
  const mouthAt = mouth.getWorldPosition(new Vector3())
  const mouthY = named.get('Mouth') || bones.Jaw ? mouthAt.y : eyeMid.y - 0.35 * headHeight
  const metrics = { height, headHeight, eyeY: eyeMid.y, mouthY, headZ: eyeMid.z }

  const figure: LoadedFigure = {
    root,
    bones,
    eyes,
    eyeMats,
    blink,
    jaw,
    mouth,
    systems,
    sysMats,
    hair,
    metrics,
    glows,
    outer,
    inner,
    clips: gltf.animations,
  }
  if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__figure = figure
  return figure
}

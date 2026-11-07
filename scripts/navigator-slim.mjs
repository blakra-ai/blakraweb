#!/usr/bin/env node
/*
 * Slims an adopted Navigator GLB for the web, in place, and keeps her look (checked by screenshot diff).
 *
 *   node scripts/navigator-slim.mjs [in.glb] [out.glb] [--hi px] [--lo px] [--q quality]
 *
 * - The clips go: she never walks (guidePose.ts is her whole life), and each clip costs 150 accessors in the JSON.
 * - One skin: the adopter quantized each mesh in its own box, which made seven skins that differ only
 *   by that box. Her vertices go back to one space and every mesh shares one skin, so the runtime
 *   keeps one skeleton and uploads one bone texture per frame instead of seven. Positions take --pos
 *   bits over the scene (14: 0.2 mm on her 3.4 m), UVs --uv (12: a quarter texel at 1024).
 * - The textures are resized to what her size on screen resolves: the body's base and normal maps to
 *   --hi, the rest to --lo, re-encoded as WebP (already meshopt + WebP: KTX2 would add a transcoder).
 * - Her measurements are baked into the scene's extras (`metrics`): walking every skinned vertex to
 *   find her height and the top of her head was a long task on load (loadFigure.ts reads them, and
 *   measures as before when a model has none).
 *
 * Run it after navigator-adopt. It is idempotent: a texture at or under its size is left alone.
 */
import { NodeIO, PropertyType } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { dedup, dequantize, prune, quantize, reorder, textureCompress } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'
import { Box3, Matrix4, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder as ThreeMeshopt } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  if (i < 0) return fallback
  const [v] = args.splice(i, 2).slice(1)
  return Number(v)
}
const HI = flag('--hi', 1024)
const LO = flag('--lo', 512)
const Q = flag('--q', 82)
const POS_BITS = flag('--pos', 14)
const UV_BITS = flag('--uv', 12)
const input = args[0] ?? 'src/assets/navigator/navigator.glb'
const output = args[1] ?? input

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(input)
const root = doc.getRoot()

const dropClips = (d) => {
  for (const a of d.getRoot().listAnimations()) {
    for (const c of a.listChannels()) c.dispose()
    for (const s of a.listSamplers()) s.dispose()
    a.dispose()
  }
}
dropClips(doc)

/** Each skinned mesh's vertices into the first skin's space, then every mesh onto that skin (positions scale uniformly: normals keep). */
function oneSkin(d) {
  const nodes = d.getRoot().listNodes().filter((n) => n.getSkin() && n.getMesh())
  if (nodes.length < 2) return
  const skins = [...new Set(nodes.map((n) => n.getSkin()))]
  const ref = skins[0]
  const sameJoints = (a, b) => a.listJoints().length === b.listJoints().length && a.listJoints().every((j, i) => j === b.listJoints()[i])
  if (!skins.every((s) => sameJoints(ref, s))) return
  const refIbm = ref.getInverseBindMatrices().getArray()
  const m = new Matrix4()
  const inv = new Matrix4().fromArray(refIbm, 0).invert()
  const v = new Vector3()
  for (const n of nodes) {
    const skin = n.getSkin()
    if (skin === ref) continue
    // ref_ibm⁻¹ × this_ibm: from this mesh's quantized space into the reference's.
    m.fromArray(skin.getInverseBindMatrices().getArray(), 0).premultiply(inv)
    for (const prim of n.getMesh().listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      const out = pos.clone()
      for (let i = 0; i < pos.getCount(); i++) {
        v.fromArray(pos.getElement(i, [0, 0, 0])).applyMatrix4(m)
        out.setElement(i, [v.x, v.y, v.z])
      }
      prim.setAttribute('POSITION', out)
    }
    n.setSkin(ref)
  }
  for (const s of skins) if (s !== ref) s.dispose()
}

await doc.transform(dequantize({ pattern: /^(POSITION|TEXCOORD_0)$/ }))
oneSkin(doc)
await doc.transform(
  quantize({ quantizationVolume: 'scene', quantizePosition: POS_BITS, quantizeTexcoord: UV_BITS, quantizeNormal: 8, pattern: /^(POSITION|TEXCOORD_0)$/ }),
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.SKIN, PropertyType.MESH] }),
  reorder({ encoder: MeshoptEncoder }),
  prune({ keepLeaves: true, keepExtras: true, keepAttributes: true }),
)

const large = /Material\.001:(BaseColor|Normal)/
// The lit strips' maps stay sharp: they are the brightest edges on her, and cost little.
const keep = /Emissive/
const sized = async (t) => (await sharp(Buffer.from(t.getImage())).metadata()).width
for (const t of root.listTextures()) {
  const name = t.getName()
  if (keep.test(name)) continue
  const px = large.test(name) ? HI : LO
  const was = await sized(t)
  if (was <= px) continue
  const before = t.getImage().length
  const slug = name.replace(/[^\w]/g, '.')
  t.setName(slug)
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: Q, resize: [px, px], slots: /.*/, pattern: new RegExp(`^${slug.replace(/\./g, '\\.')}$`) }))
  t.setName(name)
  console.log(`${name}: ${was} → ${px} px, ${before} → ${t.getImage().length} B`)
}

/*
 * Her measurements, exactly as loadFigure.ts would take them at rest: the bake is a copy of that walk
 * through three's own skinning, run on this file with its textures left out.
 */
async function measure() {
  const probe = await io.read(input)
  dropClips(probe)
  for (const t of probe.getRoot().listTextures()) t.dispose()
  probe.createExtension(EXTMeshoptCompression).dispose()
  const glb = await io.writeBinary(probe)
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(ThreeMeshopt)
  const gltf = await loader.parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '')
  const scene = gltf.scene
  scene.updateMatrixWorld(true)
  scene.traverse((o) => o.isSkinnedMesh && o.skeleton.update())
  const box = new Box3().setFromObject(scene, true)
  const face = scene.getObjectByName('Face')
  const hair = scene.getObjectByName('Hair')
  const headTop = Math.max(new Box3().setFromObject(face, true).max.y, hair ? new Box3().setFromObject(hair, true).max.y : -Infinity)
  const head = scene.getObjectByName('Head').getWorldPosition(new Vector3())
  return { height: box.max.y - box.min.y, headTop, headY: head.y }
}

const metrics = await measure()
console.log('metrics', metrics)
const scene = root.getDefaultScene() ?? root.listScenes()[0]
scene.setExtras({ ...scene.getExtras(), metrics: { height: metrics.height, headTop: metrics.headTop } })

doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER })
await io.write(output, doc)
console.log(`wrote ${output}`)

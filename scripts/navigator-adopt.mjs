#!/usr/bin/env node
/*
 * Adopt a delivered model as the Navigator.
 *
 *   node scripts/navigator-adopt.mjs <model.glb> [names.json] [--optimize] [--dry]
 *
 * Reads the artist's GLB, lists its node and morph-target names against the contract
 * (src/features/navigator/figure/contract.ts), renames nodes from names.json ({ "theirName":
 * "Eye_L", ... }), optionally optimises (dedup, prune, weld, meshopt), and writes
 * src/assets/navigator/navigator.glb. The contract test (tests/navigator-contract.test.ts) then
 * guards the file. With --dry nothing is written: you get the report and a names.json skeleton.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import { CONTRACT, validateNames } from '../src/features/navigator/figure/names.ts'

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const [input, namesPath] = args.filter((a) => !a.startsWith('--'))
if (!input) {
  console.error('usage: node scripts/navigator-adopt.mjs <model.glb> [names.json] [--optimize] [--dry]')
  process.exit(2)
}
const OUT = 'src/assets/navigator/navigator.glb'

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

if (flags.has('--optimize')) {
  await MeshoptEncoder.ready
  await doc.transform(dedup(), prune(), weld(), meshopt({ encoder: MeshoptEncoder }))
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

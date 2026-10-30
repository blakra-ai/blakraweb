import type { Bone, Group, MeshStandardMaterial, Object3D, ShaderMaterial } from 'three'
import glbUrl from '../../../assets/navigator/navigator.glb?url'

/*
 * The Navigator's asset contract: the glTF node names the code relies on, and nothing else.
 * A commissioned model replaces the file and must pass validateNames(); every measurement
 * (height, eye line, mouth) is taken from the loaded bones, never from a constant here.
 */

/** Where the figure's GLB lives (the only constant a model swap changes, with FIGURE_TEXTURES). */
export const GLB_URL: string = glbUrl

/** 'ktx2' once the asset ships compressed textures (the loader then adds KTX2Loader). */
export const FIGURE_TEXTURES: 'none' | 'ktx2' = 'none'

export const CONTRACT = {
  meshes: { required: ['Face', 'Eye_L', 'Eye_R', 'Hair', 'Collar', 'Torso'], optional: ['Arm_L', 'Arm_R', 'Leg_L', 'Leg_R', 'Lid_L', 'Lid_R'] },
  inner: /^Inner_/, // at least one; lens 'inside'
  systems: ['Sys_01', 'Sys_02', 'Sys_03', 'Sys_04', 'Sys_05', 'Sys_06', 'Sys_07'], // all; emissive material
  bones: { required: ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'], optional: ['Jaw', 'Mouth', 'Ear_L', 'Ear_R'] },
  hair: /^Hair_(\d\d)_(\d)$/, // chains 01..08 × bones 1..5; optional set
  morphs: { optional: ['Blink_L', 'Blink_R', 'MouthOpen'] }, // on Face, used when Lid_*/Jaw absent
} as const

export interface ContractReport {
  ok: boolean
  missing: string[]
  hairChains: number
  blink: 'lids' | 'morph' | 'none'
  jaw: 'bone' | 'morph' | 'none'
}

/** How many bones a hair chain has (Hair_XX_1 … Hair_XX_5). */
export const HAIR_BONES = 5

/**
 * Checks a set of node names (and morph target names) against the contract. Pure: the loader
 * collects the names from the scene, the test from the file's JSON chunk.
 */
export function validateNames(nodes: Set<string>, morphs: Set<string>): ContractReport {
  const missing: string[] = []
  for (const n of CONTRACT.meshes.required) if (!nodes.has(n)) missing.push(n)
  for (const n of CONTRACT.bones.required) if (!nodes.has(n)) missing.push(n)
  for (const n of CONTRACT.systems) if (!nodes.has(n)) missing.push(n)
  let inner = false
  for (const n of nodes) if (CONTRACT.inner.test(n)) inner = true
  if (!inner) missing.push('Inner_*')

  const chains = new Map<string, Set<number>>()
  for (const n of nodes) {
    const m = CONTRACT.hair.exec(n)
    if (!m) continue
    const set = chains.get(m[1]) ?? new Set<number>()
    set.add(Number(m[2]))
    chains.set(m[1], set)
  }
  let hairChains = 0
  for (const set of chains.values()) {
    let whole = true
    for (let i = 1; i <= HAIR_BONES; i++) if (!set.has(i)) whole = false
    if (whole) hairChains++
  }

  const blink: ContractReport['blink'] = nodes.has('Lid_L') && nodes.has('Lid_R') ? 'lids' : morphs.has('Blink_L') && morphs.has('Blink_R') ? 'morph' : 'none'
  const jaw: ContractReport['jaw'] = nodes.has('Jaw') ? 'bone' : morphs.has('MouthOpen') ? 'morph' : 'none'

  return { ok: missing.length === 0, missing, hairChains, blink, jaw }
}

export type FigureBoneName = 'Hips' | 'Spine' | 'Spine1' | 'Spine2' | 'Neck' | 'Head'

/** The loaded figure, resolved by name: what Figure.tsx and the living modules drive. */
export interface Figure {
  root: Group
  bones: Record<FigureBoneName, Bone> & Partial<Record<'Jaw' | 'Ear_L' | 'Ear_R', Bone>>
  eyes: [Object3D, Object3D]
  eyeMats: [ShaderMaterial, ShaderMaterial]
  /** Drivers resolved from lids or morphs: 0 open … 1 closed, 0 shut … 1 open. */
  blink: (closed: number) => void
  jaw: (open: number) => void
  mouth: Object3D
  systems: Object3D[]
  sysMats: MeshStandardMaterial[]
  /** Chain bones; rest points in root space and in the Head bone's space (metres, root at rest); Spine2 in the Head's space. */
  hair: { bones: Bone[][]; rest: Float32Array; restHead: Float32Array; shoulder: [number, number, number] } | null
  /** Measured from the bones at load, in metres. */
  metrics: { height: number; headHeight: number; eyeY: number; mouthY: number; headZ: number }
}

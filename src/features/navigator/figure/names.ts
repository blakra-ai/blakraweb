/*
 * The GLB contract by name, pure: no asset or three imports, so Node scripts (navigator-adopt) and
 * the browser loader share one definition.
 */
export const CONTRACT = {
  // Face may be the whole body (a single-mesh model): the loader only needs it for the head's box.
  meshes: { required: ['Face', 'Eye_L', 'Eye_R'], optional: ['Hair', 'Collar', 'Torso', 'Arm_L', 'Arm_R', 'Leg_L', 'Leg_R', 'Lid_L', 'Lid_R'] },
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


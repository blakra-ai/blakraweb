import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTRACT, validateNames } from '../src/features/navigator/figure/contract'

/*
 * Guards the asset itself: a commissioned model that breaks the node-name contract fails here,
 * before a browser opens. Reads the GLB's JSON chunk straight from the binary container.
 */

const GLB = resolve(__dirname, '../src/assets/navigator/navigator.glb')

interface GltfJson {
  nodes?: { name?: string; mesh?: number }[]
  meshes?: { primitives: { indices?: number; attributes: Record<string, number>; mode?: number }[]; extras?: { targetNames?: string[] } }[]
  accessors?: { count: number }[]
  skins?: { joints: number[] }[]
  materials?: { name?: string; emissiveFactor?: number[] }[]
}

function readGlbJson(file: string): GltfJson {
  const buf = readFileSync(file)
  expect(buf.readUInt32LE(0)).toBe(0x46546c67) // 'glTF'
  expect(buf.readUInt32LE(4)).toBe(2)
  expect(buf.readUInt32LE(8)).toBe(buf.length)
  const chunkLen = buf.readUInt32LE(12)
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a) // 'JSON'
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString('utf8'))
}

const gltf = readGlbJson(GLB)
const nodeNames = new Set((gltf.nodes ?? []).map((n) => n.name ?? ''))
const morphNames = new Set((gltf.meshes ?? []).flatMap((m) => m.extras?.targetNames ?? []))

describe('the Navigator GLB honours the node-name contract', () => {
  it('validates: every required name, seven hair chains, lids and a jaw bone', () => {
    const report = validateNames(nodeNames, morphNames)
    expect(report.missing).toEqual([])
    expect(report.ok).toBe(true)
    expect(report.hairChains).toBeGreaterThanOrEqual(0)
    expect(report.blink).toBe('lids')
    expect(report.jaw).toBe('bone')
  })

  it('stays inside the asset budget: ≤ 150k triangles, < 8 MB', () => {
    let tris = 0
    for (const m of gltf.meshes ?? []) {
      for (const p of m.primitives) {
        const count = p.indices !== undefined ? gltf.accessors![p.indices].count : gltf.accessors![p.attributes.POSITION].count
        if ((p.mode ?? 4) === 4) tris += count / 3
      }
    }
    expect(tris).toBeGreaterThan(0)
    expect(tris).toBeLessThanOrEqual(150_000)
    expect(statSync(GLB).size).toBeLessThan(8 * 1024 * 1024)
  })

  it('lights the systems, and skins the hair when the model has chains', () => {
    for (const name of CONTRACT.systems) {
      const mat = gltf.materials!.find((m) => m.name === name)!
      expect(mat.emissiveFactor?.some((c) => c > 0)).toBe(true)
    }
    const hair = gltf.nodes!.find((n) => n.name === 'Hair')
    const chains = validateNames(nodeNames, morphNames).hairChains
    if (hair && chains > 0) {
      expect(hair.mesh).toBeDefined()
      expect('skin' in hair).toBe(true)
    }
  })
})

describe('validateNames', () => {
  it('reports a missing required mesh', () => {
    const nodes = new Set(nodeNames)
    nodes.delete('Eye_R')
    const report = validateNames(nodes, morphNames)
    expect(report.ok).toBe(false)
    expect(report.missing).toContain('Eye_R')
  })

  it('falls back to morphs when lids and jaw are absent, and needs an inner set', () => {
    const nodes = new Set(nodeNames)
    for (const n of ['Lid_L', 'Lid_R', 'Jaw']) nodes.delete(n)
    const report = validateNames(nodes, new Set(['Blink_L', 'Blink_R', 'MouthOpen']))
    expect(report.ok).toBe(true)
    expect(report.blink).toBe('morph')
    expect(report.jaw).toBe('morph')
    expect(validateNames(nodes, new Set()).blink).toBe('none')
    const noInner = new Set([...nodes].filter((n) => !CONTRACT.inner.test(n)))
    expect(validateNames(noInner, morphNames).missing).toContain('Inner_*')
  })
})

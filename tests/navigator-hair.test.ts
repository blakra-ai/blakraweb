import { describe, expect, it } from 'vitest'
import { capsuleDistance, createHair, HAIR_STEP, segmentQuaternion, stepHair, type HairState } from '../src/features/navigator/hair'

const CHAINS = 8
const PER = 5
const SEG = 0.04

/** Eight strands hanging from a ring just outside the 0.1 m head capsule, down its back and sides. */
function rest(): Float32Array {
  const r = new Float32Array(CHAINS * PER * 3)
  for (let c = 0; c < CHAINS; c++) {
    const a = (c / CHAINS) * Math.PI * 2
    const rx = Math.cos(a) * 0.105
    const rz = Math.sin(a) * 0.105
    for (let i = 0; i < PER; i++) {
      const o = (c * PER + i) * 3
      // Slightly outward as they go down, so the rest pose clears the head.
      const spread = 1 + i * 0.06
      r[o] = rx * spread
      r[o + 1] = 0.06 - i * SEG
      r[o + 2] = rz * spread
    }
  }
  return r
}

// Head: a capsule from the crown to the chin; shoulders: a wide capsule below.
const capsules = new Float32Array([0, 0.04, 0, 0, -0.04, 0, 0.1, -0.2, -0.26, 0, 0.2, -0.26, 0, 0.06])

const identity = () => {
  const m = new Float32Array(16)
  m[0] = m[5] = m[10] = m[15] = 1
  return m
}

/** A rotation about Y by `rad` plus a translation. */
function headMatrix(rad: number, tx = 0, ty = 1.6, tz = 0) {
  const m = identity()
  m[0] = Math.cos(rad)
  m[2] = -Math.sin(rad)
  m[8] = Math.sin(rad)
  m[10] = Math.cos(rad)
  m[12] = tx
  m[13] = ty
  m[14] = tz
  return m
}

function worstLength(h: HairState): number {
  let worst = 0
  for (let c = 0; c < CHAINS; c++) {
    for (let i = 0; i < PER - 1; i++) {
      const a = (c * PER + i) * 3
      const b = a + 3
      const d = Math.hypot(h.points[b] - h.points[a], h.points[b + 1] - h.points[a + 1], h.points[b + 2] - h.points[a + 2])
      worst = Math.max(worst, Math.abs(d - h.lengths[c * (PER - 1) + i]) / h.lengths[c * (PER - 1) + i])
    }
  }
  return worst
}

function minCapsuleDistance(h: HairState): number {
  let min = Infinity
  for (let c = 0; c < CHAINS; c++) {
    for (let i = 1; i < PER; i++) {
      const o = (c * PER + i) * 3
      for (let k = 0; k < 2; k++) min = Math.min(min, capsuleDistance(h, k, h.points[o], h.points[o + 1], h.points[o + 2]))
    }
  }
  return min
}

describe('hair', () => {
  it('8 × 5 for 1000 steps runs under 300 ms', () => {
    const h = createHair(rest(), CHAINS, PER, capsules)
    const t0 = performance.now()
    for (let i = 0; i < 1000; i++) stepHair(h, HAIR_STEP, headMatrix(Math.sin(i / 30) * 0.8), [0.3, -1 + Math.sin(i / 10), 0])
    const ms = performance.now() - t0
    console.log(`hair 8×5 × 1000 steps: ${ms.toFixed(1)} ms`)
    expect(ms).toBeLessThan(300)
    for (const v of h.points) expect(Number.isFinite(v)).toBe(true)
  })

  it('pins the roots to the head and keeps rest lengths within 1 %', () => {
    const h = createHair(rest(), CHAINS, PER, capsules)
    const r = rest()
    for (let i = 0; i < 300; i++) {
      const m = headMatrix(Math.sin(i / 40) * 1.2, 0.1 * Math.sin(i / 25))
      stepHair(h, HAIR_STEP, m, [0, -2, 0])
      for (let c = 0; c < CHAINS; c++) {
        const o = c * PER * 3
        const wx = m[0] * r[o] + m[8] * r[o + 2] + m[12]
        const wy = r[o + 1] + m[13]
        const wz = m[2] * r[o] + m[10] * r[o + 2] + m[14]
        expect(h.points[o]).toBeCloseTo(wx, 6)
        expect(h.points[o + 1]).toBeCloseTo(wy, 6)
        expect(h.points[o + 2]).toBeCloseTo(wz, 6)
      }
      expect(worstLength(h)).toBeLessThan(0.01)
    }
  })

  it('leaves no point inside a capsule after a step', () => {
    const h = createHair(rest(), CHAINS, PER, capsules)
    // A strong wind into the head, then a sharp turn: the strands are driven into both capsules.
    for (let i = 0; i < 400; i++) {
      const wind: [number, number, number] = i < 200 ? [-30, -9, 0] : [0, -40, 30]
      stepHair(h, HAIR_STEP, headMatrix(i < 200 ? 0 : 1.5), wind)
      expect(minCapsuleDistance(h)).toBeGreaterThanOrEqual(-1e-6)
    }
  })

  it('lags a head turn and swings back', () => {
    const h = createHair(rest(), CHAINS, PER, capsules)
    for (let i = 0; i < 120; i++) stepHair(h, HAIR_STEP, headMatrix(0), [0, 0, 0])
    const tipBefore = h.points.slice((PER - 1) * 3, PER * 3)
    stepHair(h, HAIR_STEP, headMatrix(1.0), [0, 0, 0])
    const tipAfter = h.points.slice((PER - 1) * 3, PER * 3)
    const rootAfter = h.points.slice(0, 3)
    // The root moved with the head; the tip barely did.
    expect(Math.hypot(rootAfter[0] - 0.105, rootAfter[2] - 0)).toBeGreaterThan(0.05)
    expect(Math.hypot(tipAfter[0] - tipBefore[0], tipAfter[2] - tipBefore[2])).toBeLessThan(0.03)
  })

  it('substeps at most three fixed steps a call and clamps the accumulator', () => {
    const h = createHair(rest(), CHAINS, PER, capsules)
    const a = createHair(rest(), CHAINS, PER, capsules)
    stepHair(h, 1.0, headMatrix(0), [0, 0, 0])
    for (let i = 0; i < 3; i++) stepHair(a, HAIR_STEP, headMatrix(0), [0, 0, 0])
    for (let i = 0; i < h.points.length; i++) expect(h.points[i]).toBeCloseTo(a.points[i], 6)
    expect(h.acc).toBeLessThan(HAIR_STEP)
  })

  it('segmentQuaternion rotates the rest direction onto the current one', () => {
    const h = createHair(rest(), CHAINS, PER, capsules)
    for (let i = 0; i < 60; i++) stepHair(h, HAIR_STEP, headMatrix(0.6), [5, 0, 0])
    const q = new Float32Array(4)
    for (let c = 0; c < CHAINS; c++) {
      for (let i = 0; i < PER - 1; i++) {
        segmentQuaternion(h, c, i, q)
        expect(Math.hypot(q[0], q[1], q[2], q[3])).toBeCloseTo(1, 5)
        const a = (c * PER + i) * 3
        const b = a + 3
        const m = h.head
        const rx = h.rest[b] - h.rest[a]
        const ry = h.rest[b + 1] - h.rest[a + 1]
        const rz = h.rest[b + 2] - h.rest[a + 2]
        const f = [m[0] * rx + m[4] * ry + m[8] * rz, m[1] * rx + m[5] * ry + m[9] * rz, m[2] * rx + m[6] * ry + m[10] * rz]
        const rot = rotate(q, f)
        const t = [h.points[b] - h.points[a], h.points[b + 1] - h.points[a + 1], h.points[b + 2] - h.points[a + 2]]
        const tl = Math.hypot(...t)
        const rl = Math.hypot(...rot)
        const dot = (rot[0] * t[0] + rot[1] * t[1] + rot[2] * t[2]) / (tl * rl)
        expect(dot).toBeGreaterThan(0.9999)
      }
    }
  })
})

function rotate(q: Float32Array, v: number[]): number[] {
  const [x, y, z, w] = q
  const ix = w * v[0] + y * v[2] - z * v[1]
  const iy = w * v[1] + z * v[0] - x * v[2]
  const iz = w * v[2] + x * v[1] - y * v[0]
  const iw = -x * v[0] - y * v[1] - z * v[2]
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]
}

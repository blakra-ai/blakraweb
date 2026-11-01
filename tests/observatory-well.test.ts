import { describe, expect, it } from 'vitest'
import { BEND_MS, bendAt, holeFor, wellInverse, wellWarp } from '../src/features/observatory/windows'

describe('the gravity well (the storyboard warp and its inverse)', () => {
  it('pulls points toward the centre, most at the centre, not at all far away', () => {
    expect(wellWarp(0, 320, 0.66)).toBe(0)
    expect(wellWarp(100, 320, 0.66)).toBeLessThan(100)
    expect(wellWarp(100, 320, 0.66)).toBeGreaterThan(100 * (1 - 0.66))
    expect(wellWarp(2000, 320, 0.66)).toBeCloseTo(2000, 6)
  })

  it('is monotonic for the storyboard pulls, so the inverse is single-valued', () => {
    for (const pull of [0.66, 0.7]) {
      let last = -1
      for (let r = 0; r <= 1500; r += 5) {
        const w = wellWarp(r, 340, pull)
        expect(w).toBeGreaterThan(last)
        last = w
      }
    }
  })

  it('inverts the warp within a tenth of a pixel across the frame', () => {
    for (const [sigma, pull] of [
      [320, 0.66],
      [430, 0.7],
      [160, 0.66],
    ]) {
      for (let r = 0; r <= 1400; r += 7) {
        const R = wellWarp(r, sigma, pull)
        expect(Math.abs(wellInverse(R, sigma, pull) - r)).toBeLessThan(0.1)
      }
    }
  })

  it('bends nothing at pull 0', () => {
    expect(wellWarp(300, 320, 0)).toBe(300)
    expect(wellInverse(300, 320, 0)).toBeCloseTo(300, 6)
  })
})

describe('the load device', () => {
  it('runs 0 → 1 over 900 ms, ease-out, and holds at 1', () => {
    expect(BEND_MS).toBe(900)
    expect(bendAt(0)).toBe(0)
    expect(bendAt(900)).toBe(1)
    expect(bendAt(5000)).toBe(1)
    // Ease-out: more than half the bend has happened by half time, and it never goes back.
    expect(bendAt(450)).toBeGreaterThan(0.6)
    let last = 0
    for (let ms = 0; ms <= 900; ms += 30) {
      const b = bendAt(ms)
      expect(b).toBeGreaterThanOrEqual(last)
      last = b
    }
  })
})

describe('the hole', () => {
  it('grows station by station and is clamped to 1 … 9', () => {
    let last = 0
    for (let s = 1; s <= 9; s++) {
      expect(holeFor(s)).toBeGreaterThan(last)
      last = holeFor(s)
    }
    expect(holeFor(0)).toBe(holeFor(1))
    expect(holeFor(12)).toBe(holeFor(9))
  })
})

import { describe, expect, it } from 'vitest'
import { handoverAt, holdAt, inOrbit, LAYERS_N, ORBIT_END, orbitsFor } from '../src/features/observatory/orbit'

describe('the orbits', () => {
  const o = orbitsFor(986, 380, 165)
  it('draws seven orbits, root smallest to crown widest, at the storyboard radii', () => {
    expect(o).toHaveLength(LAYERS_N)
    expect(o[0].rx).toBe(200)
    expect(o[6].rx).toBe(200 + 6 * 34)
    for (let k = 1; k < LAYERS_N; k++) expect(o[k].rx).toBeGreaterThan(o[k - 1].rx)
    expect(o[0].ry).toBeCloseTo(60)
  })
  it('rests each dot on its own orbit, nearest its label', () => {
    const a = (-14 * Math.PI) / 180
    for (const k of [0, 3, 6]) {
      const { rx, ry, dot, label } = o[k]
      // Back into the ellipse's own frame: on the ellipse, (x/rx)² + (y/ry)² = 1.
      const dx = dot.x - 986
      const dy = dot.y - 380
      const u = dx * Math.cos(a) + dy * Math.sin(a)
      const v = -dx * Math.sin(a) + dy * Math.cos(a)
      expect((u * u) / (rx * rx) + (v * v) / (ry * ry)).toBeCloseTo(1, 3)
      expect(Math.abs(dot.y - label.y)).toBeLessThan(60)
      expect(dot.x).toBeLessThan(label.x)
    }
  })
  it('lays the labels in a column right of the ring, 27 px apart', () => {
    expect(o[0].label.x).toBe(1151)
    expect(o[0].label.y).toBe(304)
    expect(o[1].label.y - o[0].label.y).toBe(27)
  })
  it('puts the phone labels at the left edge, dots on the orbits\' left side', () => {
    const m = orbitsFor(212, 500, 70, 'left')
    expect(m[0].label.x).toBe(12)
    expect(m[0].label.y).toBe(380)
    expect(m[1].label.y - m[0].label.y).toBe(21)
    for (const k of [0, 6]) expect(m[k].dot.x).toBeLessThan(212)
  })
  it('scales with the ring', () => {
    const half = orbitsFor(200, 300, 82.5)
    expect(half[0].rx).toBeCloseTo(100)
    expect(half[6].label.y - half[0].label.y).toBeCloseTo(6 * 13.5)
  })
})

describe('the hold', () => {
  it('brings the layers into orbit one by one across the first part, all seven by ORBIT_END', () => {
    expect(inOrbit(0)).toBe(0)
    expect(inOrbit(0.01)).toBe(1)
    let last = 0
    for (let h = 0; h <= 1; h += 0.01) {
      const n = inOrbit(h)
      expect(n).toBeGreaterThanOrEqual(last)
      last = n
    }
    expect(inOrbit(ORBIT_END)).toBe(7)
    expect(inOrbit(1)).toBe(7)
  })
  it('hands the ring over across the last tenth only', () => {
    expect(handoverAt(0.5)).toBe(0)
    expect(handoverAt(0.9)).toBe(0)
    expect(handoverAt(0.95)).toBeCloseTo(0.5)
    expect(handoverAt(1)).toBe(1)
  })
  it('measures the hold from the section against the viewport', () => {
    expect(holdAt(1000, 1000, 2700, 900)).toBe(0)
    expect(holdAt(1900, 1000, 2700, 900)).toBeCloseTo(0.5)
    expect(holdAt(2800, 1000, 2700, 900)).toBe(1)
    expect(holdAt(5000, 1000, 2700, 900)).toBe(1)
    expect(holdAt(0, 1000, 2700, 900)).toBe(0)
  })
})

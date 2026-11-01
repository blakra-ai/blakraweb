import { describe, expect, it } from 'vitest'
import { arcLength, figureEight, pointAt, sampleSmooth, smoothPath, stitch, type Point } from '../src/features/navigator/thread'

const near = (p: Point, q: Point, tol = 1) => Math.hypot(p.x - q.x, p.y - q.y) <= tol

describe('smoothPath', () => {
  it('is one M and one C per segment, with finite numbers', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 40 },
      { x: 220, y: 10 },
      { x: 300, y: 120 },
    ]
    const d = smoothPath(pts)
    expect(d.startsWith('M0 0')).toBe(true)
    expect(d.match(/C/g)?.length).toBe(3)
    expect(d.match(/M/g)?.length).toBe(1)
    expect(d.endsWith('300 120')).toBe(true)
    expect(d).not.toMatch(/NaN|Infinity/)
  })
  it('is empty below two points, and a tension of 0 is straight', () => {
    expect(smoothPath([])).toBe('')
    expect(smoothPath([{ x: 1, y: 1 }])).toBe('')
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 0 }], 0)).toBe('M0 0C0 0 10 0 10 0')
  })
  it('sampleSmooth follows the same curve: its samples start and end on the points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 80 },
      { x: 120, y: 20 },
    ]
    const s = sampleSmooth(pts, 8)
    expect(s.length).toBe(1 + 2 * 8)
    expect(s[0]).toEqual(pts[0])
    expect(near(s[8], pts[1], 1e-9)).toBe(true)
    expect(near(s[16], pts[2], 1e-9)).toBe(true)
  })
})

describe('figureEight', () => {
  const a = { x: 200, y: 300 }
  const b = { x: 420, y: 240 }
  const c = { x: 640, y: 320 }
  it('passes within 1px of a, b and c, in order, and closes', () => {
    const loop = figureEight(a, b, c)
    expect(loop.length).toBe(97)
    const ia = loop.findIndex((p) => near(p, a))
    const ib = loop.findIndex((p) => near(p, b))
    const ic = loop.findIndex((p) => near(p, c))
    expect(ia).toBe(0)
    expect(ib).toBeGreaterThan(ia)
    expect(ic).toBeGreaterThan(ib)
    expect(near(loop[loop.length - 1], a, 1e-9)).toBe(true)
  })
  it('crosses itself (a figure-eight, not a ring)', () => {
    const loop = figureEight(a, b, c, 128)
    // The spine from a to c is crossed by the return leg: the loop has points on both sides of it near the middle.
    const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }
    const sides = loop.filter((p) => Math.abs(p.x - mid.x) < 30).map((p) => Math.sign(p.y - mid.y))
    expect(sides).toContain(1)
    expect(sides).toContain(-1)
  })
  it('is finite for collinear and vertical inputs', () => {
    const loop = figureEight({ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 200 })
    expect(loop.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
    expect(arcLength(loop)).toBeGreaterThan(400)
  })
})

describe('arcLength and pointAt', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 30, y: 40 },
    { x: 30, y: 140 },
  ]
  it('measures the polyline', () => {
    expect(arcLength(pts)).toBe(150)
    expect(arcLength([])).toBe(0)
    expect(arcLength([pts[0]])).toBe(0)
  })
  it('pointAt(0) is the first point, pointAt(1) the last, and t is monotone along the arc', () => {
    expect(pointAt(pts, 0)).toEqual(pts[0])
    expect(pointAt(pts, 1)).toEqual(pts[2])
    expect(pointAt(pts, -3)).toEqual(pts[0])
    expect(pointAt(pts, 7)).toEqual(pts[2])
    expect(pointAt(pts, 1 / 3)).toEqual({ x: 30, y: 40 })
    expect(pointAt(pts, 2 / 3)).toEqual({ x: 30, y: 90 })
    let last = 0
    for (let t = 0; t <= 1; t += 0.01) {
      const p = pointAt(pts, t)
      const along = arcLength([pts[0], ...(p.x === 30 && p.y >= 40 ? [pts[1]] : []), p])
      expect(along).toBeGreaterThanOrEqual(last - 1e-9)
      last = along
    }
    expect(pointAt([], 0.5)).toEqual({ x: 0, y: 0 })
  })
})

describe('stitch', () => {
  const from = { x: 100, y: 200 }
  const patches = [
    { x: 300, y: 400 },
    { x: 500, y: 380 },
    { x: 700, y: 420 },
    { x: 900, y: 390 },
    { x: 1100, y: 410 },
  ]
  it('settles the patches in order as t grows, and the pen sits on each as it settles', () => {
    const s0 = stitch(from, patches, 0)
    expect(s0.settled).toEqual([false, false, false, false, false])
    expect(s0.drawn).toBe(0)
    expect(s0.pen).toEqual(from)
    expect(s0.d.match(/C/g)?.length).toBe(5)
    let count = 0
    for (let t = 0; t <= 1; t += 0.005) {
      const s = stitch(from, patches, t)
      const n = s.settled.filter(Boolean).length
      expect(n).toBeGreaterThanOrEqual(count)
      // In order: the first n are the settled ones.
      expect(s.settled.slice(0, n).every(Boolean)).toBe(true)
      expect(s.settled.slice(n).some(Boolean)).toBe(false)
      if (n > count) expect(near(s.pen, patches[n - 1], 10)).toBe(true)
      count = n
    }
    const s1 = stitch(from, patches, 1)
    expect(s1.settled).toEqual([true, true, true, true, true])
    expect(s1.drawn).toBeCloseTo(s1.length, 6)
    expect(near(s1.pen, patches[4], 1e-6)).toBe(true)
  })
  it('is a pure function of t: scrubbing back un-settles', () => {
    const late = stitch(from, patches, 0.9)
    const early = stitch(from, patches, 0.3)
    expect(late.settled.filter(Boolean).length).toBeGreaterThan(early.settled.filter(Boolean).length)
    expect(stitch(from, patches, 0.3)).toEqual(early)
  })
  it('draws nothing without patches', () => {
    const s = stitch(from, [], 0.5)
    expect(s.d).toBe('')
    expect(s.settled).toEqual([])
    expect(s.pen).toEqual(from)
  })
})

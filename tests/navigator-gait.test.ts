import { describe, expect, it } from 'vitest'
import { createGait, createIdle, footAt, G, GAIT, LEGS, solveLeg, spring2, stepGait, stepIdle, strideFreq, strideLength, swingFold, walkSpeed, type Leg, type LegRest } from '../src/features/navigator/gait'

// A roe deer: hip height 0.55 m; three segments that stand the hoof under the hip with the joints bent.
const h = 0.55
const leg = (x: number, bend: 1 | -1): LegRest => ({ hip: { x, y: h }, upper: 0.24, lower: 0.2, hoof: 0.18, bend, stand: { x: 0, y: -h } })
const rest: Record<Leg, LegRest> = { LF: leg(0.3, 1), RF: leg(0.3, 1), LH: leg(-0.3, -1), RH: leg(-0.3, -1) }
const DEG = Math.PI / 180

/** Walk at speed v (m/s) for `secs`, calling `each` after every 60 Hz frame. */
function walk(secs: number, v: number, each?: (g: ReturnType<typeof createGait>) => void, g = createGait(rest, h)) {
  const dt = 1 / 60
  for (let i = 0; i < secs * 60; i++) {
    stepGait(g, rest, h, { travel: v * dt, moving: true, dt })
    each?.(g)
  }
  return g
}

describe('the walk: proportions', () => {
  it('stride λ = 1.30 h at Froude 0.15, v = √(0.15 g h), stride frequency in 1.0–1.4 Hz', () => {
    expect(strideLength(h) / h).toBeCloseTo(1.3, 2)
    expect(walkSpeed(h)).toBeCloseTo(Math.sqrt(0.15 * G * h), 6)
    const f = strideFreq(walkSpeed(h), strideLength(h))
    expect(f).toBeGreaterThanOrEqual(1.0)
    expect(f).toBeLessThanOrEqual(1.4)
  })

  it('is a lateral-sequence walk: LH 0, LF 0.25, RH 0.5, RF 0.75 touch down, duty factor 0.65', () => {
    const lambda = strideLength(h)
    const touch: Record<Leg, number> = { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 }
    for (const l of LEGS) {
      expect(footAt(l, touch[l] + 0.001, lambda, h).stance).toBe(1)
      expect(footAt(l, touch[l] - 0.001, lambda, h).stance).toBe(0)
      let on = 0
      for (let i = 0; i < 1000; i++) on += footAt(l, i / 1000, lambda, h).stance
      expect(on / 1000).toBeCloseTo(0.65, 2)
    }
  })

  it('lifts the swing hoof 0.10–0.12 h', () => {
    const lambda = strideLength(h)
    let top = 0
    for (let i = 0; i < 1000; i++) top = Math.max(top, footAt('LF', i / 1000, lambda, h).dy)
    expect(top / h).toBeGreaterThanOrEqual(0.1)
    expect(top / h).toBeLessThanOrEqual(0.12)
  })
})

describe('the walk: feet', () => {
  it('locks a stance hoof to the ground: slide under 0.5 % h per frame', () => {
    const g = walk(1, walkSpeed(h)) // past the start ramp
    const prev: Record<string, { x: number; y: number; on: number }> = {}
    let worst = 0
    walk(3, walkSpeed(h), (s) => {
      for (const l of LEGS) {
        const x = s.s + s.legs[l].foot.x
        const y = s.legs[l].foot.y
        const p = prev[l]
        if (p && p.on && s.legs[l].stance) worst = Math.max(worst, Math.hypot(x - p.x, y - p.y))
        prev[l] = { x, y, on: s.legs[l].stance }
      }
    }, g)
    expect(worst / h).toBeLessThan(0.005)
  })

  it('solves the leg by two-bone IK with the hoof parallel to the upper segment', () => {
    const r = rest.LH
    for (const [dx, dy] of [[0, -0.5], [0.15, -0.5], [-0.2, -0.48], [0.05, -0.42]]) {
      const ik = solveLeg(r, dx, dy)
      const u = ik.upper * DEG
      const l = u + ik.lower * DEG
      const k = l + ik.hoof * DEG
      expect(k).toBeCloseTo(u, 6)
      const fx = r.upper * Math.sin(u) + r.lower * Math.sin(l) + r.hoof * Math.sin(k)
      const fy = -(r.upper * Math.cos(u) + r.lower * Math.cos(l) + r.hoof * Math.cos(k))
      expect(fx).toBeCloseTo(dx, 4)
      expect(fy).toBeCloseTo(dy, 4)
    }
  })

  it('folds the fore carpus backward in swing up to 80–90°, never in stance', () => {
    for (let i = 0; i < 1000; i++) if (footAt('LF', i / 1000, strideLength(h), h).stance) expect(swingFold('LF', i / 1000)).toBe(0)
    let top = 0
    walk(3, walkSpeed(h), (g) => (top = Math.max(top, Math.abs(g.legs.LF.hoof))))
    expect(top).toBeGreaterThanOrEqual(80)
    expect(top).toBeLessThanOrEqual(90)
  })

  it('starts over half a stride and stops with all four hooves planted, the stance feet unmoved', () => {
    const lambda = strideLength(h)
    const g = createGait(rest, h)
    const dt = 1 / 60
    let s = 0
    while (g.active < 1) {
      stepGait(g, rest, h, { travel: walkSpeed(h) * dt, moving: true, dt })
      s += walkSpeed(h) * dt
    }
    expect(s / lambda).toBeCloseTo(GAIT.accelStrides, 1)
    walk(0.37, walkSpeed(h), undefined, g)
    const before = LEGS.filter((l) => g.legs[l].stance).map((l) => ({ l, x: g.legs[l].foot.x, y: g.legs[l].foot.y }))
    for (let i = 0; i < 30; i++) stepGait(g, rest, h, { travel: 0, moving: false, dt })
    for (const l of LEGS) {
      expect(g.legs[l].stance).toBe(1)
      expect(g.legs[l].foot.y).toBeCloseTo(0, 6)
    }
    for (const b of before) expect(g.legs[b.l].foot.x).toBeCloseTo(b.x, 6)
  })
})

describe('the walk: body and head', () => {
  it('bobs 1.5 % h twice per stride, rolls ±2°, pitches ±1.5°, sways ±1 % h; the head counters the neck', () => {
    const g = walk(1, walkSpeed(h))
    let bob = [Infinity, -Infinity], roll = 0, pitch = 0, sway = 0, crossings = 0, last = 0
    const ph0 = g.phase
    walk(1 / strideFreq(walkSpeed(h), strideLength(h)), walkSpeed(h), (s) => {
      bob = [Math.min(bob[0], s.body.bob), Math.max(bob[1], s.body.bob)]
      roll = Math.max(roll, Math.abs(s.body.roll))
      pitch = Math.max(pitch, Math.abs(s.body.pitch))
      sway = Math.max(sway, Math.abs(s.body.sway))
      if (last < 0 && s.body.bob >= 0) crossings++
      last = s.body.bob
      expect(s.head).toBeCloseTo(-s.neck, 9)
      expect(Math.abs(s.neck)).toBeLessThanOrEqual(GAIT.neckPitch + 1e-9)
    }, g)
    void ph0
    expect(bob[1] / h).toBeCloseTo(0.015, 3)
    expect(crossings).toBe(2)
    expect(roll).toBeCloseTo(2, 1)
    expect(pitch).toBeCloseTo(1.5, 1)
    expect(sway / h).toBeCloseTo(0.01, 3)
  })
})

describe('idle life and the springs', () => {
  it('breathes at 0.25 Hz, shifts weight every 4–7 s, flicks an ear for 0.2 s every 3–6 s', () => {
    const st = createIdle(3)
    const out = { chest: 1, roll: 0, sway: 0, flickL: 0, flickR: 0 }
    const shifts: number[] = []
    const flicks: number[] = []
    let flicking = false
    let lastShift = st.nextShift
    for (let i = 0; i < 60 * 60; i++) {
      const t = i / 60
      stepIdle(st, t, h, out)
      if (st.nextShift !== lastShift) {
        shifts.push(st.nextShift - t)
        lastShift = st.nextShift
      }
      const f = out.flickL + out.flickR > 0
      if (f && !flicking) flicks.push(t)
      flicking = f
    }
    stepIdle(st, 0, h, out)
    const c0 = out.chest
    stepIdle(st, 4, h, out)
    expect(out.chest).toBeCloseTo(c0, 6)
    for (const d of shifts) expect(d >= 4 && d <= 7).toBe(true)
    for (let i = 1; i < flicks.length; i++) expect(flicks[i] - flicks[i - 1]).toBeGreaterThanOrEqual(3 - 1 / 60)
    for (let i = 1; i < flicks.length; i++) expect(flicks[i] - flicks[i - 1]).toBeLessThanOrEqual(6 + 1 / 60)
    expect(GAIT.idle.flickS).toBe(0.2)
  })

  it('springs the plates at 2.5 Hz with damping 0.5 (settles, overshoots once)', () => {
    let x = 0, v = 0, peak = 0
    for (let i = 0; i < 600; i++) {
      ;[x, v] = spring2(x, v, 1, 1 / 600)
      peak = Math.max(peak, x)
    }
    expect(peak).toBeGreaterThan(1.1)
    expect(peak).toBeLessThan(1.25)
    for (let i = 0; i < 1200; i++) [x, v] = spring2(x, v, 1, 1 / 600)
    expect(x).toBeCloseTo(1, 3)
  })
})

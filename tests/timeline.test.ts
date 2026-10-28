import { describe, expect, it } from 'vitest'
import { acts, beats, bloomAt, bodyAt, cameraAt, factAt, productFocus, starAt, stationAt } from '../src/features/experience/timeline'

const within = (t: number, [a, b]: readonly [number, number]) => t >= a && t <= b

describe('the film: one continuous story', () => {
  it('beats run in order, edge to edge, from 0 to 1', () => {
    const list = Object.values(beats)
    expect(list[0][0]).toBe(0)
    expect(list[list.length - 1][1]).toBe(1)
    for (let i = 1; i < list.length; i++) expect(list[i][0]).toBeCloseTo(list[i - 1][1], 10)
  })

  it('acts run in order, from 0 to 1, each with a stretch of its own', () => {
    for (const a of acts) expect(a.out).toBeGreaterThan(a.in)
    for (let i = 1; i < acts.length; i++) expect(acts[i].in).toBeGreaterThanOrEqual(acts[i - 1].out)
    expect(acts[0].in).toBe(0)
    expect(acts[acts.length - 1].out).toBe(1)
  })

  it('every moment the page shows text for falls inside its own act', () => {
    const act = (beat: string) => {
      const a = acts.find((x) => x.beat === beat)!
      return [a.in, a.out] as const
    }
    for (let k = 0; k < 7; k++) expect(within(bloomAt(k), act('layers'))).toBe(true)
    for (let k = 0; k < 5; k++) expect(within(starAt(k), act('proof'))).toBe(true)
    for (let k = 0; k < 3; k++) expect(within(factAt(k), act('product'))).toBe(true)
    expect(within(productFocus, act('product'))).toBe(true)
    for (let k = 0; k < 5; k++) expect(within(stationAt(k), act('process'))).toBe(true)
    for (let k = 0; k < 3; k++) expect(within(bodyAt(k), act('people'))).toBe(true)
  })

  it('the camera never jumps: a small step in t is a small step on screen', () => {
    const a = { pos: [0, 0, 0] as [number, number, number], look: [0, 0, 0] as [number, number, number] }
    const b = { pos: [0, 0, 0] as [number, number, number], look: [0, 0, 0] as [number, number, number] }
    for (const portrait of [false, true]) {
      let worst = 0
      for (let i = 0; i < 2000; i++) {
        cameraAt(i / 2000, portrait, a)
        cameraAt((i + 1) / 2000, portrait, b)
        for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(a.pos[j] - b.pos[j]), Math.abs(a.look[j] - b.look[j]))
      }
      // A two-thousandth of the page moves the camera less than half a unit, even in the two long
      // moves (down the jet to look along the axis, and back out to the orbit); a cut would be far more.
      expect(worst).toBeLessThan(0.5)
    }
  })

  it('the camera moves on through its keys: it never stops while the story moves on, except where it holds', () => {
    // Speed just before and just after each key: no key brings a moving camera to a halt.
    const at = (t: number) => cameraAt(t, false, { pos: [0, 0, 0], look: [0, 0, 0] })
    const speed = (t: number) => {
      const a = at(t - 0.0005)
      const b = at(t + 0.0005)
      return Math.hypot(...a.pos.map((v, j) => b.pos[j] - v), ...a.look.map((v, j) => b.look[j] - v))
    }
    let stops = 0
    for (let t = 0.1; t < 0.9; t += 0.002) {
      const s = speed(t)
      if (s < 1e-4 && speed(t - 0.01) > 0.01 && speed(t + 0.01) > 0.01) stops++
    }
    expect(stops).toBe(0)
  })
})

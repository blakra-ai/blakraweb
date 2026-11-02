import { describe, expect, it } from 'vitest'
import { apertureBetween, circleHitsRect, contactExpansion, heroContraction, paperColumn, portholeBlocked, portholeLayout, stepFade } from '../src/features/observatory/porthole'
import { createPose, earBackFor, POSE, sectionLook, stepPose, type PoseInput } from '../src/features/observatory/guidePose'
import { createPerf } from '../src/features/navigator/living'

describe('porthole layout', () => {
  it('docks in the reserved right margin from 1200 px, at 62 % height, 190 … 230 px', () => {
    for (const w of [1200, 1440, 1920, 2560]) {
      const l = portholeLayout(w, 900)
      expect(l.mode).toBe('margin')
      expect(l.d).toBeGreaterThanOrEqual(190)
      expect(l.d).toBeLessThanOrEqual(230)
      expect(l.cy).toBeCloseTo(0.62 * 900)
      // Inside the gutter the paper reserves: the words (which end at w − gutter) never reach it.
      expect(l.cx - l.d / 2).toBeGreaterThanOrEqual(w - l.gutter)
      expect(l.cx + l.d / 2).toBeLessThanOrEqual(w)
    }
  })
  it('falls back to the bottom-right corner under 1200 px, never under 112 px', () => {
    for (const w of [768, 900, 1024, 1199]) {
      const l = portholeLayout(w, 800)
      expect(l.mode).toBe('corner')
      expect(l.gutter).toBe(0)
      expect(l.d).toBeGreaterThanOrEqual(112)
      expect(l.cx + l.d / 2).toBeLessThanOrEqual(w)
      expect(l.cy + l.d / 2).toBeLessThanOrEqual(800)
    }
  })
  it('is hidden on phones', () => {
    expect(portholeLayout(390, 844).mode).toBe('hidden')
    expect(portholeLayout(767, 1000).mode).toBe('hidden')
  })
})

describe('never over the words or a disc', () => {
  const l = portholeLayout(1440, 900)
  it('a word left of the gutter never blocks it', () => {
    const text = [{ x: 64, y: 0, w: 1440 - l.gutter - 64, h: 900 }]
    expect(portholeBlocked(l, text, [])).toBe(false)
  })
  it('a word or a disc in its rect makes it step aside', () => {
    expect(portholeBlocked(l, [{ x: l.cx - 10, y: l.cy - 5, w: 40, h: 10 }], [])).toBe(true)
    expect(portholeBlocked(l, [], [{ x: l.cx - l.d, y: l.cy, r: l.d / 2 }])).toBe(true)
    expect(portholeBlocked(portholeLayout(390, 800), [], [])).toBe(true)
  })
  it('circle–rect test', () => {
    expect(circleHitsRect(0, 0, 10, { x: 11, y: 0, w: 5, h: 5 })).toBe(false)
    expect(circleHitsRect(0, 0, 10, { x: 9, y: 0, w: 5, h: 5 })).toBe(true)
  })
  it('fades over 300 ms, opacity only; reduced motion snaps', () => {
    expect(stepFade(1, 0, 0.15)).toBeCloseTo(0.5)
    expect(stepFade(1, 0, 0.4)).toBe(0)
    expect(stepFade(0, 1, 0.01, true)).toBe(1)
  })
})

describe('contraction and expansion are continuous', () => {
  const l = portholeLayout(1440, 900)
  const hero = { x: 24, y: 0, w: 1392, h: 933 }
  it('the hero contracts over at least 600 px of scroll, without jumps', () => {
    expect(heroContraction(0, 933)).toBe(0)
    expect(heroContraction(599, 933)).toBeLessThan(1)
    let prev = apertureBetween({ ...hero, y: 0 }, l, 0, 16)
    for (let s = 1; s <= 900; s++) {
      const t = heroContraction(s, 933)
      const a = apertureBetween({ ...hero, y: -s }, l, t, 16)
      for (const k of ['x', 'y', 'w', 'h', 'r'] as const) expect(Math.abs(a[k] - prev[k])).toBeLessThan(8)
      prev = a
    }
    expect(prev.w).toBeCloseTo(l.d)
    expect(prev.r).toBeCloseTo(l.d / 2)
  })
  it('the opening onto the paper is clipped to the gutter column', () => {
    expect(paperColumn(l, 1440)).toBeGreaterThanOrEqual(1440 - l.gutter)
  })
  it('the contact opens only once its window is above the porthole', () => {
    expect(contactExpansion(900, l, 600)).toBe(0)
    expect(contactExpansion(l.cy - l.d / 2 - 8 - 300, l, 600)).toBeCloseTo(0.5)
    expect(contactExpansion(-2000, l, 600)).toBe(1)
  })
})

describe('her life', () => {
  const input = (o: Partial<PoseInput> = {}): PoseInput => ({ mode: 'porthole', station: 5, depth: 0.5, clock: 0, dt: 1 / 60, still: false, pointer: { x: 0, y: 0, on: false }, eyes: { x: 1300, y: 500 }, viewport: { w: 1440, h: 900 }, focus: null, read: null, nodAt: -10, sentAt: 0, tint: [1, 1, 1], tintMix: 0, ...o })
  it('reduced motion: a static pose per section, no blinks, flicks or breath', () => {
    const s = createPose(1, 0)
    const out = createPerf()
    for (let i = 0; i < 600; i++) {
      stepPose(s, input({ still: true, clock: i / 60 }), out)
      expect(out.lids).toBe(0)
      expect(out.ears.flickL).toBe(0)
      expect(out.breath).toBe(0)
      expect(s.yaw).toBe(sectionLook(5).yaw)
    }
    expect(out.ears.back).toBeCloseTo(earBackFor(0.5))
  })
  it('the head eases to the cursor within ±15° yaw / ±8° pitch without overshoot', () => {
    const s = createPose(1, 0)
    const out = createPerf()
    let max = 0
    for (let i = 0; i < 300; i++) {
      stepPose(s, input({ mode: 'hero', clock: i / 60, pointer: { x: 99999, y: -99999, on: true } }), out)
      max = Math.max(max, s.yaw)
    }
    expect(max).toBeLessThanOrEqual(POSE.yawMax + 1e-6)
    expect(s.yaw).toBeCloseTo(POSE.yawMax, 1)
    expect(out.head.pitch).toBeCloseTo(POSE.pitchMax, 1)
  })
  it('blinks every 4 … 6 s and flicks each ear on idle', () => {
    const s = createPose(3, 0)
    const out = createPerf()
    let blinks = 0
    let flicked = false
    let shut = false
    for (let i = 0; i < 60 * 30; i++) {
      stepPose(s, input({ clock: i / 60 }), out)
      if (out.lids > 0.5 && !shut) blinks++
      shut = out.lids > 0.5
      if (out.ears.flickL > 5) flicked = true
    }
    expect(blinks).toBeGreaterThanOrEqual(5)
    expect(blinks).toBeLessThanOrEqual(8)
    expect(flicked).toBe(true)
  })
  it('ears lie back further with depth (0 → 12°)', () => {
    expect(earBackFor(0)).toBe(0)
    expect(earBackFor(1)).toBe(12)
  })
})

describe('reading', () => {
  const base: PoseInput = { mode: 'porthole', station: 5, depth: 0.3, clock: 0, dt: 1 / 60, still: false, pointer: { x: 0, y: 0, on: false }, eyes: { x: 1300, y: 500 }, viewport: { w: 1440, h: 900 }, focus: null, read: null, nodAt: -10, sentAt: 0, tint: [1, 1, 1], tintMix: 0 }
  it('turns toward the line being read, and back toward the heading when none is', () => {
    const s = createPose(5, 0)
    const out = createPerf()
    for (let i = 0; i < 120; i++) stepPose(s, { ...base, clock: i / 60, read: { x: 1000, y: 420 } }, out)
    expect(s.yaw).toBeLessThan(-8)
    expect(out.head.pitch).toBeGreaterThan(2)
    const left = s.yaw
    for (let i = 120; i < 240; i++) stepPose(s, { ...base, clock: i / 60, read: { x: 1250, y: 420 } }, out)
    expect(s.yaw).toBeGreaterThan(left)
  })
  it('glances at the viewer for about a second every 6 … 10 s', () => {
    const s = createPose(5, 0)
    const out = createPerf()
    let near = 0
    for (let i = 0; i < 60 * 12; i++) {
      stepPose(s, { ...base, clock: i / 60 }, out)
      if (Math.abs(s.yaw) < 2) near++
    }
    expect(near).toBeGreaterThan(10)
    expect(near).toBeLessThan(60 * 3)
  })
})

describe('yaw sign', () => {
  it('a target on the left turns the rig head with a positive bone yaw (screen left on this model)', () => {
    const s = createPose(5, 0)
    const out = createPerf()
    for (let i = 0; i < 120; i++) stepPose(s, { mode: 'porthole', station: 5, depth: 0, clock: i / 60, dt: 1 / 60, still: false, pointer: { x: 0, y: 0, on: false }, eyes: { x: 1300, y: 500 }, viewport: { w: 1440, h: 900 }, focus: null, read: { x: 900, y: 500 }, nodAt: -10, sentAt: 0, tint: [1, 1, 1], tintMix: 0 }, out)
    expect(s.yaw).toBeLessThan(0)
    expect(out.head.yaw).toBeGreaterThan(0)
  })
})

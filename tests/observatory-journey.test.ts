import { describe, expect, it } from 'vitest'
import { createJourney, EYES_UP, FLOOR, journeyMoving, journeyOwner, journeyTarget, FOOT, textOverlap, PAPER_SHARE, PATH_X, QUIET_S, SCROLL_GROUND, stepJourney, type JourneyInput } from '../src/features/observatory/journey'

const viewport = { w: 1440, h: 900 }
const base = (): JourneyInput => ({
  station: 1,
  scrollY: 0,
  viewport,
  clock: 0,
  hero: { view: { x: 24, y: 88, w: 1392, h: 788 }, eyes: { x: 993, y: 331 }, figurePx: 1024 },
  stage: { view: { x: 24, y: 64, w: 1392, h: 788 }, ring: { x: 807, y: 370, r: 64 } },
  contact: { view: { x: 24, y: 300, w: 1392, h: 788 }, eyes: { x: 1262, y: 457 }, figurePx: 867 },
  anchors: { text: [], rows: [{ id: 'h22', rect: { x: 64, y: 4000, w: 700, h: 120 } }, { id: 'h23', rect: { x: 64, y: 4200, w: 700, h: 120 } }], nearest: 'h23', well: { x: 500, y: 6000, w: 160, h: 160 }, stage: null },
})

describe('the journey target, station by station', () => {
  it('stands at the hero framing at station 1 and at the contact framing at 9', () => {
    const t = journeyTarget(base())
    expect(t.mode).toBe('hero')
    expect(t).toMatchObject({ x: 24 + 993, y: 88 + 331, figurePx: 1024 })
    const c = journeyTarget({ ...base(), station: 9 })
    expect(c.mode).toBe('contact')
    expect(c).toMatchObject({ x: 24 + 1262, y: 300 + 457 })
  })

  it('walks the paper at one size, hooves on the baseline, in the right margin, per station', () => {
    for (const s of [2, 3, 4, 5, 6, 7, 8]) {
      const t = journeyTarget({ ...base(), station: s, scrollY: 1000 * s })
      expect(t.mode).toBe('paper')
      expect(t.figurePx).toBeCloseTo(PAPER_SHARE * 900)
      expect(t.y + EYES_UP * t.figurePx).toBeCloseTo((1 - FLOOR) * 900)
      expect(t.x).toBeGreaterThanOrEqual(0.7 * 1440)
      expect(t.x).toBeLessThanOrEqual(1440 - 0.5 * t.figurePx)
    }
    expect(journeyTarget({ ...base(), station: 6 }).x).toBeCloseTo(PATH_X[6] * 1440)
  })

  it('looks at the nearest case, the sealed well and the stage well', () => {
    const proof = journeyTarget({ ...base(), station: 5, scrollY: 3900 })
    expect(proof.look).toEqual({ x: 764, y: 4260 - 3900 })
    const well = journeyTarget({ ...base(), station: 7, scrollY: 5700 })
    expect(well.look).toEqual({ x: 580, y: 6080 - 5700 })
    expect(journeyTarget({ ...base(), station: 3 }).look).toEqual({ x: 24 + 807, y: 64 + 370 })
  })
})

describe('the spring and the gait', () => {
  it('snaps on the first frame, then settles on the target without a bounce', () => {
    const s = createJourney()
    const a = journeyTarget(base())
    stepJourney(s, a, 1 / 60, 0)
    expect(s.x).toBe(a.x)
    const b = journeyTarget({ ...base(), station: 6 })
    let maxX = -Infinity
    for (let i = 0; i < 900; i++) {
      stepJourney(s, b, 1 / 60, i / 60)
      maxX = Math.max(maxX, s.x)
    }
    expect(Math.abs(s.x - b.x)).toBeLessThan(1)
    expect(maxX - b.x).toBeLessThan(8)
    expect(journeyMoving(s, b)).toBe(false)
    expect(s.walking).toBe(false)
  })

  it('walks only while the scroll moves, the ground matched to it, facing the way it goes; stands in the windows', () => {
    const s = createJourney()
    const at = (scrollY: number) => journeyTarget({ ...base(), station: 6, scrollY })
    for (let i = 0; i < 600; i++) stepJourney(s, at(0), 1 / 60, i / 60)
    expect(s.walking).toBe(false)
    // Scrolling down at 600 px/s: she walks 0.3 px of ground per px, turning to face onward (−90) with a lean that fades.
    const g0 = s.ground
    let y = 0
    let lean = 0
    for (let i = 0; i < 120; i++) {
      y += 10
      stepJourney(s, at(y), 1 / 60, i / 60)
      expect(s.walking).toBe(true)
      lean = Math.max(lean, Math.abs(s.bank))
    }
    expect(s.facing).toBeLessThan(-80)
    expect(lean).toBeGreaterThan(1)
    expect(lean).toBeLessThanOrEqual(3)
    expect(s.ground - g0).toBeGreaterThan(0.7 * SCROLL_GROUND * 1200)
    expect(s.ground - g0).toBeLessThanOrEqual(SCROLL_GROUND * 1200 + 1e-6)
    // The scroll stops: within QUIET_S she stops walking and the ground holds.
    for (let i = 0; i < Math.ceil(QUIET_S * 60) + 2; i++) stepJourney(s, at(y), 1 / 60, 3 + i / 60)
    expect(s.walking).toBe(false)
    const g1 = s.ground
    stepJourney(s, at(y), 1 / 60, 4)
    expect(s.ground).toBe(g1)
    // Back up: she turns to face the other way.
    for (let i = 0; i < 120; i++) stepJourney(s, at((y -= 10)), 1 / 60, 5 + i / 60)
    expect(s.facing).toBeGreaterThan(80)
    // In the hero she stands facing the words; the still snaps her there.
    const hero = journeyTarget(base())
    for (let i = 0; i < 600; i++) stepJourney(s, hero, 1 / 60, i / 60)
    expect(s.walking).toBe(false)
    expect(Math.abs(s.facing)).toBeLessThan(1)
    stepJourney(s, hero, 1 / 60, 1, true)
    expect(s).toMatchObject({ x: hero.x, y: hero.y, vx: 0, facing: 0, headYaw: 0 })
  })

  it('is drawn by the window she is inside, else by the paper overlay', () => {
    const s = createJourney()
    stepJourney(s, journeyTarget(base()), 1 / 60, 0)
    const windows = [{ id: 'hero', view: { x: 24, y: 88, w: 1392, h: 788 } }]
    expect(journeyOwner(s, windows)).toBe('hero')
    s.y = 1200
    expect(journeyOwner(s, windows)).toBe('paper')
  })
})

describe('clear of the words', () => {
  it('steps aside from a text block in the bottom band, and never leaves the right half', () => {
    const t0 = journeyTarget({ ...base(), station: 6, scrollY: 1000 })
    const fp = t0.figurePx
    // A paragraph right where she would stand.
    const para = { x: t0.x - 100, y: 1000 + t0.y - 20, w: 200, h: 60 }
    const t = journeyTarget({ ...base(), station: 6, scrollY: 1000, anchors: { ...base().anchors, text: [para] } })
    expect(textOverlap(t.x, t.y, fp, 1000, [para])).toBe(0)
    expect(t.clear).toBe(true)
    expect(t.x - FOOT.half * fp).toBeGreaterThanOrEqual(-1e-9)
    expect(t.x + FOOT.half * fp).toBeLessThanOrEqual(1440 + 1e-9)
  })

  it('fades out where the whole line is words, and back in when it clears', () => {
    const band = { x: 0, y: 1000, w: 1440, h: 900 }
    const covered = journeyTarget({ ...base(), station: 6, scrollY: 1000, anchors: { ...base().anchors, text: [band] } })
    expect(covered.clear).toBe(false)
    const s = createJourney()
    stepJourney(s, journeyTarget({ ...base(), station: 6, scrollY: 1000 }), 1 / 60, 0)
    for (let i = 0; i < 90; i++) stepJourney(s, covered, 1 / 60, i / 60)
    expect(s.alpha).toBeLessThan(0.01)
    for (let i = 0; i < 90; i++) stepJourney(s, journeyTarget({ ...base(), station: 6, scrollY: 1000 }), 1 / 60, 2 + i / 60)
    expect(s.alpha).toBeGreaterThan(0.99)
  })
})

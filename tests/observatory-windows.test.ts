import { describe, expect, it } from 'vitest'
import { frameWindow, guideInView, HEAD_SHARE, onScreen, RING, ringScale, toGl, WORDS_COLUMN, type Rect } from '../src/features/observatory/windows'

const desktop: Rect = { x: 24, y: 88, w: 1392, h: 788 }
const phone: Rect = { x: 16, y: 80, w: 358, h: 232 }

describe('window framing', () => {
  it('puts the ring at col 9–10 with the storyboard radius at 1392 wide', () => {
    const f = frameWindow('hero', desktop)
    expect(f.ring.r).toBe(RING.hero)
    expect(f.ring.x).toBeCloseTo(986, 0)
    expect(f.ring.y).toBeCloseTo(322, 0)
    expect(frameWindow('stage', desktop).ring.r).toBe(165)
    expect(frameWindow('contact', desktop).ring.r).toBe(230)
  })

  it('scales the ring with the width, never below half', () => {
    expect(ringScale(1392)).toBe(1)
    expect(ringScale(2000)).toBe(1)
    expect(ringScale(696)).toBeCloseTo(0.5)
    expect(ringScale(200)).toBe(0.5)
    expect(frameWindow('hero', phone).ring.r).toBe(75)
  })

  it('gives the hero and contact windows a guide, the stage none', () => {
    expect(frameWindow('stage', desktop).guide).toBeNull()
    expect(frameWindow('hero', desktop).guide).not.toBeNull()
    expect(frameWindow('contact', desktop).guide).not.toBeNull()
  })

  it('places her head at 30 % of the window, right of the ring, chin near the bottom edge', () => {
    const f = frameWindow('hero', desktop)
    const g = f.guide!
    expect(g.headPx).toBeCloseTo(HEAD_SHARE * desktop.h)
    expect(frameWindow('hero', { x: 0, y: 0, w: 320, h: 568 }).guide!.headPx).toBe(160)
    expect(g.x - 0.4 * g.headPx).toBeGreaterThan(f.ring.x + f.ring.r)
    expect(g.y).toBeGreaterThan(f.ring.y)
    expect(g.y + 0.35 * g.headPx).toBeLessThanOrEqual(desktop.h + 1e-6)
    // Her head (half a head either side of the eyes) stays inside the frame.
    expect(g.x + 0.45 * g.headPx).toBeLessThanOrEqual(desktop.w)
  })

  it('never lets her cross the words column, whatever the rect', () => {
    for (const rect of [desktop, phone, { x: 0, y: 0, w: 320, h: 568 }, { x: 0, y: 0, w: 900, h: 1400 }, { x: 0, y: 0, w: 2400, h: 900 }]) {
      for (const kind of ['hero', 'contact'] as const) {
        const g = frameWindow(kind, rect).guide!
        expect(g.x - 0.5 * g.headPx).toBeGreaterThanOrEqual(WORDS_COLUMN * rect.w - 1e-6)
        expect(g.y - 0.5 * g.headPx).toBeGreaterThanOrEqual(-1e-6)
      }
    }
  })
})

describe('what is on screen', () => {
  const vp = { w: 1440, h: 900 }
  it('reports the window at the top of the page in full', () => {
    const s = onScreen(desktop, 0, vp)!
    expect(s.view).toEqual({ x: 24, y: 88, w: 1392, h: 788 })
    expect(s.clip).toEqual({ x: 24, y: 88, w: 1392, h: 788 })
  })
  it('clips a window half scrolled out, keeping its own viewport whole', () => {
    const s = onScreen(desktop, 500, vp)!
    expect(s.view.y).toBe(-412)
    expect(s.view.h).toBe(788)
    expect(s.clip).toEqual({ x: 24, y: 0, w: 1392, h: 376 })
  })
  it('clips a window entering from below', () => {
    const s = onScreen({ x: 24, y: 3000, w: 1392, h: 788 }, 2500, vp)!
    expect(s.clip).toEqual({ x: 24, y: 500, w: 1392, h: 400 })
  })
  it('returns null when the window is off-screen', () => {
    expect(onScreen(desktop, 2000, vp)).toBeNull()
    expect(onScreen({ x: 24, y: 3000, w: 1392, h: 788 }, 0, vp)).toBeNull()
  })
  it('converts a CSS rect to GL device pixels from the bottom-left, rounded outward', () => {
    expect(toGl({ x: 24, y: 88, w: 1392, h: 788 }, 900, 1)).toEqual({ x: 24, y: 24, w: 1392, h: 788 })
    const g = toGl({ x: 24, y: 0, w: 1392, h: 376 }, 900, 1.5)
    expect(g.x).toBe(36)
    expect(g.y).toBe(Math.floor((900 - 376) * 1.5))
    expect(g.w).toBe(2088)
    expect(g.y + g.h).toBe(1350)
  })
})

describe('the guide hint and her bounds', () => {
  it('takes the page\'s --guide-x/--guide-y place, still clamped off the words and inside the frame', () => {
    const fw = frameWindow
    const W = WORDS_COLUMN
    const g = fw('hero', desktop, { x: 0.9, y: 0.75 }).guide!
    expect(g.x).toBeCloseTo(0.9 * desktop.w)
    expect(g.y).toBeCloseTo(0.75 * desktop.h)
    const far = fw('hero', desktop, { x: 0.2, y: 2 }).guide!
    expect(far.x - 0.5 * far.headPx).toBeGreaterThanOrEqual(W * desktop.w - 1e-6)
    expect(far.y + 0.35 * far.headPx).toBeLessThanOrEqual(desktop.h + 1e-6)
  })
  it('renders her pass only when the visible part of the window touches her', () => {
    const view = { x: 24, y: 88, w: 1392, h: 788 }
    const guide = { x: 1240, y: 600, headPx: 236 }
    expect(guideInView(guide, view, view)).toBe(true)
    // Only the top 300 px of the window show: her head (from y ≈ 435) is below.
    expect(guideInView(guide, { x: 24, y: 88, w: 1392, h: 300 }, view)).toBe(false)
    expect(guideInView(guide, { x: 24, y: 88, w: 1392, h: 500 }, view)).toBe(true)
    // Only the left half shows.
    expect(guideInView(guide, { x: 24, y: 88, w: 600, h: 788 }, view)).toBe(false)
  })
})

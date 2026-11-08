import { describe, expect, it } from 'vitest'
import { FIGURE, frameWindow, guideInView, HEAD_SHARE, HEAD_SHARE_CONTACT, onScreen, PHONE_BAND, RING, ringScale, stickyViewY, toGl, WORDS_COLUMN, type Rect } from '../src/features/observatory/windows'
import { phoneRing } from '../src/boot'

const desktop: Rect = { x: 24, y: 88, w: 1392, h: 788 }
const phone: Rect = { x: 16, y: 80, w: 358, h: 232 }

describe('window framing', () => {
  it('puts the ring at 62 % across with the art-pass radius at 1392 wide', () => {
    const f = frameWindow('hero', desktop)
    expect(f.ring.r).toBe(RING.hero)
    expect(f.ring.x).toBeCloseTo(0.62 * 1392, 0)
    expect(f.ring.y).toBeCloseTo(322, 0)
    expect(frameWindow('stage', desktop).ring.r).toBe(165)
    expect(frameWindow('contact', desktop).ring.r).toBeCloseTo(Math.min(788 * 0.42, 1392 * 0.24))
  })

  it('scales the ring with the width, never below half', () => {
    expect(ringScale(1392)).toBe(1)
    expect(ringScale(2000)).toBe(1)
    expect(ringScale(696)).toBeCloseTo(0.5)
    expect(ringScale(200)).toBe(0.5)
    expect(frameWindow('hero', phone).ring.r).toBe(90)
  })

  it('gives every window a guide at the rim (she returns to the stage as in the hero)', () => {
    expect(frameWindow('stage', desktop).guide).not.toBeNull()
    expect(frameWindow('hero', desktop).guide).not.toBeNull()
    expect(frameWindow('contact', desktop).guide).not.toBeNull()
  })

  it('places her head at 24 % of the window at the ring’s lower-right edge, chin near the bottom edge, the key light from the ring', () => {
    const f = frameWindow('hero', desktop)
    const g = f.guide!
    expect(g.headPx).toBeCloseTo(HEAD_SHARE * desktop.h)
    // A short phone window keeps the same share; a tall full-bleed phone hero is framed on its band (below).
    expect(frameWindow('hero', { x: 0, y: 0, w: 568, h: 320 }).guide!.headPx).toBeCloseTo(HEAD_SHARE * 320)
    // Her head overlaps the ring's lower-right quadrant: the rim is behind her, on the words' side.
    expect(g.x).toBeGreaterThan(f.ring.x)
    expect(g.x - 0.5 * g.headPx).toBeLessThan(f.ring.x + f.ring.r)
    // The cinematic crop: 130 % of the height, her eyes at 42 % of it, in the ring's lower-right quadrant.
    expect(g.figurePx).toBeCloseTo(FIGURE.hero.share * desktop.h)
    expect(g.y).toBeCloseTo(FIGURE.hero.eyeY * desktop.h)
    expect(g.y).toBeGreaterThan(f.ring.y)
    expect(g.y).toBeLessThan(f.ring.y + f.ring.r)
    expect(g.key).toBe(-1)
    expect(g.y + 0.35 * g.headPx).toBeLessThanOrEqual(desktop.h + 1e-6)
    // Her head (half a head either side of the eyes) stays inside the frame.
    expect(g.x + 1.5 * g.headPx).toBeLessThanOrEqual(desktop.w)
  })

  it("gives the contact a fuller, smaller figure at the disk's right rim, her head above the closing line, lit from the rim", () => {
    const f = frameWindow('contact', desktop)
    const g = f.guide!
    expect(g.headPx).toBeCloseTo(HEAD_SHARE_CONTACT * desktop.h)
    expect(g.figurePx).toBeCloseTo(FIGURE.contact.share * desktop.h)
    expect(g.y).toBeCloseTo(FIGURE.contact.eyeY * desktop.h)
    expect(g.x).toBeGreaterThan(f.ring.x)
    expect(g.x).toBeLessThan(f.ring.x + f.ring.r)
    expect(g.x + 1.0 * g.headPx).toBeLessThanOrEqual(desktop.w + 1e-6)
    expect(g.y).toBeLessThan(f.ring.y + 0.5 * f.ring.r)
    expect(g.key).toBe(-1)
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

describe('the phone hero band', () => {
  it('draws the ring exactly where the phone still has it, her head right of it, above the words', () => {
    const rect = { x: 0, y: 56, w: 390, h: 788 }
    const f = frameWindow('hero', rect)
    const band = (390 * PHONE_BAND.h) / PHONE_BAND.w
    // The loader lands on the still's ring (boot.ts phoneRing); the world draws the same ring.
    const still = phoneRing({ x: 0, y: 0, w: 390, h: band })
    expect(f.ring.x).toBeCloseTo(still.x)
    expect(f.ring.y).toBeCloseTo(still.y)
    expect(f.ring.r).toBeCloseTo(still.r)
    const g = f.guide!
    expect(g.x).toBeGreaterThan(f.ring.x)
    expect(g.x + 1.5 * g.headPx).toBeLessThanOrEqual(rect.w + 1e-6)
    expect(g.y + g.headPx).toBeLessThan(band)
    expect(f.fade).toBe(0)
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
    const g = fw('hero', desktop, { x: 0.9, y: 0.5 }).guide!
    expect(g.x).toBeCloseTo(Math.min(0.9 * desktop.w, desktop.w - 1.5 * g.headPx))
    expect(g.y).toBeCloseTo(0.5 * desktop.h)
    // A phone band: head and neck only (190 % of the height), her eyes right of centre.
    const ph = fw('hero', phone).guide!
    expect(ph.figurePx).toBeCloseTo(FIGURE.phone.share * phone.h)
    expect(ph.x).toBeGreaterThanOrEqual(0.5 * phone.w)
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

describe('a sticky hold (the stage)', () => {
  // A hold 836 px tall resting at page 1000 inside a 2700 px section, sticking 64 px under the top.
  const st = { top: 64, naturalY: 1000, containerY: 1000, containerH: 2700, h: 836 }
  it('scrolls with the page until it sticks, then holds, then leaves with its section', () => {
    expect(stickyViewY(st, 0)).toBe(1000)
    expect(stickyViewY(st, 936)).toBe(64)
    expect(stickyViewY(st, 1500)).toBe(64)
    // The container's bottom (3700) minus the hold's height (836) minus the 64: it holds until 2800, then scrolls out.
    expect(stickyViewY(st, 2800)).toBe(64)
    expect(stickyViewY(st, 3000)).toBe(64 - 200)
  })
  it('keeps the window on screen through the hold', () => {
    const rect = { x: 24, y: 1000, w: 1392, h: 836 }
    const vp = { w: 1440, h: 900 }
    expect(onScreen(rect, 1500, vp, st)!.view.y).toBe(64)
    expect(onScreen(rect, 2000, vp, st)!.clip.h).toBe(836)
    expect(onScreen(rect, 1500, vp)).not.toBeNull()
    expect(onScreen(rect, 2500, vp)).toBeNull()
    expect(onScreen(rect, 2500, vp, st)).not.toBeNull()
  })
})

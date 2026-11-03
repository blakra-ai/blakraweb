import { describe, expect, it } from 'vitest'
import { AVATAR_H, AVATAR_W, BAND_STILL, dissolveRow, GLITCH_RATE, holoFrame, needsStackedVideo, restoreAlpha, seeded } from '../src/features/avatar/holo'

describe('hologram frame', () => {
  it('the band enters above the top and leaves below the bottom, once per 5.2 s', () => {
    const none = () => 0.99
    expect(holoFrame(0, 860, none, false).bandY).toBeCloseTo(-0.15 * 860)
    const max = Math.max(...Array.from({ length: 520 }, (_, i) => holoFrame(i / 100, 860, none, false).bandY))
    expect(max).toBeGreaterThan(860)
    expect(max).toBeLessThanOrEqual(1.15 * 860)
  })
  it('glitches at the stated rate, as a slice inside the picture shifted by under 8 px', () => {
    const rnd = seeded(3)
    let n = 0
    const N = 20000
    for (let i = 0; i < N; i++) {
      const f = holoFrame(i / 60, 860, rnd, false)
      if (!f.glitch) continue
      n++
      expect(f.glitch.y).toBeGreaterThanOrEqual(0)
      expect(f.glitch.y + f.glitch.h).toBeLessThanOrEqual(860)
      expect(Math.abs(f.glitch.dx)).toBeLessThanOrEqual(8)
    }
    expect(n / N).toBeGreaterThan(GLITCH_RATE * 0.8)
    expect(n / N).toBeLessThan(GLITCH_RATE * 1.2)
  })
  it('reduced motion: never a glitch, the band parked', () => {
    for (let t = 0; t < 30; t += 1.7) {
      const f = holoFrame(t, AVATAR_H, () => 0, true)
      expect(f.glitch).toBeNull()
      expect(f.bandY).toBeCloseTo(BAND_STILL * AVATAR_H)
    }
  })
})

describe('the dissolve', () => {
  it('leaves the upper body whole and takes more rows the lower it is', () => {
    expect(dissolveRow(0.3 * AVATAR_H, AVATAR_H, 0)).toBe(false)
    expect(dissolveRow(0.59 * AVATAR_H, AVATAR_H, 0)).toBe(false)
    const cut = (y: number) => Array.from({ length: 1000 }, (_, i) => dissolveRow(y * AVATAR_H, AVATAR_H, i / 1000)).filter(Boolean).length
    expect(cut(0.7)).toBeLessThan(cut(0.85))
    expect(cut(0.99)).toBeGreaterThan(600)
  })
})

describe('video choice', () => {
  it('WebKit (Safari, every iOS browser) gets the stacked H.264; Chromium and Firefox the WebM', () => {
    expect(needsStackedVideo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15')).toBe(true)
    expect(needsStackedVideo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1')).toBe(true)
    expect(needsStackedVideo('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')).toBe(false)
    expect(needsStackedVideo('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe(false)
  })
  it('the alpha is rebuilt from the grey half: premultiplied colour divided by it, nothing where it is clear', () => {
    const color = new Uint8ClampedArray([80, 40, 20, 255, 90, 90, 90, 255])
    const alpha = new Uint8ClampedArray([200, 200, 200, 255, 0, 0, 0, 255])
    restoreAlpha(color, alpha)
    expect(Array.from(color.slice(0, 4))).toEqual([102, 51, 26, 200])
    expect(Array.from(color.slice(4, 8))).toEqual([0, 0, 0, 0])
  })
  it('the picture size is the stacked video\'s half', () => {
    expect([AVATAR_W, AVATAR_H]).toEqual([480, 860])
  })
})

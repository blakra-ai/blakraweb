import { describe, expect, it } from 'vitest'
import { contrast, hex, mix } from '../src/lib/color'
import { blendSky, inks, skies, skyPeak, skyRGB, toneFor, type SkyId } from '../src/motion/sky/palettes'
import { dayOrder } from '../src/content/shared'

const ids = Object.keys(skies) as SkyId[]

describe('sky palettes meet WCAG 2.2 AA with their ink (AC6)', () => {
  for (const id of ids) {
    const sky = skyRGB(id)
    const ink = inks[skies[id].tone]
    const surfaces = { top: sky.top, bottom: sky.bottom, middle: mix(sky.top, sky.bottom, 0.5), peak: skyPeak(sky) }

    it(`${id}: declared tone matches the computed ink switch`, () => {
      expect(toneFor(sky)).toBe(skies[id].tone)
    })

    for (const [where, bg] of Object.entries(surfaces)) {
      it(`${id} ${where}: body text >= 4.5:1, signal >= 3:1`, () => {
        expect(contrast(hex(ink.ink), bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(hex(ink.ink2), bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(hex(ink.signal), bg)).toBeGreaterThanOrEqual(3)
      })
    }
  }
})

describe('blends inside hour interstitials keep large numerals >= 3:1 (AC6, O7)', () => {
  const pairs = dayOrder.slice(1).map((to, i) => [dayOrder[i], to] as const)
  for (const [from, to] of pairs) {
    for (const t of [0.25, 0.5, 0.75]) {
      it(`${from} -> ${to} at ${t * 100}%`, () => {
        const blend = blendSky(skyRGB(from), skyRGB(to), t)
        const ink = hex(inks[toneFor(blend)].ink)
        for (const bg of [blend.top, blend.bottom, mix(blend.top, blend.bottom, 0.5)]) {
          expect(contrast(ink, bg)).toBeGreaterThanOrEqual(3)
        }
      })
    }
  }
})

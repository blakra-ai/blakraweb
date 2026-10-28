import { describe, expect, it } from 'vitest'
import { contrast, hex, mix, type RGB } from '../src/lib/color'
import { inks } from '../src/motion/tone'

// The page's surfaces (src/styles/global.css): paper, its darker shade, and ink.
const paper = hex('#f2f0eb')
const paper2 = hex('#ebe8e1')
const ink = hex('#0b0b10')
// Text over the film sits on a sheet of paper at 90% (--sheet in global.css, and the phone panels).
// The film's darkest frame behind it is ink, so paper at 90% over ink is the worst case.
const sheet = mix(ink, paper, 0.9)

const light: Record<string, RGB> = { paper, paper2, sheet }

describe('text on paper meets WCAG 2.2 AA', () => {
  for (const [where, bg] of Object.entries(light)) {
    it(`${where}: body and secondary ink >= 4.5:1, signal >= 3:1`, () => {
      expect(contrast(hex(inks.light.ink), bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(hex('#0b0b10'), bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(hex(inks.light.ink2), bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(hex(inks.light.signal), bg)).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('text on ink meets WCAG 2.2 AA', () => {
  it('body, secondary and signal on ink', () => {
    expect(contrast(hex(inks.dark.ink), ink)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(hex(inks.dark.ink2), ink)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(hex(inks.dark.signal), ink)).toBeGreaterThanOrEqual(3)
  })
  it('the call to action: paper on ink', () => {
    expect(contrast(paper, ink)).toBeGreaterThanOrEqual(4.5)
  })
})

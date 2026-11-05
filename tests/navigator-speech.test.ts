import { describe, expect, it } from 'vitest'
import { CARD_MARGIN, jawOpen, nearestEdge, placeCard, type CardMode } from '../src/features/navigator/speech'

describe('jawOpen', () => {
  const line = "I'm the Navigator. Look into my eyes."
  it('is 0 at a full stop and once the line is complete', () => {
    const dot = line.indexOf('.') + 1
    expect(jawOpen(line, dot, 1.03, 0)).toBe(0)
    expect(jawOpen(line, line.length, 0.9, 0)).toBe(0)
    expect(jawOpen(line, line.length + 3, 0.9, 0)).toBe(0)
    expect(jawOpen('Why?', 4, 0.5, 0)).toBe(0)
    expect(jawOpen(line, 0, 0.5, 0)).toBe(0)
  })

  it('is > 0 on a vowel at any clock, and larger than on a consonant', () => {
    const a = line.indexOf('a') + 1 // the 'a' of Navigator
    for (let t = 0; t < 1; t += 0.037) expect(jawOpen(line, a, t, 0)).toBeGreaterThan(0)
    const v = line.indexOf('v') + 1
    expect(jawOpen(line, a, 0.125, 0)).toBeGreaterThan(jawOpen(line, v, 0.125, 0))
    expect(jawOpen(line, v, 0.125, 0)).toBeGreaterThan(0)
    // Accented vowels count (de/fr/es).
    expect(jawOpen('Für dich', 2, 0.125, 0)).toBeGreaterThan(jawOpen('Für dich', 1, 0.125, 0))
    expect(jawOpen('été', 1, 0.125, 0)).toBeCloseTo(jawOpen('eté', 1, 0.125, 0), 6)
  })

  it('is 0 on a space and beats at 4 Hz', () => {
    const space = line.indexOf(' ') + 1
    expect(jawOpen(line, space, 0.3, 0)).toBe(0)
    const a = line.indexOf('a') + 1
    const peak = jawOpen(line, a, 0.125, 0)
    expect(peak).toBeCloseTo(1, 6)
    expect(jawOpen(line, a, 0.375, 0)).toBeCloseTo(peak, 6)
    expect(jawOpen(line, a, 0.25, 0)).toBeLessThan(peak)
    expect(jawOpen(line, a, 0.25, 0)).toBeLessThanOrEqual(1)
  })
})

describe('placeCard', () => {
  const card = { w: 300, h: 110 }
  const widths = [320, 768, 1440, 2560]
  const modes: CardMode[] = ['hero', 'dock', 'phone']

  it('keeps the card inside the viewport with a 16 px margin at every width and mode', () => {
    for (const w of widths) {
      const h = Math.round(w * 0.6)
      const c = { w: Math.min(card.w, w - 2 * CARD_MARGIN), h: card.h }
      const mouths = [
        { x: 0.7 * w, y: 0.42 * h },
        { x: w - 4, y: 4 },
        { x: 2, y: h - 2 },
        { x: w / 2, y: 40 },
      ]
      for (const mode of modes) {
        for (const mouth of mouths) {
          const p = placeCard(mouth, { w, h }, c, mode)
          expect(p.x).toBeGreaterThanOrEqual(CARD_MARGIN)
          expect(p.y).toBeGreaterThanOrEqual(CARD_MARGIN)
          expect(p.x + c.w).toBeLessThanOrEqual(w - CARD_MARGIN)
          expect(p.y + c.h).toBeLessThanOrEqual(h - CARD_MARGIN)
        }
      }
    }
  })

  it('puts the hero card right of the face, centred on the mouth; the dock card under it; the phone card under the header', () => {
    const vp = { w: 1440, h: 900 }
    const mouth = { x: 0.5 * 1440, y: 0.42 * 900 }
    const hero = placeCard(mouth, vp, card, 'hero')
    expect(hero.x).toBeCloseTo(mouth.x + 0.18 * 1440, 6)
    expect(hero.y).toBeCloseTo(mouth.y - card.h / 2, 6)
    expect(hero.edge).toBe('left')
    const dock = placeCard({ x: 200, y: 60 }, vp, card, 'dock')
    expect(dock.y).toBeGreaterThan(60)
    expect(dock.x + card.w / 2).toBeCloseTo(200, 6)
    expect(dock.edge).toBe('top')
    const phone = placeCard({ x: 160, y: 200 }, { w: 320, h: 640 }, { w: 288, h: 110 }, 'phone')
    expect(phone.x).toBe(16)
    expect(phone.y).toBe(72)
  })

  it('aims the tail from the nearest edge midpoint at the mouth within 5°', () => {
    for (const w of widths) {
      const h = Math.round(w * 0.6)
      const c = { w: Math.min(card.w, w - 2 * CARD_MARGIN), h: card.h }
      for (const mode of modes) {
        for (const mouth of [
          { x: 0.7 * w, y: 0.42 * h },
          { x: 48, y: 48 },
          { x: w - 48, y: h - 48 },
        ]) {
          const p = placeCard(mouth, { w, h }, c, mode)
          const { mx, my } = nearestEdge({ x: p.x, y: p.y, w: c.w, h: c.h }, mouth)
          const want = (Math.atan2(mouth.y - my, mouth.x - mx) * 180) / Math.PI
          let diff = Math.abs(p.tail - want) % 360
          if (diff > 180) diff = 360 - diff
          expect(diff).toBeLessThan(5)
        }
      }
    }
  })
})

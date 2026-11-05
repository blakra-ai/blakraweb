/**
 * Speech, pure: the jaw's opening while a line is typed, and where the speech card sits so its
 * tail points at the mouth. Pixels are CSS px; angles degrees.
 */

const VOWELS = new Set('aeiouyàáâäãåæèéêëìíîïòóôöõøùúûüÿœAEIOUYÀÁÂÄÃÅÆÈÉÊËÌÍÎÏÒÓÔÖÕØÙÚÛÜŸŒ')
const LETTER = /\p{L}/u
const STOP = new Set('.!?')

export const JAW_HZ = 4
export const CARD_MARGIN = 16
export const CARD_REST = 2.2

/**
 * How far the lips part (0 … 1) for the text typed so far: a 4 Hz envelope since `from` (the
 * line's start) weighted 1 on a vowel, 0.35 on another letter, 0 on a space or punctuation; closed
 * at a full stop and once the line is complete.
 */
export function jawOpen(text: string, typed: number, clock: number, from: number): number {
  if (typed <= 0 || typed >= text.length) return 0
  const ch = text[typed - 1]
  if (STOP.has(ch)) return 0
  const weight = VOWELS.has(ch) ? 1 : LETTER.test(ch) ? 0.35 : 0
  if (weight === 0) return 0
  // The envelope never quite closes mid-word, so a vowel always parts the lips a little.
  const env = 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(2 * Math.PI * JAW_HZ * Math.max(0, clock - from)))
  return env * weight
}

export type CardMode = 'hero' | 'dock' | 'phone'
export type CardEdge = 'left' | 'right' | 'top' | 'bottom'

export interface CardPlace {
  x: number
  y: number
  /** Angle in degrees (atan2, y down) from the nearest edge's midpoint to the mouth. */
  tail: number
  /** The edge the tail leaves from. */
  edge: CardEdge
}

/**
 * Where the card goes: hero, right of the face; dock, under the mouth; phone, full width under the
 * header. Always inside the viewport with a 16 px margin.
 */
export function placeCard(mouth: { x: number; y: number }, viewport: { w: number; h: number }, card: { w: number; h: number }, mode: CardMode): CardPlace {
  let x: number
  let y: number
  if (mode === 'hero') {
    x = mouth.x + 0.18 * viewport.w
    y = mouth.y - card.h / 2
  } else if (mode === 'dock') {
    x = mouth.x - card.w / 2
    y = mouth.y + 14
  } else {
    x = CARD_MARGIN
    y = 72
  }
  const maxX = Math.max(CARD_MARGIN, viewport.w - CARD_MARGIN - card.w)
  const maxY = Math.max(CARD_MARGIN, viewport.h - CARD_MARGIN - card.h)
  x = Math.min(Math.max(x, CARD_MARGIN), maxX)
  y = Math.min(Math.max(y, CARD_MARGIN), maxY)
  const { edge, mx, my } = nearestEdge({ x, y, w: card.w, h: card.h }, mouth)
  const tail = (Math.atan2(mouth.y - my, mouth.x - mx) * 180) / Math.PI
  return { x, y, tail, edge }
}

/** The midpoint of the card edge nearest the point. */
export function nearestEdge(rect: { x: number; y: number; w: number; h: number }, to: { x: number; y: number }): { edge: CardEdge; mx: number; my: number } {
  const mids: { edge: CardEdge; mx: number; my: number }[] = [
    { edge: 'left', mx: rect.x, my: rect.y + rect.h / 2 },
    { edge: 'right', mx: rect.x + rect.w, my: rect.y + rect.h / 2 },
    { edge: 'top', mx: rect.x + rect.w / 2, my: rect.y },
    { edge: 'bottom', mx: rect.x + rect.w / 2, my: rect.y + rect.h },
  ]
  let best = mids[0]
  let bd = Infinity
  for (const m of mids) {
    const d = Math.hypot(to.x - m.mx, to.y - m.my)
    if (d < bd) {
      bd = d
      best = m
    }
  }
  return best
}

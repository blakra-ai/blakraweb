import { onReflow } from '../../motion/reflow'
import { acts } from './timeline'

/**
 * The one map from the page's scroll offset to the story's t, shared by the film's director and
 * by every held section that prints its text at the film's moments, so the two never disagree.
 *
 * A section that holds the screen (its sticky [data-pin] stuck) plays its act's in … out while
 * held, then out … the next act's in while the page moves on to the next section. A section
 * that does not hold (phones, short screens, reduced motion) plays in … the next act's in over
 * its whole length. The story moves on every stretch of scroll, and never jumps.
 *
 * Measured when first asked, and again after every reflow (resize, fonts, a section switching
 * between held and flowing).
 */
interface Piece {
  y0: number
  y1: number
  t0: number
  t1: number
}
let pieces: Piece[] = []
let tops: number[] = []
let dirty = true
if (typeof window !== 'undefined') onReflow(() => (dirty = true))

/** Forget the measurements (the next question measures again). */
export const invalidateStory = () => void (dirty = true)

function measure() {
  dirty = false
  const vh = window.innerHeight
  const scroll = window.scrollY
  const els = acts.map((a) => document.querySelector<HTMLElement>(`[data-beat="${a.beat}"]`))
  tops = els.map((el) => (el ? el.getBoundingClientRect().top + scroll : Number.NaN))
  const end = Math.max(1, document.documentElement.scrollHeight - vh)
  pieces = []
  acts.forEach((a, i) => {
    const el = els[i]
    if (!el) return
    const top = tops[i]
    const last = i === acts.length - 1
    const next = last || Number.isNaN(tops[i + 1]) ? end : tops[i + 1]
    const nextIn = last ? 1 : acts[i + 1].in
    const pin = el.querySelector<HTMLElement>('[data-pin]')
    const holds = Boolean(pin) && getComputedStyle(pin!).position === 'sticky' && el.offsetHeight > vh + 1
    if (holds) {
      const release = top + el.offsetHeight - vh
      pieces.push({ y0: top, y1: release, t0: a.in, t1: a.out })
      pieces.push({ y0: release, y1: Math.max(release, next), t0: a.out, t1: nextIn })
    } else pieces.push({ y0: top, y1: Math.max(top, next), t0: a.in, t1: nextIn })
  })
}

/** The story's t at a scroll offset. */
export function storyAt(y: number) {
  if (dirty) measure()
  if (!pieces.length) return 0
  if (y <= pieces[0].y0) return pieces[0].t0
  for (const p of pieces) if (y < p.y1) return p.t0 + ((p.t1 - p.t0) * (y - p.y0)) / Math.max(1, p.y1 - p.y0)
  return pieces[pieces.length - 1].t1
}

/** The scroll offset at which the story reaches t (for links into a held act), or null. */
export function scrollAt(t: number) {
  if (dirty) measure()
  for (const p of pieces) if (p.t1 > p.t0 && t >= p.t0 && t <= p.t1) return p.y0 + ((p.y1 - p.y0) * (t - p.t0)) / (p.t1 - p.t0)
  return null
}

/** A still frame rests on the final state of the act the reader is in. */
export function restAt(y: number) {
  if (dirty) measure()
  let i = 0
  while (i < acts.length - 1 && y + window.innerHeight * 0.5 >= tops[i + 1]) i++
  return acts[i].out - 0.002
}

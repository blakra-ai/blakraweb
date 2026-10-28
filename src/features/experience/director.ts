import { chapters, needs } from '../../content/shared'
import type { NeedId } from '../../content/types'
import { getPulse, onPulse, type PulseChoice } from '../../motion/pulse'
import { acts, actSpan, damp } from './timeline'
import { film, LAYERS } from './state'

/**
 * The director maps the page onto the film: each section (data-beat) plays its act, so the
 * story keeps its shape whatever the language or the length of the text. Positions are
 * measured once (and on resize or reflow); every frame is arithmetic on the scroll offset.
 */
export function createDirector() {
  let tops: number[] = []
  let heights: number[] = []
  let end = 1
  const measure = () => {
    const els = acts.map(({ beat }) => document.querySelector<HTMLElement>(`[data-beat="${beat}"]`))
    tops = els.map((el) => (el ? el.getBoundingClientRect().top + window.scrollY : 0))
    heights = els.map((el) => (el ? el.offsetHeight : 1))
    end = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  }
  measure()

  /** The story's t for a scroll offset. */
  const at = (y: number) => {
    let i = 0
    while (i < acts.length - 1 && y >= tops[i + 1]) i++
    const from = tops[i]
    const to = i < acts.length - 1 ? tops[i + 1] : end
    // An act plays over its own section; anything between it and the next act rests on its last frame.
    const span = i < acts.length - 1 ? actSpan(heights[i], window.innerHeight) : to - from
    const p = Math.min(1, Math.max(0, (y - from) / Math.max(1, span)))
    return acts[i].from + p * (acts[i].to - acts[i].from)
  }

  /** In a still frame the story rests at the end of the act on screen (its final state). */
  const restAt = (y: number) => {
    let i = 0
    while (i < acts.length - 1 && y + window.innerHeight * 0.5 >= tops[i + 1]) i++
    return acts[i].to - 0.002
  }

  // The visitor's choice in "What do you need built?" becomes the film's protagonist.
  const setNeed = (choice: PulseChoice) => {
    if (!choice) return void (film.need = null)
    const layers = choice === 'all' ? LAYERS : needs[choice].layers
    film.need = { layers, proof: proofFor(choice), at: film.clock }
  }
  setNeed(getPulse().choice)
  const offPulse = onPulse(setNeed)

  return {
    measure,
    /** Advance the clock for this frame; returns whether the picture's t changed. */
    update(dt: number) {
      const y = window.scrollY
      film.raw = film.still ? restAt(y) : at(y)
      const before = film.t
      // Lenis already smooths the scroll; this only removes the last jitter of a raw wheel.
      film.t = film.still ? film.raw : damp(film.t, film.raw, 10, dt)
      return Math.abs(film.t - before) > 1e-5
    },
    dispose: offPulse,
  }
}

/** The system a need names as its proof (the one the page links to), or none (-1). */
function proofFor(choice: NeedId | 'all') {
  const proof = choice === 'all' ? null : needs[choice].proof
  return proof ? chapters.findIndex((c) => c.id === proof) : -1
}

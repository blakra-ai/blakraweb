import { chapters, needs } from '../../content/shared'
import type { NeedId } from '../../content/types'
import { getPulse, onPulse, type PulseChoice } from '../../motion/pulse'
import { acts, damp } from './timeline'
import { film, LAYERS } from './state'

/**
 * The director maps the page onto the film: each section (data-beat) plays its act, so the
 * story keeps its shape whatever the language or the length of the text. Positions are
 * measured once (and on resize or reflow); every frame is arithmetic on the scroll offset.
 */
export function createDirector() {
  let tops: number[] = []
  let end = 1
  const measure = () => {
    tops = acts.map(({ beat }) => {
      const el = document.querySelector<HTMLElement>(`[data-beat="${beat}"]`)
      return el ? el.getBoundingClientRect().top + window.scrollY : 0
    })
    end = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  }
  measure()

  /** The story's t for a scroll offset. */
  const at = (y: number) => {
    let i = 0
    while (i < acts.length - 1 && y >= tops[i + 1]) i++
    const from = tops[i]
    const to = i < acts.length - 1 ? tops[i + 1] : end
    const p = Math.min(1, Math.max(0, (y - from) / Math.max(1, to - from)))
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

/** The case closest to a need: its named proof, or the one sharing most of its layers. */
function proofFor(choice: NeedId | 'all') {
  if (choice === 'all') return chapters.length - 1
  const n = needs[choice]
  if (n.proof) return chapters.findIndex((c) => c.id === n.proof)
  const score = (i: number) => chapters[i].layers.filter((l) => n.layers.includes(l)).length
  return chapters.reduce((best, _, i) => (score(i) > score(best) ? i : best), 0)
}

import { chapters, needs } from '../../content/shared'
import type { NeedId } from '../../content/types'
import { getPulse, onPulse, type PulseChoice } from '../../motion/pulse'
import { damp } from './timeline'
import { invalidateStory, restAt, storyAt } from './scrollMap'
import { film, LAYERS } from './state'

/**
 * The director plays the page as the film: each section (data-beat) plays its act through the
 * shared scroll map (scrollMap.ts), so the story keeps its shape whatever the language or the
 * length of the text. Every frame is arithmetic on the scroll offset.
 */
export function createDirector() {
  const measure = invalidateStory

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
      film.raw = film.still ? restAt(y) : storyAt(y)
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

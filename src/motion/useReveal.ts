import { useEffect, type RefObject } from 'react'
import { gsap } from './gsap'

/**
 * How far a section has come onto the screen, 0 (its top at the bottom edge) to 1 (its top a
 * third of the way up), written to its --p on the ticker. CSS turns it into wipes and strokes,
 * so what the reader sees is bound to the scroll and never fades on a timer.
 */
export function useReveal(ref: RefObject<HTMLElement | null>, upTo = 0.34) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let last = -1
    const tick = () => {
      const top = el.getBoundingClientRect().top
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh - top) / (vh * (1 - upTo))))
      if (Math.abs(p - last) < 0.0005) return
      last = p
      el.style.setProperty('--p', p.toFixed(4))
    }
    tick()
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [ref, upTo])
}

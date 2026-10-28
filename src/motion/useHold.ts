import { useEffect, type RefObject } from 'react'
import { gsap, ScrollTrigger } from './gsap'

/**
 * The reader's progress through a held (sticky) section, 0 … 1, written to its --p every frame
 * the page moves, on the same ticker as Lenis. CSS turns it into the section's choreography, so
 * text only ever moves with the scroll (transforms), never on a timer.
 */
export function useHold(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let top = 0
    let span = 1
    let last = -1
    const measure = () => {
      top = el.getBoundingClientRect().top + window.scrollY
      span = Math.max(1, el.offsetHeight - window.innerHeight)
      last = -1
    }
    const tick = () => {
      const p = Math.min(1, Math.max(0, (window.scrollY - top) / span))
      if (Math.abs(p - last) < 0.0005) return
      last = p
      el.style.setProperty('--p', p.toFixed(4))
    }
    measure()
    tick()
    gsap.ticker.add(tick)
    window.addEventListener('resize', measure)
    ScrollTrigger.addEventListener('refresh', measure)
    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', measure)
      ScrollTrigger.removeEventListener('refresh', measure)
    }
  }, [ref])
}

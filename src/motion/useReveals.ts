import type { RefObject } from 'react'
import { gsap } from './gsap'
import { useMotionSetup } from './useMotionSetup'

/**
 * Quiet entrance for [data-reveal] elements below the fold: a short rise and fade the
 * first time each one enters. Elements already on screen (or above it) are left alone.
 * One IntersectionObserver for all of them: no scroll triggers and no layout reads, so
 * setting up a page full of reveals costs almost nothing on a slow phone.
 */
export function useReveals(scope: RefObject<HTMLElement | null>) {
  useMotionSetup(scope, (root) => {
    const waiting = new Set<Element>()
    const seen = new Set<Element>()
    // Tweens made in observer callbacks run outside the motion context, so they are undone by hand.
    const touched = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target
          if (!seen.has(el)) {
            // The first report says where the element starts: only those below the fold wait.
            seen.add(el)
            if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
              io.unobserve(el)
              continue
            }
            gsap.set(el, { opacity: 0, y: 28 })
            touched.add(el)
            waiting.add(el)
            continue
          }
          if (entry.isIntersecting && waiting.has(el)) {
            waiting.delete(el)
            io.unobserve(el)
            gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' })
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]', root)) io.observe(el)
    // Motion off or unmount: stop observing and give every element back its final state.
    return () => {
      io.disconnect()
      for (const el of touched) {
        gsap.killTweensOf(el)
        gsap.set(el, { clearProps: 'opacity,transform' })
      }
    }
  })
}

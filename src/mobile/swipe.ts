import { useEffect, useRef } from 'react'

/** The phone breakpoint every rule in this folder sits under (global.css uses the same). */
export const PHONE = '(max-width: 767px)'

/**
 * A swipe row on phones (concept.md §4.6): the list itself is the scroller (CSS `.m-swipe`,
 * scroll-snap). On phones it becomes a focusable carousel region, so arrow keys scroll it; the card
 * most in view gets `data-active` (the lift) and the counter reads "2 / 6". Desktop: nothing.
 */
export function useSwipe<T extends HTMLElement>() {
  const list = useRef<T>(null)
  const count = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const el = list.current
    if (!el || !window.matchMedia(PHONE).matches) return
    el.tabIndex = 0
    const items = [...el.children] as HTMLElement[]
    const show = (i: number) => {
      items.forEach((it, k) => it.toggleAttribute('data-active', k === i))
      if (count.current) count.current.textContent = `${i + 1} / ${items.length}`
    }
    show(0)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) show(items.indexOf(e.target as HTMLElement))
      },
      { root: el, threshold: 0.6 },
    )
    items.forEach((it) => io.observe(it))
    return () => {
      io.disconnect()
      el.removeAttribute('tabindex')
    }
  }, [])
  return { list, count }
}

/** Loops (ripples, scan line, drift) pause while off screen: one observer for every `[data-loop]`. */
export function useLoopPause() {
  useEffect(() => {
    if (!window.matchMedia(PHONE).matches) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) (e.target as HTMLElement).toggleAttribute('data-paused', !e.isIntersecting)
    })
    document.querySelectorAll('[data-loop]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

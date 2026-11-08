import { useEffect, useRef } from 'react'

/** The phone breakpoint every rule in this folder sits under (global.css uses the same). */
export const PHONE = '(max-width: 767px)'

/** Autoplay: the next card every AUTO_MS; a touch on the row holds it for HOLD_MS. */
export const AUTO_MS = 5000
const HOLD_MS = 10000

/**
 * A swipe row on phones (concept.md §4.6): the list itself is the scroller (CSS `.m-swipe`,
 * scroll-snap). On phones it becomes a focusable carousel region, so arrow keys scroll it; the card
 * most in view gets `data-active` (the lift) and the counter reads "2 / 6". With <SwipeControls>,
 * previous / next buttons and autoplay (every 5 s, looping; paused off screen, in a hidden tab, while
 * touched, or by its own button). Desktop: nothing.
 */
export function useSwipe<T extends HTMLElement>() {
  const list = useRef<T>(null)
  const count = useRef<HTMLParagraphElement>(null)
  const controls = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = list.current
    if (!el || !window.matchMedia(PHONE).matches) return
    el.tabIndex = 0
    const items = [...el.children] as HTMLElement[]
    let current = 0
    const show = (i: number) => {
      current = i
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

    const go = (i: number) => {
      const n = items.length
      const k = ((i % n) + n) % n
      const pad = parseFloat(getComputedStyle(el).scrollPaddingInlineStart) || 0
      el.scrollTo({ left: items[k].offsetLeft - pad, behavior: 'smooth' })
      show(k)
    }

    const bar = controls.current
    let auto = items.length > 1
    let visible = false
    let heldUntil = 0
    const autoBtn = bar?.querySelector<HTMLButtonElement>('[data-auto]') ?? null
    const paint = () => {
      autoBtn?.setAttribute('aria-pressed', String(auto))
      bar?.toggleAttribute('data-auto-on', auto)
    }
    paint()
    const hold = () => {
      heldUntil = performance.now() + HOLD_MS
    }
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest('button')
      if (!b) return
      if (b.hasAttribute('data-auto')) {
        auto = !auto
        paint()
        return
      }
      hold()
      go(current + Number(b.dataset.dir || 1))
    }
    bar?.addEventListener('click', onClick)
    el.addEventListener('pointerdown', hold, { passive: true })
    el.addEventListener('touchstart', hold, { passive: true })
    const seen = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
    })
    seen.observe(el)
    const timer = window.setInterval(() => {
      if (!auto || !visible || document.hidden || performance.now() < heldUntil || items.length < 2) return
      go(current + 1)
    }, AUTO_MS)

    return () => {
      io.disconnect()
      seen.disconnect()
      clearInterval(timer)
      bar?.removeEventListener('click', onClick)
      el.removeEventListener('pointerdown', hold)
      el.removeEventListener('touchstart', hold)
      el.removeAttribute('tabindex')
    }
  }, [])
  return { list, count, controls }
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

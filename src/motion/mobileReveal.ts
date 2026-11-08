/*
 * Phones: the sections below the hero rise into place as they are reached. Each block (a heading, a
 * paragraph, a card, a swipe row, a figure) starts 28 px low and transparent and settles in over
 * 0.7 s, the blocks that arrive together staggered by 70 ms. Transform (`translate`, so it never
 * fights a module's own `transform`) and opacity only: no layout shift, nothing composited for longer
 * than the reveal. Plain IntersectionObserver, so it runs in every browser (Safari has no view timeline).
 *
 * A section is scanned only when it comes within a screen of the viewport: the sections that start
 * out of layout on phones (lazySections.ts, `content-visibility: auto`) are never forced into layout
 * early. Blocks already on screen when their section is scanned (a jump to an anchor) stay as they are.
 */

const BLOCKS = 'h2, h3, h4, p, li, figure, picture, blockquote, dl, form, details, table, .pill, .m-swipe > *, [data-reveal], svg[data-settle]'

/** How each kind of block arrives (global.css): headings rise further, cards and figures scale up as they lift. */
function variantOf(el: HTMLElement): string {
  if (/^H[23]$/.test(el.tagName)) return 'm-rv-h'
  if (el.parentElement?.classList.contains('m-swipe') || el.tagName === 'FIGURE' || el.tagName === 'PICTURE' || el.tagName === 'svg') return 'm-rv-card'
  return ''
}
const STAGGER_MS = 70
const MAX_STAGGER = 5

const sections = () => document.querySelectorAll<HTMLElement>('main > :not(:first-child), footer')

export function startMobileReveal(): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {}
  const timers = new Set<number>()
  const hidden = new Set<HTMLElement>()

  const settle = (el: HTMLElement) => {
    hidden.delete(el)
    el.classList.remove('m-rv', 'm-rv-in', 'm-rv-h', 'm-rv-card')
    el.style.removeProperty('--rv-delay')
  }

  const reveal = (arriving: HTMLElement[]) => {
    arriving.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
    arriving.forEach((el, i) => {
      blocks.unobserve(el)
      if (el.classList.contains('m-rv-in')) return
      const delay = Math.min(i, MAX_STAGGER) * STAGGER_MS
      el.style.setProperty('--rv-delay', `${delay}ms`)
      el.classList.add('m-rv-in')
      // Back to the block's own styles once it has landed (its transitions, its opacity).
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        settle(el)
      }, delay + 860)
      timers.add(timer)
    })
  }

  const blocks = new IntersectionObserver(
    (entries) => reveal(entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement)),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )

  // A fling can carry a block across the screen between two observer checks: it never reported
  // entering, so a light sweep (at most every 200 ms while scrolling) shows whatever is already passed.
  let sweepAt = 0
  let sweepTimer = 0
  const sweep = () => {
    sweepTimer = 0
    sweepAt = performance.now()
    const vh = window.innerHeight
    const due: HTMLElement[] = []
    for (const el of hidden) if (!el.classList.contains('m-rv-in') && el.getBoundingClientRect().top < vh * 0.92) due.push(el)
    if (due.length) reveal(due)
  }
  const onScroll = () => {
    if (!sweepTimer) sweepTimer = window.setTimeout(sweep, Math.max(0, 200 - (performance.now() - sweepAt)))
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  const scan = (section: HTMLElement) => {
    const vh = window.innerHeight
    let last: HTMLElement | null = null
    for (const el of section.querySelectorAll<HTMLElement>(BLOCKS)) {
      // One reveal per block: nothing inside a block that already rises.
      if (last && last.contains(el)) continue
      if (el.closest('[data-hold]')) continue
      const r = el.getBoundingClientRect()
      if (!r.width && !r.height) continue
      last = el
      if (r.top < vh) continue
      el.classList.add('m-rv')
      const v = variantOf(el)
      if (v) el.classList.add(v)
      hidden.add(el)
      blocks.observe(el)
    }
  }

  const near = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        near.unobserve(e.target)
        scan(e.target as HTMLElement)
      }
    },
    { rootMargin: '0px 0px 100% 0px' },
  )
  sections().forEach((el) => near.observe(el))

  const offParallax = startParallax()

  return () => {
    offParallax()
    window.removeEventListener('scroll', onScroll)
    clearTimeout(sweepTimer)
    near.disconnect()
    blocks.disconnect()
    timers.forEach((t) => clearTimeout(t))
    ;[...hidden].forEach(settle)
  }
}

/*
 * Scroll-linked depth on phones, run by the browser's compositor (CSS scroll-driven animations,
 * global.css: .m-px, .m-px-img, .m-hero-out), never by script on scroll: script on a phone's native
 * scroll lags the finger and jumps. Browsers without scroll timelines simply keep everything still.
 */
function startParallax(): () => void {
  const words = document.querySelector<HTMLElement>('#top [data-window="hero"] h1')?.parentElement ?? null
  const heads = [...document.querySelectorAll<HTMLElement>('main > :not(:first-child) h2')]
  const imgs = [...document.querySelectorAll<HTMLElement>('main figure img')]
  words?.classList.add('m-hero-out')
  heads.forEach((el) => el.classList.add('m-px'))
  imgs.forEach((el) => el.classList.add('m-px-img'))
  return () => {
    words?.classList.remove('m-hero-out')
    heads.forEach((el) => el.classList.remove('m-px'))
    imgs.forEach((el) => el.classList.remove('m-px-img'))
  }
}

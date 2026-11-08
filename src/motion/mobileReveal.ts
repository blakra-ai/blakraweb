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
 * Scroll-linked depth on phones, one rAF per scroll, writes only (`translate`, `scale`, `opacity` on a
 * handful of elements; the reads are cached and refreshed on resize):
 * - the hero's words drift up slower than the page and fade as they leave, over the live world;
 * - each section heading (h2) moves a little against the scroll while it crosses the screen;
 * - images inside figures shift inside their frames (scaled 6 % so no edge ever shows).
 */
function startParallax(): () => void {
  const words = document.querySelector<HTMLElement>('#top [data-window="hero"] h1')?.parentElement ?? null
  const heads = [...document.querySelectorAll<HTMLElement>('main > :not(:first-child) h2')]
  const imgs = [...document.querySelectorAll<HTMLElement>('main figure img')]
  let frame = 0
  const update = () => {
    frame = 0
    const vh = window.innerHeight
    const y = window.scrollY
    if (words) {
      const k = Math.min(1, y / (0.8 * vh))
      words.style.translate = `0 ${(0.22 * Math.min(y, vh)).toFixed(1)}px`
      words.style.opacity = (1 - 0.85 * k).toFixed(3)
    }
    for (const el of heads) {
      const r = el.getBoundingClientRect()
      if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) continue
      const d = (r.top + r.height / 2 - vh / 2) / vh
      el.style.setProperty('--px', `${(d * 22).toFixed(1)}px`)
    }
    for (const el of imgs) {
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > vh) continue
      const d = (r.top + r.height / 2 - vh / 2) / vh
      el.style.scale = '1.06'
      el.style.translate = `0 ${(d * -14).toFixed(1)}px`
    }
  }
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }
  heads.forEach((el) => el.classList.add('m-px'))
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  update()
  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    cancelAnimationFrame(frame)
    if (words) {
      words.style.removeProperty('translate')
      words.style.removeProperty('opacity')
    }
    heads.forEach((el) => {
      el.classList.remove('m-px')
      el.style.removeProperty('--px')
    })
    imgs.forEach((el) => {
      el.style.removeProperty('scale')
      el.style.removeProperty('translate')
    })
  }
}

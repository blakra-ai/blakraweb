import { holdWorld, isWorldReady, onWorldReady } from './features/observatory/ready'

/*
 * The brand loader's driver. The overlay itself is drawn by index.html's CSS (#boot, shown while
 * <html> has `loading`, which the inline head script sets on the first page of a session only), so
 * it paints with the HTML and never shows without JavaScript. This counts 000 → 100 against real
 * work: the fonts, the hero's still and, on desktop, the world (her GLB and first frame), then
 * lifts the overlay (`out` on #boot, ~600 ms) and removes it. Caps: 1.8 s on phones; 3.0 s on desktop,
 * held to a hard 4.5 s while the world is still coming (counted from navigation start), so a slow
 * asset never holds the page. Plain DOM, outside #root:
 * nothing here touches hydration.
 */

const FLAG = 'blakra:loaded'
const PHONE = '(max-width: 767px)'
const EXIT_MS = 600
/** After the exit, how long the page is left alone before the world's heavy work resumes. */
const SETTLE_MS = 1000

export function boot() {
  const html = document.documentElement
  const el = document.getElementById('boot')
  if (!html.classList.contains('loading') || !el) {
    el?.remove()
    return
  }
  const count = el.querySelector<HTMLElement>('[data-count]')
  const phone = matchMedia(PHONE).matches
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || html.classList.contains('motion-off')
  const cap = phone ? 1800 : 3000
  // Desktop's world (her GLB and first frame) may need a little longer: lifting without it means a
  // handover from the still after the reveal, so the loader waits for it up to this hard cap.
  const hard = phone ? cap : 4500

  const tasks: Promise<unknown>[] = []
  tasks.push(document.fonts?.ready ?? Promise.resolve())
  const still = document.querySelector<HTMLImageElement>('#top [data-still] img')
  tasks.push(still && !still.complete ? new Promise((r) => { still.addEventListener('load', r, { once: true }); still.addEventListener('error', r, { once: true }) }) : Promise.resolve())
  if (!phone) tasks.push(new Promise<void>((r) => onWorldReady(r)))

  let done = 0
  let shown = 0
  let finished = false
  let raf = 0
  const total = tasks.length
  for (const t of tasks) void t.then(() => { done++ }, () => { done++ })

  const finish = () => {
    if (finished) return
    finished = true
    cancelAnimationFrame(raf)
    if (count) count.textContent = '100'
    el.style.setProperty('--p', '1')
    try {
      sessionStorage.setItem(FLAG, '1')
    } catch {}
    // Lifting before her first frame: her remaining heavy work waits out the exit and a settling second
    // (the still shows her meanwhile, then hands over with a crossfade), so nothing stalls the reveal.
    if (!phone && !isWorldReady()) holdWorld((calm ? 320 : EXIT_MS) + SETTLE_MS)
    // The exit is the overlay's own class; <html> changes once, at the end (one page-wide style pass, not two).
    el.classList.add('out')
    setTimeout(() => {
      html.classList.remove('loading')
      el.remove()
    }, calm ? 320 : EXIT_MS)
  }

  // The number: the share of finished work, plus a creep over time so it never sits still, eased.
  const tick = () => {
    const now = performance.now()
    const time = Math.min(1, now / cap)
    const target = Math.min(100, Math.max((done / total) * 100, time * 92 + Math.max(0, (now - cap) / (hard - cap + 1)) * 7))
    shown += (target - shown) * 0.18
    if (count) count.textContent = String(Math.min(99, Math.floor(shown))).padStart(3, '0')
    el.style.setProperty('--p', (shown / 100).toFixed(3))
    if (done >= total && shown > 97) return void setTimeout(finish, 120)
    if (now >= hard || (now >= cap && isWorldReady())) return finish()
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  setTimeout(finish, Math.max(0, hard - performance.now()) + 200)
}

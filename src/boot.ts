import { holdWorld, isWorldReady, markLifted, onWorldReady } from './features/observatory/ready'
import { frameWindow, PHONE_BAND } from './features/observatory/windows'
import { canRunWorld } from './features/experience/capable'

/*
 * The brand loader's driver. The overlay itself is drawn by index.html's CSS (#boot, shown while
 * <html> has `loading`, which the inline head script sets on the first page of a session only), so
 * it paints with the HTML and never shows without JavaScript. On exit the loader's ring travels to
 * the hero's ring and becomes it while the curtain clears, then the overlay is removed.
 *
 * Desktop: counts 000 → 100 against real work (the fonts, the hero's still, the world's first frame).
 * Caps: 3.0 s, held to a hard 4.5 s while the world is still coming (counted from navigation start).
 * Phones: no count and no minimum. Without the world (a weak device, ?film=off, any page but home) it
 * lifts the moment the fonts and the still are ready, at 1.2 s at the latest (index.html's CSS lifts it
 * by itself if this script arrives later than that), and it is not shown at all when everything is
 * ready within 300 ms (cached). With the world it waits for her first frame like desktop, up to 6 s.
 * Plain DOM, outside #root: nothing here touches hydration.
 */

const FLAG = 'blakra:loaded'
const PHONE = '(max-width: 767px)'
const EXIT_MS = 780
const EXIT_PHONE_MS = 450
const EXIT_CALM_MS = 320
const PHONE_CAP_MS = 1200
/** A phone running the world waits for her first frame this long at most (from navigation start). */
const PHONE_WORLD_CAP_MS = 15000
const PHONE_SKIP_MS = 300
/** After the exit, how long the page is left alone before the world's heavy work resumes. */
const SETTLE_MS = 1000
/** The loader ring's radius as a share of its box (index.html: r 83 in a 168 box). */
const RING_SHARE = 83 / 168
/** The ring in the phone still (hero-still-phone.webp, 780 × 900; Hero.tsx's ripples draw on it). */
export const PHONE_STILL_RING = PHONE_BAND.ring

interface Box {
  x: number
  y: number
  w: number
  h: number
}
export interface Ring {
  x: number
  y: number
  r: number
}

/** The hero's ring in the viewport on desktop, exactly where the world draws it (and the still shows it). */
export function deskRing(win: Box): Ring {
  const { ring } = frameWindow('hero', win)
  return { x: win.x + ring.x, y: win.y + ring.y, r: ring.r }
}

/** The ring in the phone still, from the box the still fills. */
export function phoneRing(band: Box): Ring {
  return { x: band.x + PHONE_STILL_RING.x * band.w, y: band.y + PHONE_STILL_RING.y * band.h, r: PHONE_STILL_RING.r * band.w }
}

/** What carries the loader's ring (its box `core`) onto `ring`; null when that ring is not on screen. */
export function exitTo(core: Box, ring: Ring, viewport: { w: number; h: number }): { x: number; y: number; k: number } | null {
  if (ring.x < 0 || ring.x > viewport.w || ring.y < 0 || ring.y > viewport.h) return null
  return { x: ring.x - (core.x + core.w / 2), y: ring.y - (core.y + core.h / 2), k: ring.r / (core.w * RING_SHARE) }
}

const box = (el: Element): Box => {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

export function boot() {
  const html = document.documentElement
  const el = document.getElementById('boot')
  if (!html.classList.contains('loading') || !el) {
    el?.remove()
    return
  }
  const count = el.querySelector<HTMLElement>('[data-count]')
  const phone = matchMedia(PHONE).matches
  const calm = html.classList.contains('motion-off')
  const exitMs = calm ? EXIT_CALM_MS : phone ? EXIT_PHONE_MS : EXIT_MS
  const cap = 3000
  // Desktop's world (her GLB and first frame) may need a little longer: lifting without it means a
  // handover from the still after the reveal, so the loader waits for it up to this hard cap.
  const hard = 15000

  const tasks: Promise<unknown>[] = []
  tasks.push(document.fonts?.ready ?? Promise.resolve())
  const still = document.querySelector<HTMLImageElement>('#top [data-still] img')
  // Decoded, so the frame that reveals it already has it.
  if (still) tasks.push(still.decode().catch(() => {}))
  // Only the home page has a world to wait for; a phone only when it will run one (Stage.tsx decides the same way).
  const home = !!document.querySelector('#top [data-window="hero"]')
  const phoneWorld = phone && home && new URLSearchParams(location.search).get('film') !== 'off' && canRunWorld()
  if (home && (!phone || phoneWorld)) tasks.push(new Promise<void>((r) => onWorldReady(r)))

  let done = 0
  let shown = 0
  let finished = false
  let raf = 0
  const total = tasks.length
  for (const t of tasks) void t.then(() => { done++ }, () => { done++ })

  const remember = () => {
    try {
      sessionStorage.setItem(FLAG, '1')
    } catch {}
    markLifted()
  }
  const remove = () => {
    html.classList.remove('loading')
    el.remove()
  }
  const land = () => {
    if (calm) return
    const core = el.querySelector('.b-core')
    const win = phone && !phoneWorld ? still?.closest('[data-still]') : document.querySelector('#top [data-window="hero"]')
    if (!core || !win) return
    const to = exitTo(box(core), phone && !phoneWorld ? phoneRing(box(win)) : deskRing(box(win)), { w: innerWidth, h: innerHeight })
    if (!to) return
    el.style.setProperty('--x', `${to.x.toFixed(2)}px`)
    el.style.setProperty('--y', `${to.y.toFixed(2)}px`)
    el.style.setProperty('--k', to.k.toFixed(4))
  }

  const finish = () => {
    if (finished) return
    finished = true
    cancelAnimationFrame(raf)
    if (count) count.textContent = '100'
    el.style.setProperty('--p', '1')
    remember()
    // Lifting before her first frame: her remaining heavy work waits out the exit and a settling second
    // (the still shows her meanwhile, then hands over with a crossfade), so nothing stalls the reveal.
    if ((!phone || phoneWorld) && !isWorldReady()) holdWorld(exitMs + SETTLE_MS)
    land()
    // The exit is the overlay's own class; <html> changes once, at the end (one page-wide style pass, not two).
    el.classList.add('out')
    setTimeout(remove, exitMs)
  }

  // Arriving after the CSS has already lifted it, the overlay stays lifted (the phone path below clears it).
  if (phoneWorld) {
    // index.html's CSS would lift the overlay at 1.2 s by itself: this script holds it for the world instead.
    el.style.animation = 'none'
    void Promise.all(tasks).then(() => setTimeout(finish, 80))
    setTimeout(finish, Math.max(0, PHONE_WORLD_CAP_MS - performance.now()))
    return
  }

  if (phone) {
    const now = performance.now()
    // Later than the cap: the CSS is already lifting it (or has); this only clears it away.
    if (now > PHONE_CAP_MS + 50) {
      // A slow first load: the page is already in by now, so the overlay leaves at once.
      finish()
      return
    }
    void Promise.all(tasks).then(() => {
      if (finished) return
      if (performance.now() <= PHONE_SKIP_MS) {
        finished = true
        remember()
        remove()
      } else finish()
    })
    setTimeout(finish, PHONE_CAP_MS - now)
    return
  }

  // The number: the share of finished work, plus a creep over time so it never sits still, eased.
  const tick = () => {
    const now = performance.now()
    const time = 1 - Math.exp(-now / cap)
    const target = Math.min(100, Math.max((done / total) * 100, time * 92 + Math.max(0, (now - cap) / (hard - cap + 1)) * 7))
    shown += (target - shown) * 0.18
    if (count) count.textContent = String(Math.min(99, Math.floor(shown))).padStart(3, '0')
    el.style.setProperty('--p', (shown / 100).toFixed(3))
    if (done >= total && shown > 97) return void setTimeout(finish, 120)
    if (now >= hard || (now >= cap && done >= total)) return finish()
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  setTimeout(finish, Math.max(0, hard - performance.now()) + 200)
}

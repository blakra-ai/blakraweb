import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type Lenis from 'lenis'
import { gsap } from './gsap'
import { reflow, reflowNow } from './reflow'
import { whenMotionIdle } from './schedule'

/**
 * One owner for everything that moves the page: the reduced-motion decision, Lenis and
 * in-page navigation. The film's 3D world (src/features/experience) reads the scroll from
 * here and draws in the same frame as Lenis.
 */

interface Motion {
  /** Animations may run: no reduced-motion preference and not switched off on the page. */
  enabled: boolean
  /** The page switch (independent of the OS preference). */
  userOff: boolean
  systemReduced: boolean
  setUserOff(off: boolean): void
  scrollToHash(hash: string, immediate?: boolean): void
}

const MotionContext = createContext<Motion>({
  enabled: false,
  userOff: false,
  systemReduced: false,
  setUserOff: () => {},
  scrollToHash: () => {},
})

export const useMotion = () => useContext(MotionContext)

/* ---------- the smooth scroll, shared with the film's world ---------- */

let currentLenis: Lenis | null = null
/** The live Lenis instance (null with motion off or ?smooth=native). */
export const getLenis = () => currentLenis

/* ---------- anchors that live inside pinned tracks resolve to a scroll position ---------- */

export interface AnchorTarget {
  top: number
  focus?: HTMLElement | null
  /** Runs after the scroll lands (e.g. centring a card in a swipe carousel). */
  after?: () => void
}
const anchors = new Map<string, () => AnchorTarget | null>()

export function registerAnchor(id: string, resolve: () => AnchorTarget | null): () => void {
  anchors.set(id, resolve)
  return () => {
    if (anchors.get(id) === resolve) anchors.delete(id)
  }
}

/**
 * A scroll to an in-page target that always lands on time, however slow the frames are,
 * and yields at once to the reader's own wheel, touch or keys.
 */
function glideTo(from: number, top: number, done: () => void) {
  const start = performance.now()
  const duration = Math.min(1400, 600 + Math.abs(top - from) * 0.08)
  let raf = 0
  const stop = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('wheel', stop)
    window.removeEventListener('touchstart', stop)
    window.removeEventListener('keydown', stop)
  }
  window.addEventListener('wheel', stop, { passive: true })
  window.addEventListener('touchstart', stop, { passive: true })
  window.addEventListener('keydown', stop)
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    window.scrollTo({ top: from + (top - from) * e, behavior: 'instant' })
    if (t < 1) raf = requestAnimationFrame(step)
    else {
      stop()
      done()
    }
  }
  raf = requestAnimationFrame(step)
}

const STORAGE_KEY = 'blakra:motion'

function readStoredOff(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

/** The scroll box of a section: its pin spacer when pinned. */
function boxOf(el: HTMLElement): HTMLElement {
  const parent = el.parentElement
  return parent?.classList.contains('pin-spacer') ? parent : el
}

export function MotionProvider({ children }: { children: ReactNode }) {
  // `ready` stays false through SSR and hydration, so nothing animates before the
  // preferences are known and the first client render matches the prerendered HTML.
  const [ready, setReady] = useState(false)
  const [systemReduced, setSystemReduced] = useState(false)
  const [userOff, setUserOffState] = useState(false)
  const enabled = ready && !systemReduced && !userOff
  const lenisRef = useRef<Lenis | null>(null)
  const restoreRef = useRef<{ el: HTMLElement; progress: number } | null>(null)
  const initialHashRef = useRef<string | null>(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setSystemReduced(mq.matches)
    sync()
    setUserOffState(readStoredOff())
    // Pins change the page height, so a linked section is scrolled to after they exist.
    if (location.hash) initialHashRef.current = location.hash
    // 'booted' tells the watchdog in index.html that the app runs (it keeps the motion layout).
    document.documentElement.classList.add('js', 'booted')
    setReady(true)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!ready) return
    const root = document.documentElement
    root.classList.toggle('motion-on', enabled)
    root.classList.toggle('motion-off', !enabled)
  }, [enabled, ready])

  // Smooth scrolling (Lenis, on the GSAP ticker). Nothing pins or snaps any more, so it can
  // never jump; ?smooth=native leaves the browser's own scrolling for comparison.
  useEffect(() => {
    if (!enabled || new URLSearchParams(location.search).get('smooth') === 'native') return
    // Lenis is not in the boot bundle: it arrives after the page is interactive (TBT on phones).
    let lenis: Lenis | null = null
    let raf: ((time: number) => void) | null = null
    let cancelled = false
    import('lenis').then(({ default: LenisCtor }) => {
      if (cancelled) return
      lenis = new LenisCtor({ autoRaf: false, lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 })
      lenisRef.current = lenis
      currentLenis = lenis
      raf = (time: number) => lenis!.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
    })
    return () => {
      cancelled = true
      if (raf) gsap.ticker.remove(raf)
      lenis?.destroy()
      lenisRef.current = null
      currentLenis = null
      gsap.ticker.lagSmoothing(500, 33)
    }
  }, [enabled])

  // Content that changes height after load (the pulse answer opening) moves everything
  // below it: re-measure every held section, once per change.
  useEffect(() => {
    let measuredHeight = document.body.offsetHeight
    let refreshFrame = 0
    const heightWatch = new ResizeObserver(() => {
      if (refreshFrame || Math.abs(document.body.offsetHeight - measuredHeight) < 2) return
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0
        measuredHeight = document.body.offsetHeight
        reflow()
      })
    })
    heightWatch.observe(document.body)
    return () => {
      heightWatch.disconnect()
      cancelAnimationFrame(refreshFrame)
    }
  }, [])

  const scrollToHash = useCallback((hash: string, immediate = false) => {
    const id = decodeURIComponent(hash.replace(/^#/, ''))
    const custom = anchors.get(id)?.()
    if (custom) {
      const done = () => {
        custom.after?.()
        custom.focus?.focus({ preventScroll: true })
      }
      glide(custom.top, done)
      return
    }
    const target = id ? document.getElementById(id) : null
    if (!target) return
    // A target that is focusable itself (main, a heading) takes focus; a section hands it to its first heading.
    const focusTarget = target.hasAttribute('tabindex') ? target : (target.querySelector<HTMLElement>('[data-focus]') ?? target)
    const focus = () => focusTarget.focus({ preventScroll: true })
    glide(boxOf(target).getBoundingClientRect().top + window.scrollY, focus)

    function glide(top: number, done: () => void) {
      const lenis = lenisRef.current
      const from = window.scrollY
      if (immediate || !enabledRef.current || Math.abs(top - from) < 2) {
        window.scrollTo({ top, behavior: 'instant' })
        done()
      } else if (lenis) lenis.scrollTo(top, { duration: 1.3, onComplete: done })
      else glideTo(from, top, done)
    }
  }, [])
  const scrollToHashRef = useRef(scrollToHash)
  scrollToHashRef.current = scrollToHash

  // Once every queued motion setup has run, measure the page once, then put the reader
  // back where they were (after the motion switch) or at the linked section.
  useEffect(() => {
    if (!ready) return
    const restore = restoreRef.current
    restoreRef.current = null
    return whenMotionIdle(() => {
      // Every held act has its final height now: measure once, before any scroll that needs it.
      reflowNow()
      const hash = initialHashRef.current
      initialHashRef.current = null
      if (hash) return scrollToHashRef.current(hash, true)
      if (!restore) return
      const box = boxOf(restore.el)
      const top = box.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: top + restore.progress * box.offsetHeight - window.innerHeight / 2, behavior: 'instant' })
      lenisRef.current?.scrollTo(window.scrollY, { immediate: true })
    })
  }, [enabled, ready])

  // In-page links (including "/#contact" from the home page) go through scrollToHash.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank') return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return
      e.preventDefault()
      const intent = url.searchParams.get('intent')
      history.replaceState(null, '', `${intent ? url.search : ''}${url.hash}`)
      if (intent) window.dispatchEvent(new CustomEvent('blakra:intent', { detail: intent }))
      scrollToHash(url.hash)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [scrollToHash])

  const setUserOff = useCallback((off: boolean) => {
    // Remember where the reader is, so rebuilding the motion contexts doesn't move them.
    const centre = window.innerHeight / 2
    const el = [...document.querySelectorAll<HTMLElement>('main > section, main > div')].find((node) => {
      const r = boxOf(node).getBoundingClientRect()
      return r.top <= centre && r.bottom > centre
    })
    if (el) {
      const r = boxOf(el).getBoundingClientRect()
      restoreRef.current = { el, progress: (centre - r.top) / Math.max(1, r.height) }
    }
    try {
      if (off) localStorage.setItem(STORAGE_KEY, 'off')
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage blocked: the choice lasts for this page view */
    }
    setUserOffState(off)
  }, [])

  const value = useMemo(() => ({ enabled, userOff, systemReduced, setUserOff, scrollToHash }), [enabled, userOff, systemReduced, setUserOff, scrollToHash])

  return (
    <MotionContext.Provider value={value}>
      {children}
    </MotionContext.Provider>
  )
}

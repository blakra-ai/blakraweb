import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { whenMotionIdle } from './schedule'
import type { EngineRenderer } from './engine3d/frame'
import { boost, getSections, mixPose, narrowOf, onSectionsChange, poses, type Pose } from './engine3d/stage'
import { frameAt, type Metric } from './engine3d/path'
import { getPulse } from './pulse'
import { canRunWorld } from './world/capable'
import { chakraOf, needs, needTop } from '../content/shared'
import { StageFallback } from '../components/StageFallback'

/**
 * One owner for everything that moves: the reduced-motion decision, Lenis, the 3D
 * engine stage, the page clock and in-page navigation.
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

/* ---------- the page clock: sections set the hour, the header shows it ---------- */

type ClockListener = (minutes: number) => void
const clockListeners = new Set<ClockListener>()
let clockMinutes = 358

export function setClock(minutes: number) {
  if (minutes === clockMinutes) return
  clockMinutes = minutes
  clockListeners.forEach((fn) => fn(minutes))
}

export function onClock(fn: ClockListener): () => void {
  clockListeners.add(fn)
  fn(clockMinutes)
  return () => clockListeners.delete(fn)
}

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

/** Whether the picture would change between two poses (every field the world reads). */
function poseMoved(a: Pose, b: Pose): boolean {
  const scalar = (k: keyof Pose) => Math.abs((a[k] as number) - (b[k] as number))
  let d = scalar('dist') + scalar('el') + scalar('az') + scalar('disk') + scalar('fade') + scalar('chaos') + scalar('isco')
  d += scalar('lift') + scalar('column') + scalar('flow') + scalar('bloom') + scalar('jets') + scalar('infall') + scalar('orbiters')
  d += Math.abs(a.target[0] - b.target[0]) + Math.abs(a.target[1] - b.target[1]) + Math.abs(a.target[2] - b.target[2])
  d += Math.abs(a.shift[0] - b.shift[0]) + Math.abs(a.shift[1] - b.shift[1])
  return d > 1e-4
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    const lenis = new Lenis({ autoRaf: false, lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 })
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisRef.current = null
      gsap.ticker.lagSmoothing(500, 33)
    }
  }, [enabled])

  // The 3D engine: one fixed canvas behind the page. The camera follows the scroll from
  // section to section; the scene state (orbits, column, light) travels with it.
  useEffect(() => {
    let renderer: EngineRenderer | null = null
    let idleId = 0
    let started = performance.now()
    let metrics: Metric[] = []
    let pose: Pose = poses.hero as Pose
    const lit = new Array(7).fill(0.3)
    const open = new Array(7).fill(0.32)
    let flow = 0
    let pulseSeen = 0
    // The page opens on the formed black hole, exactly the still it crossfades from; the
    // scattered orbits belong to the tipping point, where the scroll brings them back.
    let firstDraw = 0
    // The pointer as a small mass: view units, eased in while it moves.
    const pointer: [number, number, number] = [0, 0, 0]
    let pointerAt = 0
    let lastIndex = -1
    let dirty = true
    let lastTick = performance.now()
    const narrowMq = window.matchMedia('(max-width: 899px)')
    // Quality governor. Resizing the render targets costs a visible hitch, so quality is
    // settled in the first seconds of drawing while the page is still, then held; after
    // that it only steps down, and only on sustained slowness while still.
    let lastFrame = 0
    let frames = 0
    let spent = 0
    let calibrating = true
    let calibrationEnds = 0
    // A phone in Low Power Mode (or a laptop saving energy) runs at 30 fps however fast its GPU
    // is. A step down that does not make frames faster shows that: the step is undone, and
    // slowness is judged against that pace from then on (budget: frame time over 60 fps's).
    let budget = 1
    let stepAvg = 0
    let lastScrollAt = 0
    let lastScrollY = window.scrollY
    // Last resort on very slow GPUs: stop the idle animation and draw only when something changes.
    let throttled = false
    let drawnIndex = -2
    let wasLive = false
    // The camera follows a smoothed scroll position: a critically damped glide, so a wheel
    // notch or a flick still reads as one camera move.
    let camY = window.scrollY

    const measure = () => {
      const narrow = narrowMq.matches
      metrics = getSections().map((sec) => {
        const box = boxOf(sec.el).getBoundingClientRect()
        const base = narrow ? { ...narrowOf(sec.pose), ...sec.narrow } : sec.pose
        return { top: box.top + window.scrollY, height: box.height, pose: base, minutes: sec.minutes, hold: sec.hold, live: sec.live }
      })
      dirty = true
    }

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !enabledRef.current) return
      pointer[0] = e.clientX / window.innerWidth
      pointer[1] = 1 - e.clientY / window.innerHeight
      pointerAt = performance.now()
    }

    const profile: { tick: number[]; steps: string[] } | null = new URLSearchParams(location.search).has('profile') ? { tick: [], steps: [] } : null
    if (profile) (window as unknown as { __motion: typeof profile }).__motion = profile
    const tick = () => {
      const t0 = profile ? performance.now() : 0
      tickBody()
      if (profile) profile.tick.push(performance.now() - t0)
    }
    const tickBody = () => {
      const live = enabledRef.current
      const now = performance.now()
      const dtS = Math.min(0.1, (now - lastTick) / 1000)
      lastTick = now
      // Frame-rate independent easing: the same glide at 30 or 120 fps.
      const ease = (lambda: number) => 1 - Math.exp(-dtS * lambda)
      // Switching motion back on gives a throttled (but hardware) GPU another chance.
      if (live && !wasLive) throttled = false
      wasLive = live
      const y = window.scrollY
      if (y !== lastScrollY) {
        lastScrollY = y
        lastScrollAt = now
      }
      const smooth = live && !throttled
      // Far jumps (a link, a reload mid-page) cut; everything else glides.
      if (!smooth || Math.abs(y - camY) > window.innerHeight * 2.5) camY = y
      else camY += (y - camY) * ease(7)
      // Motion off or a GPU too slow to ease: the camera cuts between poses instead of travelling.
      const f = frameAt(metrics, camY, window.innerHeight, smooth)
      if (f.index !== lastIndex) {
        lastIndex = f.index
        if (f.minutes !== undefined) setClock(f.minutes)
      }
      if (!renderer || document.hidden) {
        lastFrame = 0
        return
      }
      const before = pose
      pose = smooth ? mixPose(pose, f.pose, ease(9)) : f.pose
      let settling = poseMoved(before, pose)

      // The visitor's pulse: light rises from the root to the layer they need,
      // through the layers that need takes. A new answer starts the rise again.
      const pulse = getPulse()
      if (pulse.changedAt !== pulseSeen) {
        pulseSeen = pulse.changedAt
        if (pulse.choice) flow = 0
      }
      const focus = pulse.choice && pulse.choice !== 'all' ? chakraOf[needTop(pulse.choice)] : -1
      // Before the engine has been climbed (nothing open yet), the answer shapes the column:
      // light stops at the visitor's layer, and only the layers their need takes are lit.
      const shaping = pose.bloom < 0.5
      const takes = !shaping || pulse.choice === 'all' ? null : pulse.choice ? new Set(needs[pulse.choice].layers.map((l) => chakraOf[l])) : null
      const flowTarget = shaping && focus >= 0 ? Math.min(pose.flow, focus + 0.02) : pose.flow
      const before0 = flow
      flow = smooth ? flow + Math.max(-dtS * 6, Math.min(dtS * 4.5, flowTarget - flow)) : flowTarget
      if (Math.abs(flow - before0) > 1e-4) settling = true
      for (let i = 0; i < 7; i++) {
        const reached = Math.min(1, Math.max(0, flow - i + 0.5))
        const needed = takes ? takes.has(i) : true
        const litT = needed ? 0.3 + 0.7 * reached : 0.12
        let openT = 0.32 + 0.68 * Math.min(1, Math.max(0, pose.bloom - i))
        if (needed && takes && reached > 0.5) openT = Math.max(openT, i === focus ? 1 : 0.8)
        const l0 = lit[i], o0 = open[i], b0 = boost.current[i]
        lit[i] += (litT - lit[i]) * (smooth ? ease(6) : 1)
        open[i] += (openT - open[i]) * (smooth ? ease(3.5) : 1)
        boost.current[i] += (boost.target[i] - boost.current[i]) * (smooth ? ease(5) : 1)
        if (Math.abs(lit[i] - l0) + Math.abs(open[i] - o0) + Math.abs(boost.current[i] - b0) > 1e-4) settling = true
      }

      const mass = live && now - pointerAt < 1600 ? 1 : 0
      pointer[2] += (mass - pointer[2]) * (live ? ease(3.5) : 1)

      // Live: every frame animates. Otherwise (motion off, or throttled): only when the picture changes.
      const wanted = smooth ? true : dirty || settling || f.index !== drawnIndex
      if (!wanted) {
        lastFrame = 0
        return
      }
      if (!renderer.draw({ pose, lit, open, boost: boost.current, flow, focus, form: 1, pointer, time: live ? (now - started) / 1000 : 4 })) {
        lastFrame = 0
        return
      }
      if (!firstDraw) {
        firstDraw = now
        calibrationEnds = now + 4000
      }
      if (!document.documentElement.classList.contains('gl-live')) document.documentElement.classList.add('gl-live')
      drawnIndex = f.index
      dirty = false

      // Governor: only frames drawn back to back while the page is still count.
      const interval = lastFrame ? now - lastFrame : 0
      lastFrame = now
      const still = now - lastScrollAt > 500
      if (!live || !still || interval <= 0 || interval > 250) {
        frames = 0
        spent = 0
        return
      }
      frames++
      spent += interval
      const window_ = calibrating ? 45 : 240
      if (frames < window_) return
      const avg = spent / frames
      frames = 0
      spent = 0
      if (profile) profile.steps.push(`${Math.round(now)} avg ${avg.toFixed(1)} calibrating ${calibrating}`)
      // Targets in milliseconds per frame at 60 Hz (scaled by the display's own pace): below about
      // 45 fps is too slow, 60 fps or better has headroom.
      if (now < firstDraw + 1500) return // the first frames warm up shaders and textures
      // Quality only ever steps down: a still page always has headroom that scrolling then spends.
      if (calibrating) {
        if (stepAvg && avg > stepAvg * 0.9) {
          // The last step down did not help: the pace is set by the display, not the GPU.
          renderer.adjust(1)
          budget = Math.min(3, Math.max(1, avg / (1000 / 60)))
          stepAvg = 0
          if (profile) profile.steps.push(`paced at ${avg.toFixed(1)} ms: step undone, budget ${budget.toFixed(2)}`)
        } else if (avg > 22 * budget) stepAvg = renderer.adjust(-1) ? avg : 0
        else {
          stepAvg = 0
          if (now > calibrationEnds) calibrating = false
        }
        if (now > calibrationEnds + 4000) calibrating = false
      } else if (avg > 30 * budget) {
        // Sustained slowness after settling: one step down, or stop animating at the bottom.
        if (!renderer.adjust(-1)) throttled = true
      }
    }

    let disposed = false
    let lostWorld: EngineRenderer | null = null
    let restarts = 0
    const start = async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      // Devices that will not run it never download three.js at all.
      if (!canRunWorld()) {
        document.documentElement.classList.add('gl-off')
        return
      }
      // three.js loads only now, after the page is up, so it never delays the first paint.
      const { createWorld } = await import('./world/world')
      if (disposed) return
      const world = createWorld(canvas, () => {
        lostWorld = world
        renderer = null
        document.documentElement.classList.remove('gl-live')
        document.documentElement.classList.add('gl-off')
      })
      renderer = world
      if (!renderer) {
        document.documentElement.classList.add('gl-off')
        return
      }
      started = performance.now()
      dirty = true
    }
    const onResize = () => {
      renderer?.resize()
      measure()
    }
    // iOS drops the context when the visitor switches apps; low-memory Android when it must.
    // The world lost with it is rebuilt on the restored context (twice at most per visit).
    const onRestored = () => {
      if (disposed || !lostWorld || restarts >= 2) return
      restarts++
      lostWorld.dispose()
      lostWorld = null
      document.documentElement.classList.remove('gl-off')
      firstDraw = 0
      void start()
    }
    const canvasEl = canvasRef.current
    canvasEl?.addEventListener('webglcontextrestored', onRestored)

    measure()
    gsap.ticker.add(tick)
    const offSections = onSectionsChange(measure)
    ScrollTrigger.addEventListener('refresh', measure)
    window.addEventListener('resize', onResize)
    // Content that changes height after load (the pulse answer opening) moves everything
    // below it: re-measure every held section and every pose, once per change.
    let measuredHeight = document.body.offsetHeight
    let refreshFrame = 0
    const heightWatch = new ResizeObserver(() => {
      if (refreshFrame || Math.abs(document.body.offsetHeight - measuredHeight) < 2) return
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0
        measuredHeight = document.body.offsetHeight
        ScrollTrigger.refresh()
      })
    })
    heightWatch.observe(document.body)
    window.addEventListener('pointermove', onPointer, { passive: true })
    // The engine waits for the page to load (never longer than 1.5 s), so it never competes with first paint.
    const schedule = () => {
      const run = () => void start()
      idleId = window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 1500 }) : window.setTimeout(run, 120)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })

    return () => {
      disposed = true
      gsap.ticker.remove(tick)
      offSections()
      ScrollTrigger.removeEventListener('refresh', measure)
      heightWatch.disconnect()
      cancelAnimationFrame(refreshFrame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('load', schedule)
      window.cancelIdleCallback?.(idleId)
      canvasEl?.removeEventListener('webglcontextrestored', onRestored)
      renderer?.dispose()
      lostWorld?.dispose()
      document.documentElement.classList.remove('gl-live')
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
      // Stage triggers are created before the pins above them exist: sort by position, then measure.
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
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
      <StageFallback />
      <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />
      <div className="stage-scrim" aria-hidden="true" />
      {children}
    </MotionContext.Provider>
  )
}

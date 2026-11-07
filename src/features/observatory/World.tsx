import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Color, DoubleSide, Mesh, NearestFilter, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderTarget, type Texture } from 'three'
import { useMotion } from '../../motion/MotionProvider'
import { onPulse } from '../../motion/pulse'
import { needs } from '../../content/shared'
import { LAYERS, nav } from '../navigator/state'
import { CHAKRAS } from '../navigator/yantra'
import { onReflow } from '../../motion/reflow'
import { STATIONS } from './gaugeMath'
import { ORBIT_END } from './orbit'
import { obs } from './state'
import { createGuideHandle, fitGuideCamera, Guide, placeGuide } from './Guide'
import { GOLD, springStep } from './guidePose'
import { createGovernor, idlePeriodMs, SKY_HZ, stepGovernor, type Governor } from './pacing'
import { apertureBetween, BUST_EYE_DROP, bustPlace, contactExpansion, contactSpan, heroContraction, paperColumn, portholeBlocked, portholeLayout, stepFade, type PortholeLayout } from './porthole'
import { createPorthole } from './shaders/porthole'

/** The picker's choice as her layers (indices 0 … 6), or null. */
export const pickedLayers = () => (obs.picker ? (obs.picker === 'all' ? LAYERS : needs[obs.picker].layers).map((l) => LAYERS.indexOf(l)) : null)
import { createRing, fitRing, glowAt } from './shaders/ring'
import { createWell, fitWell } from './shaders/well'
import { BEND_MS, bendAt, FRAME_RADIUS, getWindows, GRID_CELL, holeFor, onScreen, onWindows, stickyOf, stickyViewY, toGl, type Rect, type Sticky } from './windows'
import { LAYERS_N } from './orbit'
import { markHandover, onWorldReady } from './ready'

/*
 * The Observatory's world: ONE fixed, full-viewport canvas behind the document, drawing the one
 * evolving object (the warped grid, the lensing ring and, on the stage, its seven bands) through
 * every registered window (windows.ts). Each window is rendered with gl viewport = the window's
 * own rect (so its picture scrolls with it) and gl scissor = the part of it on screen, through an
 * orthographic camera in the window's CSS px. The guide (Guide.tsx: Astraía from the navigator
 * pipeline) is drawn after the flat pass, through a perspective camera (world units = CSS px at
 * z 0), in the two windows whose framing places her (hero, contact).
 *
 * frameloop="demand": a frame is drawn on scroll, pointer move (her gaze), reflow and while the
 * load device or a pulse plays, at every animation frame; while only her life and the sky move, at
 * the idle rate (pacing.ts). With nothing on screen no GL call is made and the canvas leaves the
 * compositor. The well, the costliest pass, is shaded into a per-window texture at SKY_HZ and copied
 * on the other frames (the copy follows the scroll). Passes that change no pixel are skipped.
 * dpr 1 … 1.25, moved by the governor (pacing.ts) when frames stay late or on time. `?profile` logs the
 * frame's CPU time every 2 s. Layout is read rarely: the scroll is one number per frame, the rects
 * come from the registry, and her reading point re-reads its line only when something moved it.
 */

const PROFILE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('profile')
/** Frames keep coming this long after the last input (the scroll's velocity settles). */
const INPUT_HOLD_S = 0.4
const SCROLL_V_DAMP = 8
/** The dpr cap for discrete GPUs; integrated ones (Intel UHD/Iris, Mali, Adreno, Apple) start and stay at 1. */
const DPR_MAX = 1.25
const INTEGRATED = /intel|uhd|iris|mali|adreno|apple|powervr/i
/** A window larger than this (device px) is shaded live: its copy would cost more memory than it saves. */
const SKY_MAX_PX = 12_000_000
/** A window's copy is freed this long after it left the screen. */
const SKY_KEEP_MS = 4000
/** Her head turning faster than this (deg/s) draws at the full rate; her slow drift does not. */
const TURNING = 0.6

/** One window's shaded well: the texture, what it was shaded from, when. */
interface SkyCopy {
  rt: WebGLRenderTarget
  sig: number[]
  at: number
  seen: number
}

/** The copy pass: the texture's pixels 1:1; the rounded corners stay out as the well's `discard` left them. */
function createSkyBlit() {
  const uTex = { value: null as Texture | null }
  const material = new ShaderMaterial({
    uniforms: { uTex },
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = vec2(uv.x, 1.0 - uv.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: /* glsl */ `
precision highp float;
uniform sampler2D uTex;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uTex, vUv);
  if (c.a < 0.5) discard;
  gl_FragColor = c;
}`,
  })
  const mesh = new Mesh(new PlaneGeometry(1, 1), material)
  mesh.frustumCulled = false
  mesh.name = 'SkyBlit'
  return { mesh, uTex, scene: new Scene().add(mesh) as Scene }
}

/** The GPU's name from the live context (no extra context is created). */
function rendererName(gl: { getContext(): WebGLRenderingContext | WebGL2RenderingContext }): string {
  const ctx = gl.getContext()
  const info = ctx.getExtension('WEBGL_debug_renderer_info')
  return String(info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : '')
}
/** Frames drawn so far (`?profile`: globalThis.__obsWorld.frames.n, for an idle-cost probe). */
const frames = { n: 0, why: '' }
/** What the porthole keeps clear of: the paper's words and the ink wells' discs (page px; a block in a sticky hold carries its hold). Measured on reflow only. */
interface Obstacle {
  rect: Rect
  sticky: Sticky | null
}
const obstacles = { text: [] as Obstacle[], discs: [] as Obstacle[] }
function measureObstacles() {
  const page = (el: Element): Obstacle | null => {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    const sticky = stickyOf(el as HTMLElement)
    const rect = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
    // A held block: its rect relative to the hold's natural place.
    if (sticky) rect.y = rect.y - (sticky ? stickyViewY(sticky, window.scrollY) + window.scrollY - sticky.naturalY : 0)
    return { rect, sticky }
  }
  obstacles.text = []
  obstacles.discs = []
  for (const el of document.querySelectorAll('main :is(h1, h2, h3, h4, p, li, dt, dd, blockquote, figcaption, a, button, label, input, textarea, [data-row])')) {
    if (el.closest('[data-window]')) continue
    const o = page(el)
    if (o) obstacles.text.push(o)
  }
  for (const el of document.querySelectorAll('main [data-ink-well]')) {
    const o = page(el)
    if (o) obstacles.discs.push(o)
  }
}
/** An obstacle's viewport rect at this scroll (a held one rides its hold). */
function viewOf(o: Obstacle, y: number, out: Rect): Rect {
  out.x = o.rect.x
  out.w = o.rect.w
  out.h = o.rect.h
  out.y = o.sticky ? stickyViewY(o.sticky, y) + (o.rect.y - o.sticky.naturalY) : o.rect.y - y
  return out
}
const nearText: Rect[] = []
const nearDiscs: { x: number; y: number; r: number }[] = []
const scratch: Rect[] = Array.from({ length: 64 }, () => ({ x: 0, y: 0, w: 0, h: 0 }))
const TINT = new Color()
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * The point her eyes read: the guide's line (an italic `.voice` with the caret) on screen nearest
 * the porthole's height (the hero and contact only; elsewhere the nearest section heading), swept left to right over its lines at the typing pace (Line.tsx's CPS),
 * from when it became the current line; a new line of it marks a nod. Reads one element's rects per frame.
 */
const READ_CPS = 34
/** How long a reading of the line stands while the scroll stays put (a reflow drops it at once). */
const READ_STALE_MS = 400
interface ReadState {
  host: HTMLElement | null
  start: number
  line: number
  nodAt: number
  /** The last reading of the layout: at which scroll and when, the line's box, its line boxes and length. */
  y: number
  at: number
  box: DOMRect | null
  rects: DOMRect[]
  chars: number
}
function readingPoint(r: ReadState, vh: number, clock: number, still: boolean, scrollY: number, now: number) {
  if (scrollY !== r.y || now - r.at > READ_STALE_MS) {
    r.y = scrollY
    r.at = now
    let found: HTMLElement | null = null
    let bestD = Infinity
    let foundRect: DOMRect | null = null
    // Her line where there is one (hero, contact); on the paper sections, the section heading.
    for (const sel of ['.voice[data-caret]', 'main :is(h1, h2)']) {
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        const host = el.parentElement?.matches('p.voice') ? el.parentElement : el
        const b = host.getBoundingClientRect()
        if (b.height <= 0 || b.bottom < 70 || b.top > vh - 20) continue
        const d = Math.abs(b.top + b.height / 2 - 0.55 * vh)
        if (d < bestD) {
          bestD = d
          found = host
          foundRect = b
        }
      }
      if (found) break
    }
    r.box = foundRect
    if (found && r.host !== found) {
      r.start = clock
      r.line = 0
    }
    r.host = found
    if (found) {
      r.rects = [...found.getClientRects()].filter((q) => q.width > 2)
      r.chars = found.textContent?.length ?? 0
    }
  }
  const best = r.host
  const bestRect = r.box
  if (!best || !bestRect) return { host: null, x: 0, y: 0, bottom: 0, typing: false }
  const rects = r.rects
  const total = rects.reduce((a, q) => a + q.width, 0) || 1
  const p = still ? 1 : Math.min(1, ((clock - r.start) * READ_CPS) / Math.max(1, r.chars))
  let left = p * total
  let x = bestRect.right
  let y = bestRect.bottom
  let line = rects.length - 1
  for (let k = 0; k < rects.length; k++) {
    if (left <= rects[k].width || k === rects.length - 1) {
      x = rects[k].left + Math.min(left, rects[k].width)
      y = rects[k].top + rects[k].height / 2
      line = k
      break
    }
    left -= rects[k].width
  }
  if (line !== r.line) {
    r.line = line
    r.nodAt = clock
  }
  return { host: best, x, y, bottom: bestRect.bottom, typing: p < 1 }
}

function Passes({ handle, onDpr }: { handle: ReturnType<typeof createGuideHandle>; onDpr: (dpr: number) => void }) {
  const { gl, scene, size, invalidate } = useThree()
  const ortho = useMemo(() => new OrthographicCamera(0, 1, 0, 1, -10, 10), [])
  const persp = useMemo(() => new PerspectiveCamera(30, 1, 1, 20000), [])
  // The flat quads have their own scenes: drawing them never walks her 50 nodes.
  const well = useMemo(() => {
    const w = createWell()
    return { ...w, scene: new Scene().add(w.mesh) as Scene }
  }, [])
  const ring = useMemo(() => {
    const r = createRing()
    return { ...r, scene: new Scene().add(r.mesh) as Scene }
  }, [])
  const blit = useMemo(createSkyBlit, [])
  const skies = useMemo(() => new Map<string, SkyCopy>(), [])
  // One scene per quad, made with them (StrictMode may run a memo twice: a mesh has one parent).
  const port = useMemo(() => {
    const p = createPorthole()
    const make = (m: typeof p.bg) => new Scene().add(m) as Scene
    return { ...p, scenes: { bg: make(p.bg), mask: make(p.mask), fade: make(p.fade) } }
  }, [])
  const portScenes = port.scenes
  const t = useRef({ last: 0, lastY: 0, bendStart: -1, inputAt: 0, frames: 0, ms: 0, since: 0, kicked: false, timer: 0, period: 0, drew: true, shown: true, maxScroll: 0, governor: null as Governor | null, guideShown: false, viewport: { w: 1, h: 1 }, opacity: 1, paper: 0, layout: null as PortholeLayout | null, cy: NaN, cyV: 0, read: { host: null, start: 0, line: 0, nodAt: -10, y: NaN, at: 0, box: null, rects: [], chars: 0 } as ReadState })

  useEffect(() => {
    gl.autoClear = false
    gl.setClearColor(0x000000, 0)
    const s = t.current
    s.last = performance.now()
    s.lastY = window.scrollY
    // One frame per animation frame however many events arrive (pointermove can fire at 1 kHz; each
    // invalidate adds a frame in R3F's demand loop, so only the first since the last frame asks).
    const input = () => {
      s.inputAt = performance.now()
      if (s.kicked) return
      s.kicked = true
      invalidate()
    }
    // The cursor moves only her gaze: without her on screen a move needs no frame.
    const move = (e: PointerEvent) => {
      obs.pointer.x = e.clientX
      obs.pointer.y = e.clientY
      obs.pointer.on = e.pointerType === 'mouse'
      if (s.guideShown) input()
    }
    const leave = () => {
      obs.pointer.on = false
      if (s.guideShown) input()
    }
    // The contact form's focus: she looks toward the field (its centre, read once on focus).
    const focus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null
      const form = el?.closest?.('[data-window="contact"] form')
      if (form && el && el !== form) {
        const r = el.getBoundingClientRect()
        obs.formFocus = { x: r.left + Math.min(r.width / 2, 160), y: r.top + r.height / 2 }
      } else obs.formFocus = null
      input()
    }
    const blur = () => {
      obs.formFocus = null
      input()
    }
    // The paper reserves the porthole's margin (global.css reads the class and the gutter); the obstacles are measured after.
    const relayout = () => {
      const l = portholeLayout(window.innerWidth, window.innerHeight)
      s.layout = l
      const root = document.documentElement
      root.classList.toggle('porthole-margin', l.mode === 'margin')
      root.style.setProperty('--porthole-gutter', `${l.gutter}px`)
      measureObstacles()
      s.maxScroll = Math.max(0, root.scrollHeight - window.innerHeight)
      s.read.y = NaN
      input()
    }
    relayout()
    window.addEventListener('scroll', input, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', blur)
    const offWindows = onWindows(input)
    const offPulse = onPulse(input)
    const offReflow = onReflow(relayout)
    invalidate()
    return () => {
      window.removeEventListener('scroll', input)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('focusout', blur)
      document.documentElement.classList.remove('porthole-margin')
      offWindows()
      offPulse()
      offReflow()
      clearTimeout(s.timer)
      s.timer = 0
    }
  }, [gl, invalidate])

  // The quads' geometry and materials go with the world.
  useEffect(
    () => () => {
      for (const m of [well.mesh, ring.mesh, blit.mesh, port.bg, port.mask, port.fade]) {
        m.geometry.dispose()
        ;(m.material as { dispose(): void }).dispose()
      }
      for (const c of skies.values()) c.rt.dispose()
      skies.clear()
    },
    [well, ring, blit, skies, port],
  )

  useFrame(() => {
    const s = t.current
    const now = performance.now()
    const t0 = now
    frames.n++
    s.kicked = false
    const gap = now - s.last
    // The render scale follows the frames (a change re-allocates the canvas once). Started after a second: by then the renderer's dpr is settled.
    if (!s.governor && obs.clock > 1) s.governor = createGovernor(gl.getPixelRatio(), now)
    const scale = s.governor ? stepGovernor(s.governor, gap, s.period, now) : null
    if (scale !== null) onDpr(scale)
    const dt = Math.min(0.1, gap / 1000)
    s.last = now
    obs.clock += dt
    nav.clock = obs.clock
    const still = obs.still
    nav.still = still

    // The scroll: one number, and its speed in screens per second.
    const y = window.scrollY
    const raw = dt > 0 ? (y - s.lastY) / size.height / dt : 0
    s.lastY = y
    nav.scrollV += (Math.max(-6, Math.min(6, raw)) - nav.scrollV) * (1 - Math.exp(-SCROLL_V_DAMP * dt))
    if (Math.abs(nav.scrollV) < 0.005) nav.scrollV = 0

    const viewport = s.viewport
    viewport.w = size.width
    viewport.h = size.height
    const windows = getWindows()
    // The load device starts the first time a hero window is on screen; still frames are the final state.
    if (s.bendStart < 0 && windows.some((w) => w.kind === 'hero' && onScreen(w.rect, y, viewport, w.sticky))) s.bendStart = now
    const bend = still ? 1 : s.bendStart < 0 ? 0 : bendAt(now - s.bendStart)
    const glow = still ? 0 : glowAt(obs.clock, obs.glowAt)
    const hole = holeFor(obs.station)

    // The stage's bands: the hold forms them one by one (LAYERS_N over ORBIT_END of the hold, inOrbit's
    // count plus the fraction of the next); the picker keeps the chosen lit and dims the rest to 20 %.
    const picked = pickedLayers()
    const lit = ring.uniforms.uLit.value
    for (let k = 0; k < LAYERS_N; k++) lit[k] = picked ? (picked.includes(k) ? 1 : 0.2) : 1
    const bandsAt = still ? LAYERS_N : Math.min(LAYERS_N, obs.hold / ORBIT_END * LAYERS_N)

    // The canvas is cleared by whatever draws first; with nothing to draw it is cleared once and left alone.
    let cleared = false
    const clearOnce = () => {
      if (cleared) return
      cleared = true
      gl.setScissorTest(false)
      gl.setViewport(0, 0, size.width, size.height)
      gl.clear(true, true, false)
    }
    const pixelRatio = gl.getPixelRatio()
    const guide = handle.group
    if (guide) guide.visible = false
    type Framed = { view: Rect; rect: Rect; g: NonNullable<ReturnType<typeof getWindows>[number]['framing']['guide']> }
    let hero = null as Framed | null
    let contact = null as Framed | null
    for (const w of windows) {
      const g = w.framing.guide
      const view = onScreen(w.rect, y, viewport, w.sticky)?.view ?? { x: w.rect.x, y: w.rect.y - y, w: w.rect.w, h: w.rect.h }
      if (w.kind === 'hero' && g) hero = { view, rect: w.rect, g }
      if (w.kind === 'contact' && g) contact = { view, rect: w.rect, g }
      const on = onScreen(w.rect, y, viewport, w.sticky)
      if (!on) continue
      clearOnce()
      const { clip } = on
      const vp = toGl(on.view, size.height, 1)
      const sc = toGl(clip, size.height, 1)
      gl.setViewport(vp.x, vp.y, vp.w, vp.h)
      gl.setScissor(sc.x, sc.y, sc.w, sc.h)
      gl.setScissorTest(true)

      // The flat pass: the well and the ring in window px (y down).
      const f = w.framing
      // The stage's close: across the hold's last tenth the ring shrinks toward the gauge's marker at the
      // window's left edge (station 05, the picker, is 4/9 down the rule); the well's centre travels with it.
      const hv = w.kind === 'stage' ? obs.handover : 0
      const rx = f.ring.x + (6 - f.ring.x) * hv
      const ry = f.ring.y + (on.view.h * (4 / 9) - f.ring.y) * hv
      const rr = f.ring.r * (1 - 0.96 * hv)
      ortho.left = 0
      ortho.right = on.view.w
      ortho.top = 0
      ortho.bottom = on.view.h
      ortho.updateProjectionMatrix()
      fitWell(well.mesh, well.uniforms, on.view.w, on.view.h)
      well.uniforms.uCentre.value[0] = rx
      well.uniforms.uCentre.value[1] = ry
      well.uniforms.uSigma.value = f.sigma * (1 - 0.9 * hv)
      well.uniforms.uPull.value = f.pull
      well.uniforms.uBend.value = w.kind === 'hero' ? bend : 1
      well.uniforms.uHole.value = rr * hole
      well.uniforms.uFade.value = f.fade
      well.uniforms.uRadius.value = FRAME_RADIUS
      well.uniforms.uCell.value = GRID_CELL
      // The sky behind her (hero, contact): stars and planets lensed by the hole, the infall, the grid's breath.
      well.uniforms.uSky.value = w.kind === 'stage' ? 0 : 1
      well.uniforms.uRing.value = rr
      well.uniforms.uTime.value = still ? 0 : obs.clock
      drawWell(w.id, on.view, vp, sc)
      fitRing(ring.mesh, ring.uniforms, rx, ry, rr)
      ring.uniforms.uGlow.value = glow
      ring.uniforms.uTime.value = still ? 0 : obs.clock
      ring.uniforms.uBands.value = w.kind === 'stage' ? bandsAt * (1 - hv) : 0
      ring.uniforms.uRipple.value = w.kind === 'stage' ? 0 : w.kind === 'contact' ? 1.4 : 1
      gl.render(ring.scene, ortho)
    }
    // A copy off screen for a while gives its memory back.
    for (const [id, c] of skies) {
      if (now - c.seen < SKY_KEEP_MS) continue
      c.rt.dispose()
      skies.delete(id)
    }

    /** The well for this window: its copy, shaded again when the sky is due or anything but the clock changed. */
    function drawWell(id: string, view: Rect, vp: Rect, sc: Rect) {
      const u = well.uniforms
      const rw = Math.ceil(view.w * pixelRatio)
      const rh = Math.ceil(view.h * pixelRatio)
      if (rw * rh > SKY_MAX_PX) {
        gl.render(well.scene, ortho)
        return
      }
      let c = skies.get(id)
      if (c && (c.rt.width !== rw || c.rt.height !== rh)) {
        c.rt.dispose()
        skies.delete(id)
        c = undefined
      }
      if (!c) {
        c = { rt: new WebGLRenderTarget(rw, rh, { depthBuffer: false, stencilBuffer: false, generateMipmaps: false, minFilter: NearestFilter, magFilter: NearestFilter }), sig: [], at: -Infinity, seen: now }
        skies.set(id, c)
      }
      c.seen = now
      const sig = [u.uCentre.value[0], u.uCentre.value[1], u.uSigma.value, u.uPull.value, u.uBend.value, u.uHole.value, u.uFade.value, u.uSky.value, u.uRing.value, view.w, view.h]
      const before = c.sig
      const moved = sig.some((v, i) => v !== before[i])
      const due = u.uSky.value > 0 && !still && now - c.at >= 1000 / SKY_HZ
      if (moved || due) {
        c.sig = sig
        c.at = now
        gl.setRenderTarget(c.rt)
        // The clear value is whatever the last render left (the environment's capture leaves it opaque).
        gl.setClearColor(0x000000, 0)
        gl.clear(true, false, false)
        gl.render(well.scene, ortho)
        gl.setRenderTarget(null)
      }
      // 1:1 onto device pixels (the viewport is in CSS px; the renderer multiplies it back).
      const dx = Math.floor(view.x * pixelRatio)
      const dy = Math.floor((size.height - view.y - view.h) * pixelRatio)
      gl.setViewport(dx / pixelRatio, dy / pixelRatio, rw / pixelRatio, rh / pixelRatio)
      blit.uTex.value = c.rt.texture
      blit.mesh.position.set(view.w / 2, view.h / 2, 0)
      blit.mesh.scale.set(view.w, view.h, 1)
      gl.render(blit.scene, ortho)
      gl.setViewport(vp.x, vp.y, vp.w, vp.h)
      gl.setScissor(sc.x, sc.y, sc.w, sc.h)
    }

    // The porthole's pass: she is drawn ONLY here, framed as the hero (t 0), docked as a bust (t 1 … q 0) or framed as the contact (q 1).
    // Reading: the guide's line nearest the porthole (or the window's own), swept left to right at the typing pace.
    const read = readingPoint(s.read, size.height, obs.clock, still, y, now)
    const guideShown = guide ? drawGuide() : false
    gl.setScissorTest(false)
    s.guideShown = guideShown
    if (!guideShown) nav.anchor.on = false
    // Nothing of the world on screen: one clear, then the canvas leaves the compositor (and no GL call is made) until something shows.
    const drew = cleared
    if (!drew && s.drew) clearOnce()
    s.drew = drew
    if (drew !== s.shown) {
      s.shown = drew
      gl.domElement.style.visibility = drew ? '' : 'hidden'
    }

    function drawGuide(): boolean {
      const base = s.layout ?? portholeLayout(size.width, size.height)
      // Level with the line it reads (eyes just below its last line), eased on a slow spring; clamped on screen.
      let l = base
      if (base.mode === 'margin') {
        const lo = 64 + 1.0 * base.d
        const hi = size.height - 20 - base.d / 2
        const want = read.host ? Math.min(hi, Math.max(lo, read.bottom + 14 + BUST_EYE_DROP * base.d)) : base.cy
        if (!Number.isFinite(s.cy) || still) {
          s.cy = want
          s.cyV = 0
        } else [s.cy, s.cyV] = springStep(s.cy, s.cyV, want, 2.2, dt)
        l = { ...base, cy: s.cy }
      }
      const hidden = l.mode === 'hidden'
      const maxScroll = s.maxScroll
      let tH = hero ? heroContraction(y, hero.rect.h) : 1
      let qC = contact ? contactExpansion(contact.view.y, l, contactSpan(contact.rect.y, l, maxScroll)) : 0
      if (still) {
        // Reduced motion: no scale animation; the porthole is there or it is not.
        tH = tH >= 0.5 ? 1 : 0
        qC = qC >= 0.5 ? 1 : 0
      }
      // Which dark window the opening belongs to, and how far into the porthole it is (k: 0 window … 1 docked).
      const win = qC > 0 && contact ? contact : tH < 1 && hero ? hero : null
      const k = win === contact ? 1 - qC : win ? tH : 1
      if (hidden && (!win || k > 0)) return false
      const frameR = FRAME_RADIUS
      const ap = win ? apertureBetween(win.view, l, hidden ? 0 : k, frameR) : apertureBetween({ x: l.cx - l.d / 2, y: l.cy - l.d / 2, w: l.d, h: l.d }, l, 1, frameR)
      const col = hidden ? Infinity : paperColumn(l, size.width)
      // On screen at all?
      let sx0 = Math.max(0, ap.x)
      let sy0 = Math.max(0, ap.y)
      let sx1 = Math.min(size.width, ap.x + ap.w)
      let sy1 = Math.min(size.height, ap.y + ap.h)
      if (sx1 <= sx0 || sy1 <= sy0) return false

      // Stepping aside: when docked over the paper, a word or a disc in its way fades it (opacity only).
      let target = 1
      if (k >= 1 && !hidden) {
        nearText.length = 0
        nearDiscs.length = 0
        let n = 0
        const x0 = l.cx - l.d
        for (const o of obstacles.text) {
          if (o.rect.x + o.rect.w < x0) continue
          const v = viewOf(o, y, scratch[n % scratch.length])
          if (v.y > l.cy + l.d || v.y + v.h < l.cy - 1.4 * l.d) continue
          nearText.push(v)
          n++
        }
        for (const o of obstacles.discs) {
          const v = viewOf(o, y, scratch[n % scratch.length])
          n++
          nearDiscs.push({ x: v.x + v.w / 2, y: v.y + v.h / 2, r: Math.min(v.w, v.h) / 2 })
        }
        // The head out of the hole (above the circle) keeps clear too.
        const head = { x: l.cx - l.d / 2, y: l.cy - 1.25 * l.d, w: l.d, h: 0.75 * l.d }
        if (portholeBlocked(l, nearText, nearDiscs) || nearText.some((r) => r.x < head.x + head.w && r.x + r.w > head.x && r.y < head.y + head.h && r.y + r.h > head.y)) target = 0
      }
      s.opacity = stepFade(s.opacity, target, dt, still)
      if (s.opacity <= 0.002) return false

      // The bust inside it, eased from the window's framing (her eyes and height in viewport px).
      const bust = bustPlace(l)
      let place = { x: bust.x, y: bust.y, figurePx: bust.figurePx, facing: bust.facing, pitch: bust.pitch }
      if (win) {
        // She is either framed by the window (scrolling with it) or the porthole's bust (fading in on the paper):
        // never a scaled in-between figure (no floating whole body, no half shapes).
        const kk = !hidden && k >= 0.75 ? 1 : 0
        const ex = 1 - (1 - kk) ** 3
        const ey = ease(kk)
        const wx = win.view.x + win.g.x
        const wy = win.view.y + win.g.y
        place = {
          x: lerp(wx, bust.x, ex),
          y: lerp(wy, bust.y, ey),
          figurePx: Math.exp(lerp(Math.log(win.g.figurePx), Math.log(bust.figurePx), ey)),
          // In the contact window she turns toward the closing line and the form on her left.
          facing: lerp(win === contact ? -60 : 0, bust.facing, ey),
          pitch: lerp(0, bust.pitch, ey),
        }
        // Both ear blades stay inside the window while she is framed by it (they reach ~1.5 heads right of the eyes).
        if (kk < 1) place.x = Math.min(place.x, win.view.x + win.view.w - 2.1 * win.g.headPx * (place.figurePx / win.g.figurePx))
      }

      // Uniforms in device px (GL y up).
      const H = size.height
      const px = gl.getPixelRatio()
      const u = port.uniforms
      u.uBox.value = [ap.x * px, (H - ap.y - ap.h) * px, ap.w * px, ap.h * px]
      u.uR.value = ap.r * px
      u.uWin.value = win ? [win.view.x * px, (H - win.view.y - win.view.h) * px, win.view.w * px, win.view.h * px] : [0, 0, 0, 0]
      u.uCol.value = col * px
      const kk = win ? k : 1
      const scale = place.figurePx / bust.figurePx
      u.uHalo.value = [(place.x - 0.2 * l.d * scale) * px, (H - (place.y - 0.04 * l.d * scale)) * px, 0.27 * l.d * scale * px]
      u.uHaloOn.value = ease(Math.min(1, kk * 1.4))
      // Over a dark window its own sky shows (no dark box, no rim); the rim draws only once it is a circle on the paper.
      u.uRim.value = ease(Math.max(0, (kk - 0.85) / 0.15))
      u.uOverWin.value = 0
      // Docked: the head comes out of the hole above the neck line (within the gutter), a soft shadow on the rim under it.
      const out = l.mode === 'margin' ? ease(Math.min(1, Math.max(0, (kk - 0.4) / 0.3))) : 0
      u.uHeadOut.value = out
      u.uNeck.value = (H - (l.cy - 0.12 * l.d)) * px
      u.uCircle.value = [l.cx * px, (H - l.cy) * px, (l.d / 2) * px]
      // The figure fades over 40 px across the paper column's edge while the opening travels (no hard cut).
      u.uRamp.value = 40 * (1 - ease(kk)) * px
      // The porthole over the paper appears (and leaves) on a 300 ms fade once docked enough: never a half-transparent pose at rest.
      s.paper = stepFade(s.paper, kk >= 0.75 ? 1 : 0, dt, still)
      u.uBgOn.value = ease(s.paper)
      u.uWinOpen.value = win && !(k >= 0.75) ? 1 : 0
      // Whichever dark window is on screen: the fade pass leaves its sky alone.
      const keep = [hero, contact].find((w) => w && w.view.y < H && w.view.y + w.view.h > 0)
      u.uKeep.value = keep ? [keep.view.x * px, (H - keep.view.y - keep.view.h) * px, keep.view.w * px, keep.view.h * px] : [0, 0, 0, 0]
      u.uPx.value = px
      u.uTime.value = still ? 0 : obs.clock
      // The docked circle is always inside the scissor (the bust is clipped by its circle, never by a box edge).
      sx0 = Math.max(0, Math.min(sx0, l.cx - l.d / 2 - 2))
      sy0 = Math.max(0, Math.min(sy0, l.cy - l.d / 2 - 2))
      sx1 = Math.min(size.width, Math.max(sx1, l.cx + l.d / 2 + 2))
      sy1 = Math.min(size.height, Math.max(sy1, l.cy + l.d / 2 + 2))
      // Inside a dark window she is clipped by the window only: the scissor covers its on-screen part too.
      if (win) {
        sx0 = Math.max(0, Math.min(sx0, win.view.x))
        sy0 = Math.max(0, Math.min(sy0, win.view.y))
        sx1 = Math.min(size.width, Math.max(sx1, win.view.x + win.view.w))
        sy1 = Math.min(size.height, Math.max(sy1, win.view.y + win.view.h))
      }
      // The head out of the hole: the scissor reaches up the gutter above the circle.
      if (l.mode === 'margin' && kk > 0.4) {
        sy0 = Math.max(0, Math.min(sy0, l.cy - 1.3 * l.d))
        sx0 = Math.max(0, Math.min(sx0, col))
        sx1 = size.width
      }
      // Framed by a dark window at rest, the three porthole quads change no pixel: the background and
      // the shadow have no alpha, every pixel of the window passes the mask and the fade multiplies
      // by 1, and what lies outside the window is theirs to erase. She is scissored to the window instead.
      const framed = win !== null && u.uWinOpen.value > 0.5 && u.uBgOn.value <= 0 && out <= 0 && s.opacity >= 0.999
      if (win && framed) {
        sx0 = Math.max(0, win.view.x)
        sy0 = Math.max(0, win.view.y)
        sx1 = Math.min(size.width, win.view.x + win.view.w)
        sy1 = Math.min(size.height, win.view.y + win.view.h)
        if (sx1 <= sx0 || sy1 <= sy0) return false
      }
      clearOnce()
      const scx = framed ? Math.round(sx0 * px) / px : Math.floor(sx0)
      const scy = framed ? Math.round((H - sy1) * px) / px : Math.floor(H - sy1)
      const scw = framed ? Math.round(sx1 * px) / px - scx : Math.ceil(sx1) - scx
      const sch = framed ? Math.round((H - sy0) * px) / px - scy : Math.ceil(H - sy0) - scy
      gl.setViewport(0, 0, size.width, size.height)
      gl.setScissor(scx, scy, scw, sch)
      gl.setScissorTest(true)
      if (!framed) gl.render(portScenes.bg, ortho)
      gl.clearDepth()
      if (!framed) gl.render(portScenes.mask, ortho)

      // Her: the whole viewport is the camera's view; the mask clips her to the opening.
      const view = { x: 0, y: 0, w: size.width, h: size.height }
      handle.systems(false)
      fitGuideCamera(persp, size.width, size.height)
      if (!placeGuide(handle, { ...place, bank: 0, key: -1 }, view, persp)) return false
      guide!.visible = true
      gl.render(scene, persp)
      guide!.visible = false
      u.uOpacity.value = s.opacity
      if (!framed && (s.opacity < 0.999 || u.uRamp.value > 0.5 || out > 0 || u.uBgOn.value < 0.999)) gl.render(portScenes.fade, ortho)

      // Her life's inputs for the next step.
      const mode = win === contact && qC > 0.5 ? 'contact' : win === hero && tH < 0.5 ? 'hero' : 'porthole'
      const i = handle.input
      i.mode = mode
      i.station = obs.station
      i.depth = Math.min(1, Math.max(0, (obs.station - 1 + obs.progress) / (STATIONS - 1)))
      i.pointer = obs.pointer
      i.eyes.x = nav.anchor.eyes.x
      i.eyes.y = nav.anchor.eyes.y
      i.viewport.w = size.width
      i.viewport.h = size.height
      i.focus = obs.formFocus
      i.read = read.host ? { x: read.x, y: read.y } : null
      i.nodAt = s.read.nodAt
      i.sentAt = obs.transmitAt
      // The strips: the band forming on the stage (root → crown), warm gold elsewhere on the paper, as authored in the windows.
      const stage = obs.station >= 3 && obs.station <= 5
      const c = stage ? TINT.set(CHAKRAS[Math.min(6, Math.floor(bandsAt))].color) : TINT.setRGB(GOLD[0], GOLD[1], GOLD[2])
      i.tint[0] = c.r
      i.tint[1] = c.g
      i.tint[2] = c.b
      i.tintMix = ease(Math.min(1, kk * 1.5))
      return true
    }

    // The next frame: while something moves (the bend, a pulse, the scroll settling, her life while she shows), at once; else none.
    const sinceInput = (now - s.inputAt) / 1000
    const alive = guideShown && handle.moving()
    const sky = windows.some((w) => w.kind !== 'stage' && onScreen(w.rect, y, viewport, w.sticky))
    const fading = s.opacity > 0.002 && s.opacity < 0.998
    const moving = (!still && (bend < 1 || glow > 0 || Math.abs(nav.scrollV) > 0 || sinceInput < INPUT_HOLD_S || sky)) || alive || fading
    if (PROFILE) frames.why = moving ? `bend${bend < 1 ? 1 : 0} glow${glow > 0 ? 1 : 0} scroll${nav.scrollV !== 0 ? 1 : 0} input${sinceInput < INPUT_HOLD_S ? 1 : 0} guide${alive ? 1 : 0}` : 'idle'
    if (moving) {
      // At every animation frame while the reader acts or something travels; at rest only the sky and her slow life move.
      const pose = handle.pose
      const turning = guideShown && !!pose && Math.abs(pose.yawV) + Math.abs(pose.pitchV) > TURNING
      const acting = still || bend < 1 || glow > 0 || Math.abs(nav.scrollV) > 0 || sinceInput < INPUT_HOLD_S || fading || turning
      if (acting) {
        s.period = 0
        if (!s.kicked) {
          s.kicked = true
          invalidate()
        }
      } else {
        s.period = idlePeriodMs(sinceInput)
        // Early by a few ms: the timer only asks, the next animation frame draws, so the rate holds on the display's grid.
        if (!s.timer) s.timer = window.setTimeout(() => {
          s.timer = 0
          if (s.kicked) return
          s.kicked = true
          invalidate()
        }, Math.max(0, s.period - (performance.now() - now) - 6))
      }
    } else s.period = 0

    if (PROFILE) {
      s.ms += performance.now() - t0
      s.frames++
      s.since += dt
      if (s.since >= 2) {
        console.info(`[observatory] frame ${(s.ms / s.frames).toFixed(2)} ms cpu mean over ${s.frames} frames in ${s.since.toFixed(1)} s (${(s.frames / s.since).toFixed(0)} fps), dpr ${gl.getPixelRatio()}`)
        s.ms = 0
        s.frames = 0
        s.since = 0
      }
    }
  }, 1)

  return null
}

export default function World() {
  const { enabled } = useMotion()
  const handle = useMemo(createGuideHandle, [])
  const [dpr, setDpr] = useState<number | [number, number]>([1, DPR_MAX])
  useEffect(() => {
    obs.still = !enabled
  }, [enabled])
  useEffect(() => {
    // The figure pipeline reads the cursor from nav: one object for both.
    nav.pointer = obs.pointer
    // The still hands over only once her first frame is on screen (the world's ready), and fades
    // (Window.module.css): flipping it at mount showed an empty ring until her GLB arrived.
    // Not before the grid's load bend (BEND_MS from the first frame) has ended: the still shows it finished.
    const since = performance.now()
    let wait = 0
    const off = onWorldReady(() => {
      wait = window.setTimeout(() => {
        markHandover()
        document.documentElement.classList.add('gl-live')
      }, Math.max(0, BEND_MS + 100 - (performance.now() - since)))
    })
    return () => {
      off()
      clearTimeout(wait)
      document.documentElement.classList.remove('gl-live')
    }
  }, [])
  if (PROFILE) (globalThis as Record<string, unknown>).__obsWorld = { nav, frames }
  return createPortal(
    <div className="obs-world" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas
        frameloop="demand"
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          const name = rendererName(gl)
          if (INTEGRATED.test(name)) setDpr(1)
          // The driver's logs are never read in production, and asking for them waits on every link.
          if (import.meta.env.PROD) gl.debug.checkShaderErrors = false
          if (PROFILE) console.info(`[observatory] renderer ${name}: dpr ${INTEGRATED.test(name) ? 1 : `1 … ${DPR_MAX}`}`)
        }}
      >
        <Guide handle={handle} />
        <Passes handle={handle} onDpr={setDpr} />
      </Canvas>
    </div>,
    document.body,
  )
}

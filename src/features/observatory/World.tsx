import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Group, OrthographicCamera } from 'three'
import { useMotion } from '../../motion/MotionProvider'
import { onPulse } from '../../motion/pulse'
import { needs } from '../../content/shared'
import { LAYERS, nav } from '../navigator/state'
import { ORBIT_END } from './orbit'
import { obs } from './state'

/** The picker's choice as her layers (indices 0 … 6), or null. */
export const pickedLayers = () => (obs.picker ? (obs.picker === 'all' ? LAYERS : needs[obs.picker].layers).map((l) => LAYERS.indexOf(l)) : null)
import { createRing, fitRing, glowAt } from './shaders/ring'
import { createWell, fitWell } from './shaders/well'
import { bendAt, FRAME_RADIUS, getWindows, GRID_CELL, holeFor, onScreen, onWindows, toGl } from './windows'
import { LAYERS_N } from './orbit'

/*
 * The Observatory's world: ONE fixed, full-viewport canvas behind the document, drawing the one
 * evolving object (the warped grid, the lensing ring and, on the stage, its seven bands) through
 * every registered window (windows.ts). Each window is rendered with gl viewport = the window's
 * own rect (so its picture scrolls with it) and gl scissor = the part of it on screen, through an
 * orthographic camera in the window's CSS px. The hole is the guide (art pass v1): the figure
 * pipeline (Guide.tsx, navigator/*) stays on disk but is not mounted, so no GLB is requested.
 *
 * frameloop="demand": a frame is drawn on scroll, reflow and while the load device or a pulse
 * plays, otherwise nothing runs.
 * dpr 1 … 1.25, lowered to 1 by the PerformanceMonitor when continuous frames fall under 40 fps.
 * `?profile` logs the frame's CPU time every 2 s. Nothing here reads layout: the scroll is one
 * number per frame, the rects come from the registry.
 */

const PROFILE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('profile')
/** Frames keep coming this long after the last input (the scroll's velocity settles). */
const INPUT_HOLD_S = 0.4
const SCROLL_V_DAMP = 8
/** The dpr cap for discrete GPUs; integrated ones (Intel UHD/Iris, Mali, Adreno, Apple) start and stay at 1. */
const DPR_MAX = 1.25
const INTEGRATED = /intel|uhd|iris|mali|adreno|apple|powervr/i

/** The GPU's name from the live context (no extra context is created). */
function rendererName(gl: { getContext(): WebGLRenderingContext | WebGL2RenderingContext }): string {
  const ctx = gl.getContext()
  const info = ctx.getExtension('WEBGL_debug_renderer_info')
  return String(info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : '')
}
/** Frames drawn so far (`?profile`: globalThis.__obsWorld.frames.n, for an idle-cost probe). */
const frames = { n: 0, why: '' }

function Passes() {
  const { gl, scene, size, invalidate } = useThree()
  const flat = useRef<Group>(null)
  const ortho = useMemo(() => new OrthographicCamera(0, 1, 0, 1, -10, 10), [])
  const well = useMemo(createWell, [])
  const ring = useMemo(createRing, [])
  const t = useRef({ last: 0, lastY: 0, bendStart: -1, inputAt: 0, frames: 0, ms: 0, since: 0, raf: 0, viewport: { w: 1, h: 1 } })

  useEffect(() => {
    gl.autoClear = false
    gl.setClearColor(0x000000, 0)
    const s = t.current
    s.last = performance.now()
    s.lastY = window.scrollY
    // One frame per animation frame however many events arrive (pointermove can fire at 1 kHz).
    const input = () => {
      s.inputAt = performance.now()
      if (!s.raf) s.raf = requestAnimationFrame(() => {
        s.raf = 0
        invalidate()
      })
    }
    // The cursor is kept for the page (obs.pointer); the object does not follow it, so no frame is due.
    const move = (e: PointerEvent) => {
      obs.pointer.x = e.clientX
      obs.pointer.y = e.clientY
      obs.pointer.on = e.pointerType === 'mouse'
    }
    window.addEventListener('scroll', input, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    const offWindows = onWindows(input)
    const offPulse = onPulse(input)
    invalidate()
    return () => {
      window.removeEventListener('scroll', input)
      window.removeEventListener('pointermove', move)
      offWindows()
      offPulse()
      cancelAnimationFrame(s.raf)
      s.raf = 0
    }
  }, [gl, invalidate])

  // The quads' geometry and materials go with the world.
  useEffect(
    () => () => {
      for (const m of [well.mesh, ring.mesh]) {
        m.geometry.dispose()
        ;(m.material as { dispose(): void }).dispose()
      }
    },
    [well, ring],
  )

  useFrame(() => {
    const s = t.current
    const now = performance.now()
    const t0 = now
    frames.n++
    const dt = Math.min(0.1, (now - s.last) / 1000)
    s.last = now
    obs.clock += dt
    nav.clock = obs.clock
    const still = obs.still
    nav.still = still

    // The scroll: one number, and its speed in screens per second (the wind in her hair).
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

    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
    gl.clear(true, true, false)
    for (const w of windows) {
      const on = onScreen(w.rect, y, viewport, w.sticky)
      if (!on) continue
      const { view, clip } = on
      const vp = toGl(view, size.height, 1)
      const sc = toGl(clip, size.height, 1)
      gl.setViewport(vp.x, vp.y, vp.w, vp.h)
      gl.setScissor(sc.x, sc.y, sc.w, sc.h)
      gl.setScissorTest(true)

      // The flat pass: the well and the ring in window px (y down).
      const f = w.framing
      // The stage's close: across the hold's last tenth the ring shrinks toward the gauge's marker at the
      // window's left edge (station 04 is 3/8 down the rule); the well's centre travels with it.
      const hv = w.kind === 'stage' ? obs.handover : 0
      const rx = f.ring.x + (6 - f.ring.x) * hv
      const ry = f.ring.y + (view.h * 0.375 - f.ring.y) * hv
      const rr = f.ring.r * (1 - 0.96 * hv)
      ortho.left = 0
      ortho.right = view.w
      ortho.top = 0
      ortho.bottom = view.h
      ortho.updateProjectionMatrix()
      fitWell(well.mesh, well.uniforms, view.w, view.h)
      well.uniforms.uCentre.value[0] = rx
      well.uniforms.uCentre.value[1] = ry
      well.uniforms.uSigma.value = f.sigma * (1 - 0.9 * hv)
      well.uniforms.uPull.value = f.pull
      well.uniforms.uBend.value = w.kind === 'hero' ? bend : 1
      well.uniforms.uHole.value = rr * hole
      well.uniforms.uFade.value = f.fade
      well.uniforms.uRadius.value = FRAME_RADIUS
      well.uniforms.uCell.value = GRID_CELL
      fitRing(ring.mesh, ring.uniforms, rx, ry, rr)
      ring.uniforms.uGlow.value = glow
      ring.uniforms.uTime.value = still ? 0 : obs.clock
      ring.uniforms.uBands.value = w.kind === 'stage' ? bandsAt * (1 - hv) : 0
      if (flat.current) flat.current.visible = true
      gl.render(scene, ortho)
      if (flat.current) flat.current.visible = false
    }
    gl.setScissorTest(false)

    // The next frame: while something moves (the bend, a pulse, the scroll settling), at once; else none.
    const sinceInput = (now - s.inputAt) / 1000
    const moving = !still && (bend < 1 || glow > 0 || Math.abs(nav.scrollV) > 0 || sinceInput < INPUT_HOLD_S)
    if (PROFILE) frames.why = moving ? `bend${bend < 1 ? 1 : 0} glow${glow > 0 ? 1 : 0} scroll${nav.scrollV !== 0 ? 1 : 0} input${sinceInput < INPUT_HOLD_S ? 1 : 0}` : 'idle'
    if (moving) invalidate()

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

  return (
    <group ref={flat} visible={false}>
      <primitive object={well.mesh} />
      <primitive object={ring.mesh} />
    </group>
  )
}

/**
 * The dpr governor: a decline counts only when the frames were continuous (a demand loop's gaps
 * are not slowness), and it is one-way: a machine that fell under 40 fps at the cap stays at 1.
 */
function Governor({ burst, onDpr }: { burst: () => number; onDpr: (dpr: number) => void }) {
  return <PerformanceMonitor ms={500} iterations={6} onDecline={() => burst() > 60 && onDpr(1)} />
}

export default function World() {
  const { enabled } = useMotion()
  const [dpr, setDpr] = useState<number | [number, number]>([1, DPR_MAX])
  const burstRef = useRef(0)
  useEffect(() => {
    obs.still = !enabled
  }, [enabled])
  useEffect(() => {
    document.documentElement.classList.add('gl-live')
    return () => document.documentElement.classList.remove('gl-live')
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
          if (PROFILE) console.info(`[observatory] renderer ${name}: dpr ${INTEGRATED.test(name) ? 1 : `1 … ${DPR_MAX}`}`)
        }}
      >
        <Governor burst={() => burstRef.current} onDpr={setDpr} />
        <Passes />
        <Burst to={burstRef} />
      </Canvas>
    </div>,
    document.body,
  )
}

/** Counts continuous frames (reset by a gap over 100 ms) for the governor. */
function Burst({ to }: { to: React.RefObject<number> }) {
  const last = useRef(0)
  useFrame(() => {
    const now = performance.now()
    to.current = now - last.current < 100 ? to.current + 1 : 0
    last.current = now
  })
  return null
}

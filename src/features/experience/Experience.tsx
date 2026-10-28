import { Preload } from '@react-three/drei'
import { advance, Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { chapters } from '../../content/shared'
import { gsap, ScrollTrigger } from '../../motion/gsap'
import { useMotion } from '../../motion/MotionProvider'
import { createDirector } from './director'
import { film } from './state'
import { colors, quality } from './tokens'
import { Studio } from './objects/Studio'
import { Bodies, CameraRig, Column, Hole, HOLE_R, Jet, Mote, Orbit, Stars } from './world/Acts'
import { ProductMark } from './world/Product'
import { Fragments } from './world/Fragments'

/**
 * The film's world: one fixed canvas behind the page. It never draws on its own clock: each
 * frame is advanced from the same ticker that moves Lenis, right after the scroll, so the
 * picture and the page always land in the same frame. Still mode (reduced motion, or motion
 * switched off) draws only when the story moves to another act.
 */
const parts = new URLSearchParams(location.search).get('parts')
const profile: number[] | null = new URLSearchParams(location.search).has('profile') ? ((window as unknown as { __film: number[] }).__film = []) : null
const has = (name: string) => !parts || parts.split(',').includes(name)

export default function Experience() {
  const { enabled } = useMotion()
  const [phone] = useState(() => window.matchMedia('(max-width: 699px)').matches)
  // A range: the screen's own pixel ratio, capped (a 1× screen renders at 1×, not at the cap).
  const cap = phone ? quality.dpr.phone : quality.dpr.desktop
  const [dpr, setDpr] = useState<[number, number]>([1, cap])

  useEffect(() => {
    film.still = !enabled
    film.portrait = window.innerWidth < window.innerHeight
    const director = createDirector()
    let dirty = true
    const remeasure = () => {
      film.portrait = window.innerWidth < window.innerHeight
      director.measure()
      dirty = true
    }
    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(0.1, deltaMs / 1000)
      const moved = director.update(dt)
      if (!film.still) film.clock += dt
      if (film.still && !moved && !dirty) return
      dirty = false
      const t0 = performance.now()
      advance(t0)
      // ?profile: CPU time of each frame's update and draw call (not the GPU's).
      if (profile) profile.push(performance.now() - t0)
    }
    gsap.ticker.add(tick)
    window.addEventListener('resize', remeasure)
    ScrollTrigger.addEventListener('refresh', remeasure)
    const reflow = new ResizeObserver(remeasure)
    reflow.observe(document.body)
    document.documentElement.classList.add('gl-live')
    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', remeasure)
      ScrollTrigger.removeEventListener('refresh', remeasure)
      reflow.disconnect()
      director.dispose()
      document.documentElement.classList.remove('gl-live')
    }
  }, [enabled])

  return createPortal(
    <div className="film-stage" aria-hidden="true">
      {/* Opaque: the canvas paints the paper itself. A transparent full-screen canvas is
          blended over the page by the compositor every frame, which halved the frame rate on
          an integrated GPU. No MSAA either: the pixel ratio smooths the edges. */}
      <Canvas
        frameloop="never"
        dpr={dpr}
        camera={{ position: [0, 0.6, 17], fov: phone ? 46 : 35, near: 0.1, far: 200 }}
        gl={{ alpha: false, antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(colors.paper, 1)
          // Integrated GPUs draw at a little under 1×: behind the words, on soft shapes, the
          // difference is hard to see, and it saves about a quarter of the pixels every frame.
          const ctx = gl.getContext()
          const info = ctx.getExtension('WEBGL_debug_renderer_info')
          const name = String(info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : '')
          if (/intel|uhd|iris|mali|adreno|powervr/i.test(name)) setDpr([0.75, quality.dpr.integrated])
          const forced = Number(new URLSearchParams(location.search).get('dpr'))
          if (forced > 0) setDpr([forced, forced])
        }}
      >
        {has('studio') && <Studio />}
        <directionalLight position={[4, 8, 8]} intensity={1.3} />
        <ambientLight intensity={0.5} />
        <CameraRig />
        {has('fragments') && <Fragments count={phone ? 240 : 560} />}
        {has('hole') && <Hole phone={phone} />}
        {has('column') && <Column />}
        {has('jet') && <Jet />}
        {has('stars') && <Stars layersOf={chapters.map((c) => c.layers)} />}
        {has('product') && <ProductMark radius={HOLE_R} />}
        {has('orbit') && <Orbit />}
        {has('bodies') && <Bodies />}
        {has('mote') && <Mote phone={phone} />}
        {/* Everything is compiled and uploaded once at load, so nothing stalls when it first appears. */}
        <Preload all />
      </Canvas>
    </div>,
    document.body,
  )
}

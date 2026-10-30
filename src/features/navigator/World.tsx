import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Vector3 } from 'three'
import { needs } from '../../content/shared'
import { useI18n } from '../../i18n'
import { gsap } from '../../motion/gsap'
import { useMotion } from '../../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../../motion/pulse'
import { Studio } from '../experience/objects/Studio'
import { Field, LensPaper } from './backdrops'
import { createDirector } from './director'
import Dock from './Dock'
import Transmission from './Transmission'
import { Figure, type FigureRig } from './figure/Figure'
import { LABEL_DY } from './figure'
import { lens } from './lens'
import { createLivingState, stepLiving, type LivingInput, type LivingState } from './living'
import { jawOpen } from './speech'
import { glide, poseFor, scaleFor, type Look, type PoseContext, type PoseKey } from './poses'
import { LAYERS, nav, type Beat } from './state'
import { CHAKRAS, yantraPath } from './yantra'

const pointer = nav.pointer
const LENS_R = 170
const damp = (from: number, to: number, l: number, dt: number) => from + (to - from) * (1 - Math.exp(-l * dt))
const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** The glide hands her to the dock badge this far in: she is under the header's bar by then, so nothing cuts mid-screen. */
/**
 * The hand-off between the world figure and the header badge happens under the header's bar
 * (the canvas sits below it), so she can glide almost all the way into the slot before the badge
 * takes over, and leave it as soon as she is a few pixels out: one object, never a cut.
 */
const HANDOFF = 0.94
/** A glide is 0.6 screens of scroll (screenplay v2). */
const GLIDE_SCREENS = 0.6

/**
 * The Navigator's place on the page, from poses.ts: each beat has her eyes' place on screen, her
 * head's height, her body's turn and what she watches. Between beats she glides along the field
 * (smoothstep over 0.6 screens of scroll, from the moment the beat changes), a pure function of
 * the scroll, so the move plays the same up and down. In the hero she walks to the dock as the
 * hero leaves; docked, the world's figure hides behind the header and the badge takes over.
 */
function Poses({ rig }: { rig: FigureRig }) {
  const { camera, size } = useThree()
  const cur = useRef({ x: 1.55, y: 0.35, s: 1, yaw: 0 })
  const first = useRef(true)
  useFrame((_, dt) => {
    const m = rig.metrics
    if (!m) return
    // The visible world at z = 0, in units.
    const fov = ((camera as { fov?: number }).fov ?? 30) * (Math.PI / 180)
    const vh = 2 * camera.position.z * Math.tan(fov / 2)
    const vw = vh * (size.width / size.height)
    const ctx: PoseContext = { portrait: nav.portrait, headHeight: m.headHeight, vhUnits: vh }
    // The dock as measured: the header's slot, the head filling most of it (poses.ts names the beat docked; the page says where).
    const d = nav.dock
    const dockPose = (look: Look): PoseKey => ({
      x: (d.x + d.w / 2) / size.width,
      y: (d.y + d.h * 0.45) / size.height,
      s: scaleFor((d.h * 0.8) / size.height, ctx),
      yaw: 0,
      look,
      docked: true,
    })
    const at = (beat: Beat): PoseKey => {
      const p = poseFor(beat, ctx)
      return p.docked ? dockPose(p.look) : p
    }
    // The hero's pose leaves with the hero: full at the start, docked by 60% of a screen.
    const heroAt = () => glide(at('hero'), dockPose('visitor'), nav.still ? (nav.leave >= 1 ? 1 : 0) : nav.leave)
    let from: PoseKey
    let to: PoseKey
    let t: number
    if (nav.beat === 'hero') {
      from = at('hero')
      to = dockPose('visitor')
      t = nav.leave
    } else {
      from = nav.prevBeat === 'hero' ? heroAt() : at(nav.prevBeat)
      to = at(nav.beat)
      t = clamp01(nav.enter / GLIDE_SCREENS)
    }
    if (nav.still) t = t >= 0.5 ? 1 : 0
    const pose = glide(from, to, t)
    const docked = from.docked && to.docked ? true : to.docked ? t >= HANDOFF : from.docked ? t <= 1 - HANDOFF : false
    // Her eyes at a share of the viewport → world units at z = 0 (x right, y down on screen).
    const target = { x: (pose.x - 0.5) * vw, y: (0.5 - pose.y) * vh - pose.s * m.eyeY, s: pose.s, yaw: pose.yaw }
    const c = cur.current
    if (nav.still || first.current) {
      Object.assign(c, target)
      first.current = false
    } else {
      // The target already eases with the scroll; a light damp only smooths the frame-to-frame steps.
      c.x = damp(c.x, target.x, 18, dt)
      c.y = damp(c.y, target.y, 18, dt)
      c.s = damp(c.s, target.s, 18, dt)
      c.yaw = damp(c.yaw, target.yaw, 6, dt)
    }
    // The systems beat opens the callouts beside her parts as the layers are named.
    rig.explode = nav.beat === 'systems' && !pose.docked ? Math.min(1, nav.progress * 1.15) : 0
    nav.look = pose.look
    nav.poseYaw = c.yaw
    // Docked (behind the header's bar): the badge takes over.
    nav.atDock = docked
    const g = rig.group
    if (g) {
      // Her eyes sit at z = 0, where the viewport's height was measured.
      g.position.set(c.x, c.y + rig.float * c.s, -c.s * m.headZ)
      g.scale.setScalar(c.s)
      g.visible = !docked
    }
  })
  return null
}

/** The X-ray lens follows the cursor (damped), in device pixels; the callouts follow their parts. */
function LensRig({ rig, labels, clip }: { rig: FigureRig; labels: React.RefObject<(HTMLDivElement | null)[]>; clip: React.RefObject<HTMLDivElement | null> }) {
  const { gl, size, camera } = useThree()
  const at = useRef({ x: size.width * 0.62, y: size.height * 0.5, r: 0 })
  const v = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-14 * dt)
    if (pointer.on) {
      at.current.x += (pointer.x - at.current.x) * k
      at.current.y += (pointer.y - at.current.y) * k
    }
    // The lens opens only over the large figure in the hero, within reach of her head and chest, never over the words.
    const g0 = rig.group
    let near = false
    if (g0 && pointer.on && nav.beat === 'hero' && !nav.still && !nav.atDock && nav.anchor.on) {
      const a = nav.anchor
      // Her reach on screen: round a point between the eyes and the chest, 1.3 head heights, plus half the lens.
      const reach = a.headPx * 1.3 * (1 + rig.explode) + LENS_R * 0.5
      near = Math.hypot(pointer.x - a.eyes.x, pointer.y - (a.eyes.y + a.headPx * 0.6)) < reach
    }
    at.current.r += ((near ? LENS_R : 0) - at.current.r) * (1 - Math.exp(-8 * dt))
    const dpr = gl.getPixelRatio()
    lens.value = [at.current.x * dpr, (size.height - at.current.y) * dpr, at.current.r * dpr]
    const g = rig.group
    if (!g) return
    const exploded = ease(rig.explode)
    // Exploded, the callouts stand open beside each part (no lens): the systems, named.
    const openWide = exploded > 0.6
    if (clip.current) {
      clip.current.style.clipPath = openWide ? 'none' : `circle(${at.current.r.toFixed(1)}px at ${at.current.x.toFixed(1)}px ${at.current.y.toFixed(1)}px)`
      clip.current.dataset.mode = openWide ? 'open' : 'lens'
    }
    rig.systems.forEach((sys, i) => {
      const el = labels.current?.[i]
      if (!el) return
      sys.getWorldPosition(v).project(camera)
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      // The label reaches back toward the lens (hero); exploded, every label stands to the right (the words are left).
      const left = openWide ? false : x > at.current.x
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      el.style.setProperty('--dy', `${openWide ? 0 : LABEL_DY[i]}px`)
      el.dataset.side = left ? 'left' : 'right'
    })
  })
  return null
}

/** The gravity field takes its centre from her heart (Sys_04) on the screen. */
function FieldRig({ rig }: { rig: FigureRig }) {
  const { camera } = useThree()
  const hole = useMemo(() => ({ x: 0.62, y: 0.5 }), [])
  const c = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const heart = rig.systems[3]
    if (!heart) return
    heart.getWorldPosition(c).project(camera)
    hole.x = (c.x + 1) / 2
    hole.y = (1 - c.y) / 2
  })
  return <Field hole={hole} />
}

/**
 * The Navigator's world: one fixed canvas behind the page, advanced from the same ticker that
 * moves the scroll, so the picture and the words land in the same frame. The page's sections
 * (data-beat) tell the director where the reader is; the world answers.
 */
export default function World() {
  const { enabled } = useMotion()
  const { t } = useI18n()
  const rig = useMemo<FigureRig>(() => ({ group: null, systems: [], metrics: null, explode: 0, assembled: 0, float: 0 }), [])
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const clip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    nav.still = !enabled
    const director = createDirector()
    // Her living systems: one step per frame after the director, from the moment she is on stage
    // (so the ignition root → crown plays when she appears, not while the GLB still downloads).
    let living: LivingState | null = null
    const input: LivingInput = {
      pointer: nav.pointer,
      anchor: nav.anchor,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      beat: nav.beat,
      progress: 0,
      spokeAt: 0,
      typingUntil: 0,
      transmitAt: 0,
      missionAt: 0,
      missionLayers: null,
      hover: nav.hover,
      still: false,
      clock: 0,
      dt: 0,
    }
    let missionFor: typeof nav.mission = null
    let patchFor: number[] | null = null
    // Her gaze: the thing the pose names (or the hovered card) stands in for the cursor, and for the visitor when no mouse is on the page.
    const gaze = { x: 0, y: 0, on: true }
    const tick = (_: number, deltaMs: number) => {
      const dt = Math.min(0.1, deltaMs / 1000)
      director.update(dt)
      if (!living) {
        if (!rig.metrics) return
        living = createLivingState(1, nav.clock + 0.3)
      }
      input.viewport.w = window.innerWidth
      input.viewport.h = window.innerHeight
      input.beat = nav.beat
      input.progress = nav.progress
      input.spokeAt = nav.spokeAt
      input.typingUntil = nav.typingUntil
      input.transmitAt = nav.transmitAt
      if (nav.mission !== missionFor || nav.hover.patchLayers !== patchFor) {
        missionFor = nav.mission
        patchFor = nav.hover.patchLayers
        input.missionLayers = patchFor ?? (missionFor ? missionFor.layers.map((l) => LAYERS.indexOf(l)) : null)
      }
      // A hovered patch lights the layers that mission used, in the chosen mission's place while it lasts.
      input.missionAt = patchFor ? nav.hover.at : (nav.mission?.at ?? 0)
      const look = nav.lookAt
      if (look && (nav.look !== 'visitor' || !nav.pointer.on)) {
        gaze.x = look.x
        gaze.y = look.y
        input.pointer = gaze
      } else input.pointer = nav.pointer
      input.still = nav.still
      input.clock = nav.clock
      input.dt = dt
      stepLiving(living, input, nav.perf)
      // The pose turns her body (a three-quarter view, a profile) on top of the living turn toward the cursor.
      nav.perf.body.yaw += nav.poseYaw
      nav.perf.jaw = nav.still ? 0 : jawOpen(nav.line.text, nav.line.typed, nav.clock, nav.line.from)
    }
    gsap.ticker.add(tick)
    // The mission chosen on the page lights the Navigator's systems.
    const setMission = (choice: PulseChoice) => {
      nav.mission = choice ? { id: choice, layers: choice === 'all' ? LAYERS : needs[choice].layers, at: nav.clock } : null
    }
    setMission(getPulse().choice)
    const offPulse = onPulse(setMission)
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.on = e.pointerType === 'mouse'
    }
    const leave = () => (pointer.on = false)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    document.documentElement.classList.add('gl-live')
    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      director.dispose()
      offPulse()
      document.documentElement.classList.remove('gl-live')
    }
  }, [enabled])

  return (
    <>
      <Dock />
      <Transmission />
      {createPortal(
    <div className="nav-stage" aria-hidden="true">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 8.6], fov: 30 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Studio warm="#ff7a3a" cool="#8fb6ff" base="#f2f0eb" />
        <directionalLight position={[3, 5, 6]} intensity={1.1} />
        <ambientLight intensity={0.35} />
        <FieldRig rig={rig} />
        <LensPaper />
        <Figure rig={rig} variant="world" />
        <Poses rig={rig} />
        <LensRig rig={rig} labels={labels} clip={clip} />
      </Canvas>
      {/* The callouts: through the lens in the hero, open beside the parts when exploded. */}
      <div className="nav-callouts" ref={clip} data-mode="lens">
        <div>
          {CHAKRAS.map((c, i) => (
            <div key={c.name} className="nav-callout" ref={(el) => void (labels.current[i] = el)} style={{ '--chakra': c.color } as CSSProperties}>
              <span className="nav-leader" />
              <span className="nav-tag">
                <svg viewBox="-1.1 -1.1 2.2 2.2" className="nav-yantra">
                  <path d={yantraPath(i)} />
                  <circle r="0.075" />
                </svg>
                <span>
                  <b>
                    0{i + 1} · {t.engine.layers[LAYERS[i]].name}
                  </b>
                  <small>
                    {c.part} · {c.name}
                  </small>
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
        document.body,
      )}
    </>
  )
}

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
import { EXPLODE, Helmet, LABEL_DY, SUBSYSTEMS, type HelmetRig } from './Helmet'
import { lens } from './lens'
import { LAYERS, nav } from './state'
import { CHAKRAS, yantraPath } from './yantra'

const pointer = { x: -9999, y: -9999, on: false }
const LENS_R = 170
const damp = (from: number, to: number, l: number, dt: number) => from + (to - from) * (1 - Math.exp(-l * dt))
const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)

/** Where the Navigator stands for each beat: in world units at z = 0 (x, y), his size, and how exploded. */
interface Pose {
  x: number
  y: number
  s: number
  explode: number
}

/**
 * The Navigator's place on the page. In the hero he stands large, right of the words. As the
 * hero scrolls out he walks to the dock (a slot in the header) and stays there as the reader's
 * companion. For the seven systems he comes to the centre and opens into his parts; for the
 * reply signal he comes to the form's side. Every move is damped: an arrival, never a cut.
 */
function Poses({ rig }: { rig: HelmetRig }) {
  const { camera, size } = useThree()
  const cur = useRef<Pose>({ x: 1.55, y: 0.35, s: 1, explode: 0 })
  const first = useRef(true)
  useFrame((_, dt) => {
    // The visible world at z = 0, in units.
    const fov = ((camera as { fov?: number }).fov ?? 30) * (Math.PI / 180)
    const vh = 2 * camera.position.z * Math.tan(fov / 2)
    const vw = vh * (size.width / size.height)
    const unit = vh / size.height // units per CSS px
    const phone = nav.portrait
    // Hero: large, right of the words (centred above them on phones). The figure is 5 units tall.
    const hero: Pose = phone ? { x: 0, y: vh * 0.22, s: 0.42, explode: 0 } : { x: vw * 0.2, y: 0.62, s: 0.64, explode: 0 }
    // Dock: the header's slot, as the world sees it.
    const d = nav.dock
    // At the dock only his head shows (the portrait the companion canvas frames): about 2.4 units tall.
    const dock: Pose = { x: (d.x + d.w / 2 - size.width / 2) * unit, y: (size.height / 2 - (d.y + d.h / 2) - d.h * 0.15) * unit, s: (d.h * unit) / 2.4, explode: 0 }
    let target: Pose
    if (nav.beat === 'hero') {
      const k = ease(nav.leave)
      target = { x: hero.x + (dock.x - hero.x) * k, y: hero.y + (dock.y - hero.y) * k, s: hero.s + (dock.s - hero.s) * k, explode: 0 }
    } else if (nav.beat === 'systems') {
      target = phone ? { x: 0, y: vh * 0.12, s: 0.3, explode: nav.progress } : { x: vw * 0.23, y: 0.35, s: 0.5, explode: Math.min(1, nav.progress * 1.15) }
    } else if (nav.beat === 'contact') {
      target = phone ? dock : { x: -vw * 0.3, y: -vh * 0.1, s: 0.36, explode: 0 }
    } else target = dock
    const c = cur.current
    if (nav.still || first.current || nav.beat === 'hero') {
      Object.assign(c, target)
      first.current = false
    } else {
      c.x = damp(c.x, target.x, 5, dt)
      c.y = damp(c.y, target.y, 5, dt)
      c.s = damp(c.s, target.s, 5, dt)
      c.explode = target.explode
    }
    rig.explode = c.explode
    // At rest in the dock (behind the header's bar): the docked companion takes over.
    nav.atDock = Math.hypot(c.x - dock.x, c.y - dock.y) < 0.03 && Math.abs(c.s - dock.s) < 0.01 && c.explode < 0.01
    const g = rig.group
    if (g) {
      g.position.set(c.x, c.y + rig.float * c.s, 0)
      g.scale.setScalar(c.s)
      g.visible = !nav.atDock
    }
  })
  return null
}

/** The X-ray lens follows the cursor (damped), in device pixels; the callouts follow their parts. */
function LensRig({ rig, labels, clip }: { rig: HelmetRig; labels: React.RefObject<(HTMLDivElement | null)[]>; clip: React.RefObject<HTMLDivElement | null> }) {
  const { gl, size, camera } = useThree()
  const at = useRef({ x: size.width * 0.62, y: size.height * 0.5, r: 0 })
  const v = useMemo(() => new Vector3(), [])
  const c = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-14 * dt)
    if (pointer.on) {
      at.current.x += (pointer.x - at.current.x) * k
      at.current.y += (pointer.y - at.current.y) * k
    }
    // The lens opens only over the large helmet in the hero, within reach of it, never over the words.
    const g0 = rig.group
    let near = false
    if (g0 && pointer.on && nav.beat === 'hero' && !nav.still && !nav.atDock) {
      c.set(0, 0, 0).applyMatrix4(g0.matrixWorld).project(camera)
      const hx = ((c.x + 1) / 2) * size.width
      const hy = ((1 - c.y) / 2) * size.height
      // The helmet's reach on screen: its radius in pixels (1.3 units at its scale), plus the lens.
      const fov = ((camera as { fov?: number }).fov ?? 30) * (Math.PI / 180)
      const pxPerUnit = size.height / (2 * camera.position.z * Math.tan(fov / 2))
      const reach = 2.2 * g0.scale.x * pxPerUnit * (1 + rig.explode) + LENS_R * 0.5
      near = Math.hypot(pointer.x - hx, pointer.y - hy) < reach
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
    SUBSYSTEMS.forEach((p, i) => {
      const el = labels.current?.[i]
      if (!el) return
      v.copy(p).addScaledVector(EXPLODE[i], exploded).applyMatrix4(g.matrixWorld).project(camera)
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

/** The gravity field takes its centre from the helmet's place on the screen. */
function FieldRig({ rig }: { rig: HelmetRig }) {
  const { camera } = useThree()
  const hole = useMemo(() => ({ x: 0.62, y: 0.5 }), [])
  const c = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const g = rig.group
    if (!g) return
    c.set(0, 0, 0).applyMatrix4(g.matrixWorld).project(camera)
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
  const rig = useMemo<HelmetRig>(() => ({ group: null, parts: [], explode: 0, assembled: 0, float: 0 }), [])
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const clip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    nav.still = !enabled
    const director = createDirector()
    const tick = (_: number, deltaMs: number) => director.update(Math.min(0.1, deltaMs / 1000))
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
        <Helmet rig={rig} />
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

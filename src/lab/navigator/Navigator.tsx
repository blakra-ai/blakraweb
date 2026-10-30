import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3, type Group } from 'three'
import { Studio } from '../../features/experience/objects/Studio'
import { Field, LensPaper } from './backdrops'
import { Helmet, LABEL_DY, SUBSYSTEMS } from './Helmet'
import { lens } from './lens'
import { CHAKRAS, yantraPath } from './yantra'

const pointer = { x: -9999, y: -9999, on: false }
const LENS_R = 170

/** The X-ray lens follows the cursor (damped), in device pixels; the callouts are clipped to it. */
function LensRig({ rig, labels, clip }: { rig: { group: Group | null }; labels: React.RefObject<(HTMLDivElement | null)[]>; clip: React.RefObject<HTMLDivElement | null> }) {
  const { gl, size, camera } = useThree()
  const at = useRef({ x: size.width * 0.62, y: size.height * 0.5, r: 0 })
  const v = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-14 * dt)
    if (pointer.on) {
      at.current.x += (pointer.x - at.current.x) * k
      at.current.y += (pointer.y - at.current.y) * k
    }
    at.current.r += ((pointer.on ? LENS_R : 0) - at.current.r) * (1 - Math.exp(-8 * dt))
    const dpr = gl.getPixelRatio()
    lens.value = [at.current.x * dpr, (size.height - at.current.y) * dpr, at.current.r * dpr]
    if (clip.current) clip.current.style.clipPath = `circle(${at.current.r.toFixed(1)}px at ${at.current.x.toFixed(1)}px ${at.current.y.toFixed(1)}px)`
    // Each callout sits beside its subsystem, pushed outward from the helmet's centre.
    const g = rig.group
    if (!g) return
    SUBSYSTEMS.forEach((p, i) => {
      const el = labels.current?.[i]
      if (!el) return
      v.copy(p).applyMatrix4(g.matrixWorld).project(camera)
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      // The label always reaches back into the lens, so it stays readable inside its circle.
      const left = x > at.current.x
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      el.style.setProperty('--dy', `${LABEL_DY[i]}px`)
      el.dataset.side = left ? 'left' : 'right'
    })
  })
  return null
}

/** The gravity field takes its centre from the helmet's place on the screen. */
function FieldRig({ rig }: { rig: { group: Group | null } }) {
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
 * Style frame for the new BLAKRA (the Navigator, .firm/runs/2026-10-29-blakra-identity/spec.md):
 * the hero only, at full quality. The helmet assembles, its visor reflects the black hole the
 * Navigator is looking at, the field's lines bend round the cursor, and the cursor is an X-ray
 * lens that shows the helmet's blueprint: seven subsystems, the seven yantras, the seven layers.
 */
export function Navigator() {
  const rig = useMemo(() => ({ group: null as Group | null }), [])
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const clip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.on = true
    }
    const leave = () => (pointer.on = false)
    window.addEventListener('pointermove', move)
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div className="nav-page">
      <div className="nav-stage">
        <Canvas dpr={[1, 2]} camera={{ position: [0, -0.35, 8.6], fov: 30 }} gl={{ antialias: true }}>
          <Studio warm="#ff7a3a" cool="#8fb6ff" base="#f2f0eb" />
          <directionalLight position={[3, 5, 6]} intensity={1.1} />
          <ambientLight intensity={0.35} />
          <FieldRig rig={rig} />
          <LensPaper />
          <Helmet rig={rig} x={1.55} y={0.35} />
          <LensRig rig={rig} labels={labels} clip={clip} />
        </Canvas>
      </div>

      {/* The callouts: only ever seen through the lens. */}
      <div className="nav-callouts" ref={clip} aria-hidden="true">
        {CHAKRAS.map((c, i) => (
          <div
            key={c.name}
            className="nav-callout"
            ref={(el) => {
              labels.current[i] = el
            }}
            style={{ '--chakra': c.color } as React.CSSProperties}
          >
            <span className="nav-leader" />
            <span className="nav-tag">
              <svg viewBox="-1.1 -1.1 2.2 2.2" className="nav-yantra">
                <path d={yantraPath(i)} />
                <circle r="0.075" />
              </svg>
              <span>
                <b>
                  0{i + 1} · {c.layer}
                </b>
                <small>
                  {c.part} · {c.name}
                </small>
              </span>
            </span>
          </div>
        ))}
      </div>

      <header className="nav-bar">
        <a className="nav-brand" href="#">
          <svg viewBox="0 0 24 16" aria-hidden="true">
            <path d="M2.2 9.2C4.6 4.2 19.4 4.2 21.8 9.2" fill="none" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.55" />
            <circle cx="12" cy="8" r="4.3" fill="currentColor" />
            <circle cx="12" cy="8" r="2.9" fill="#f2f0eb" />
            <path d="M1 9.6C4 12.6 20 12.6 23 9.6" fill="none" stroke="#ff5a1f" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          BLAKRA
        </a>
        <a className="nav-cta" href="#">
          Start a project
        </a>
      </header>

      <section className="nav-hero">
        <p className="nav-eyebrow">BLAKRA — Software with gravity.</p>
        <h1 className="nav-title">
          <span>We build what</span>
          <em>organizations run on.</em>
        </h1>
      </section>

      <aside className="nav-mission">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="nav-yantra">
          <path d={yantraPath(6)} />
          <circle r="0.075" />
        </svg>
        <span>
          <b>Mission control</b>
          <small>Founded 2024 · Reply within 24 hours</small>
        </span>
      </aside>

      <p className="nav-hint" aria-hidden="true">
        Move the cursor over the Navigator: see what he is made of.
      </p>
    </div>
  )
}

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { PerspectiveCamera } from 'three'
import { Studio } from '../experience/objects/Studio'
import { Figure, type FigureRig } from './figure/Figure'
import { nav } from './state'

/** How much of the header's slot her head fills. */
const HEAD_SHARE = 0.8

/**
 * The companion: the Navigator, docked in the header once the hero has scrolled out. A small
 * canvas of its own above the page, framing her head as a portrait from the same GLB, so she sits
 * over the header and nothing scrolls across her; the figure in the world walks to this slot and
 * hands over behind the header's bar. Docked, she keeps her gaze (the eyes follow the cursor),
 * blinks, flicks her ears and lights the systems of the mission the reader chose, because the
 * figure applies the one performance (`nav.perf`) wherever it is drawn.
 */
export default function Dock() {
  const rig = useMemo<FigureRig>(() => ({ group: null, parts: [], systems: [], metrics: null, explode: 0, assembled: 0, float: 0 }), [])
  const box = useRef<HTMLDivElement>(null)
  return createPortal(
    <div className="nav-dock" ref={box} aria-hidden="true">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.6, 1.2], fov: 40 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => gl.setClearAlpha(0)}>
        <Studio warm="#ff7a3a" cool="#8fb6ff" base="#f2f0eb" />
        <directionalLight position={[3, 5, 6]} intensity={1.1} />
        <ambientLight intensity={0.35} />
        <Figure rig={rig} variant="dock" />
        <Shown rig={rig} box={box} />
      </Canvas>
    </div>,
    document.body,
  )
}

/**
 * Visible while the world's figure rests at the dock (hidden behind the header). The camera is set
 * from her measurements: level with her eyes, far enough that her head fills HEAD_SHARE of the slot.
 */
function Shown({ rig, box }: { rig: FigureRig; box: React.RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree()
  const framed = useRef('')
  const sized = useRef('')
  useFrame(() => {
    const el = box.current
    if (!el) return
    const on = nav.atDock
    if (el.dataset.on !== String(on)) el.dataset.on = String(on)
    const d = nav.dock
    el.style.transform = `translate3d(${(d.x + d.w / 2).toFixed(1)}px, ${(d.y + d.h / 2).toFixed(1)}px, 0)`
    // The badge is the slot's size, so it never spills over the header's other controls.
    if (sized.current !== `${d.w}x${d.h}` && d.w > 0) {
      sized.current = `${d.w}x${d.h}`
      el.style.width = `${d.w}px`
      el.style.height = `${d.h}px`
      el.style.margin = `${-d.h / 2}px 0 0 ${-d.w / 2}px`
    }
    if (rig.group) {
      rig.group.position.set(0, 0, 0)
      rig.group.scale.setScalar(1)
    }
    const m = rig.metrics
    if (!m) return
    const key = `${d.h}:${size.height}:${m.headHeight}`
    if (framed.current === key) return
    framed.current = key
    // The head's height in the canvas is HEAD_SHARE of the slot's; the visible height at her face follows.
    const cam = camera as PerspectiveCamera
    const fov = (cam.fov ?? 40) * (Math.PI / 180)
    const visible = m.headHeight / ((HEAD_SHARE * d.h) / size.height)
    const dist = visible / (2 * Math.tan(fov / 2))
    cam.position.set(0, m.eyeY, m.headZ + dist)
    cam.lookAt(0, m.eyeY, m.headZ)
    cam.updateProjectionMatrix()
  })
  return null
}

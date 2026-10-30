import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Studio } from '../experience/objects/Studio'
import { Helmet, type HelmetRig } from './Helmet'
import { nav } from './state'

/**
 * The companion: the Navigator, docked in the header once the hero has scrolled out. A small
 * canvas of its own above the page, framing his head as a portrait, so he sits over the header
 * and nothing scrolls across him; the figure in the world walks to this slot and hands over
 * behind the header's bar. He follows the cursor with his gaze and lights the layers of the
 * mission the reader chose.
 */
export default function Dock() {
  const rig = useMemo<HelmetRig>(() => ({ group: null, parts: [], explode: 0, assembled: 1, float: 0 }), [])
  const box = useRef<HTMLDivElement>(null)
  return createPortal(
    <div className="nav-dock" ref={box} aria-hidden="true">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.2, 4.6], fov: 40 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => gl.setClearAlpha(0)}>
        <Studio warm="#ff7a3a" cool="#8fb6ff" base="#f2f0eb" />
        <directionalLight position={[3, 5, 6]} intensity={1.1} />
        <ambientLight intensity={0.35} />
        <Helmet rig={rig} />
        <Shown rig={rig} box={box} />
      </Canvas>
    </div>,
    document.body,
  )
}

/** Visible while the world's helmet rests at the dock (hidden behind the header), and at his dock size. */
function Shown({ rig, box }: { rig: HelmetRig; box: React.RefObject<HTMLDivElement | null> }) {
  useFrame(() => {
    const el = box.current
    if (!el) return
    const on = nav.atDock
    if (el.dataset.on !== String(on)) el.dataset.on = String(on)
    const d = nav.dock
    el.style.transform = `translate3d(${(d.x + d.w / 2).toFixed(1)}px, ${(d.y + d.h / 2).toFixed(1)}px, 0)`
    if (rig.group) {
      rig.group.position.set(0, -0.2, 0)
      rig.group.scale.setScalar(1)
    }
  })
  return null
}

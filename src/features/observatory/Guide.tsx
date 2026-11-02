import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type DirectionalLight, Group, MeshStandardMaterial, type Object3D, PerspectiveCamera, Vector3 } from 'three'
import { Studio } from '../experience/objects/Studio'
import { Figure, type FigureRig } from '../navigator/figure/Figure'
import { createLivingState, IGNITION_GAP, stepLiving, type LivingInput, type LivingState } from '../navigator/living'
import { pickedLayers } from './World'
import { jawOpen } from '../navigator/speech'
import { nav } from '../navigator/state'
import { obs } from './state'
import type { Framing, Rect } from './windows'

/*
 * The guide: the Navigator's figure from the navigator pipeline (loadFigure + Figure, variant
 * 'world'), mounted once in the world and drawn at the ring's rim of every window whose framing
 * has a place for her (hero, contact). Her life (gaze, blink, breath, the systems' light) is
 * living.ts stepped here once per frame into `nav.perf`, which Figure applies; her jaw follows
 * the line from `obs.line`; her hair spring is Figure's own. Where she stands is the world's
 * business (`placeGuide`, per window pass): this file only mounts and animates her.
 *
 * She is the Mecha roe deer (Osho, CC BY 4.0; src/assets/navigator/source/README.md), adopted as
 * src/assets/navigator/navigator.glb: a silver mecha standing full-length, her head cut from the
 * body at the neck so it turns toward the cursor, her light strips gold. Her idle here: the slow
 * float placeGuide applies, the head's turn (HEAD_REST_YAW keeps her face a slight three-quarter
 * toward the words; HEAD_GAIN widens the living step's share to ±10°, since her lenses cannot
 * move on their own) and the strips' pulse (STRIP_PULSE).
 */

export interface GuideHandle {
  rig: FigureRig
  /** Her outer group (placed per window); null until mounted. */
  group: Group | null
  living: LivingState | null
  /** Her eye nodes, found once under the loaded figure. */
  eyes: [Object3D, Object3D] | null
  /** The key light (from the ring's side) and the gold rim behind her: placeGuide turns them to the window's side. */
  key: DirectionalLight | null
  rim: DirectionalLight | null
  /** Show or hide her seven systems' lights (the chakra dots show only where layers are the subject: never in these windows). */
  systems: (on: boolean) => void
  /** The living step's wake-up times (clock s): the next blink and the next idle glance. */
  nextEvent: () => number
  /** True while something of hers is moving (a blink, a gaze settling, the lights): the world keeps the frames coming. */
  moving: () => boolean
}

export function createGuideHandle(): GuideHandle {
  const h: GuideHandle = {
    rig: { group: null, systems: [], metrics: null, explode: 0, assembled: 0, float: 0 },
    group: null,
    living: null,
    eyes: null,
    key: null,
    rim: null,
    systems: () => {},
    nextEvent: () => Infinity,
    moving: () => false,
  }
  h.nextEvent = () => {
    const l = h.living
    if (!l) return Infinity
    // Only what lies ahead: the idle glance exists only without a mouse on the page.
    let next = l.blink.phase === 'open' ? l.blink.nextAt : 0
    if (!obs.pointer.on && l.wander.nextAt > obs.clock) next = Math.min(next, l.wander.nextAt)
    return next
  }
  h.systems = (on) => {
    for (const o of h.rig.systems) o.visible = on
  }
  h.moving = () => {
    const l = h.living
    // Loaded but not yet alive (Figure mounts her a step after the living step): the next frame starts her.
    if (!l) return !!h.rig.metrics
    if (l.blink.phase !== 'open') return true
    // The ignition (root → crown, then her eyes open) plays whether or not the cursor moves.
    if (obs.clock < l.powerOn + 7 * IGNITION_GAP + 1.5) return true
    const p = nav.perf
    // The eyes or the lights still settling toward their targets.
    if (Math.abs(p.eyes.yaw - l.eyes.yaw) > 0.05 || Math.abs(p.head.yaw - l.head.yaw) > 0.05) return true
    for (let i = 0; i < 7; i++) if (Math.abs(p.sys[i] - l.sys[i]) > 0.01) return true
    // Her line still being typed (the jaw).
    return obs.line.text.length > 0 && obs.line.typed < obs.line.text.length
  }
  return h
}

const FOV = 30
const DEG = Math.PI / 180
/** The head carries the gaze: the living step gives the head a third of the eyes' ±12°; ×2.5 makes it ±10°. */
const HEAD_GAIN = 2.5
/** Her head's rest turn (degrees, negative toward the words): never dead frontal. */
const HEAD_REST_YAW = -15
/** Her light strips breathe about their rest intensity by this share, at this rate (Hz). */
const STRIP_PULSE = 0.1
const STRIP_HZ = 0.25
const STRIP_MATERIAL = /^(E_|Material\.002)/
/** The key light's stand-off on x (its side flips per window) and the fill's: world units are px here, the lights are directional. */
const KEY_X = 3

/** The camera that draws a window of w × h px with world units = CSS px at z = 0. */
export function fitGuideCamera(camera: PerspectiveCamera, w: number, h: number) {
  camera.fov = FOV
  camera.aspect = w / h
  camera.near = 1
  camera.far = 20000
  camera.position.set(0, 0, h / 2 / Math.tan((FOV / 2) * DEG))
  camera.updateProjectionMatrix()
  // The camera is not in the scene: its world matrix (and the inverse `project` uses) is refreshed here.
  camera.updateMatrixWorld()
}

const EYE = new Vector3()
const EYE2 = new Vector3()

/**
 * Put her at the window's framing: eyes at (guide.x, guide.y) window-local px, the head
 * `guide.headPx` tall. Writes where her eyes are on screen (`nav.anchor`, viewport px) for the
 * gaze, given the window's viewport rect. Returns false when she is not ready.
 */
export function placeGuide(h: GuideHandle, framing: Framing, view: Rect, camera: PerspectiveCamera): boolean {
  const g = h.group
  const m = h.rig.metrics
  const place = framing.guide
  if (!g || !m || !place) return false
  // Her whole height fills `figurePx` (a full-length figure); the head's share is the fallback.
  const s = place.figurePx ? place.figurePx / m.height : place.headPx / m.headHeight
  const x = place.x - view.w / 2
  const y = view.h / 2 - place.y
  g.position.set(x, y - s * m.eyeY + h.rig.float * s, -s * m.headZ)
  g.scale.setScalar(s)
  g.updateMatrixWorld(true)
  // The key light comes from the ring's side of this window.
  if (h.key) h.key.position.x = KEY_X * place.key
  if (h.rim) h.rim.position.x = KEY_X * place.key
  // Her eyes on screen: the midpoint projected through the window's camera into viewport px.
  if (!h.eyes) {
    const l = g.getObjectByName('Eye_L')
    const r = g.getObjectByName('Eye_R')
    if (l && r) h.eyes = [l, r]
  }
  if (h.eyes) {
    h.eyes[0].getWorldPosition(EYE)
    h.eyes[1].getWorldPosition(EYE2)
    EYE.add(EYE2).multiplyScalar(0.5).project(camera)
    nav.anchor.eyes.x = view.x + ((EYE.x + 1) / 2) * view.w
    nav.anchor.eyes.y = view.y + ((1 - EYE.y) / 2) * view.h
    nav.anchor.headPx = place.headPx
    nav.anchor.on = true
  }
  return true
}

/**
 * Mounts the figure and steps her living systems before the frame is drawn (priority −1, so
 * Figure's own useFrame applies this frame's performance).
 */
export function Guide({ handle }: { handle: GuideHandle }) {
  const group = useRef<Group>(null)
  const { size, invalidate } = useThree()

  // While her GLB downloads no frame is due; one frame every 250 ms lets Figure mount her the moment she arrives.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (handle.rig.metrics) window.clearInterval(timer)
      else invalidate()
    }, 250)
    return () => window.clearInterval(timer)
  }, [handle, invalidate])
  const input = useMemo<LivingInput>(
    () => ({
      pointer: obs.pointer,
      anchor: nav.anchor,
      viewport: { w: 1, h: 1 },
      beat: 'hero',
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
    }),
    [],
  )

  const key = useRef<DirectionalLight>(null)
  const rim = useRef<DirectionalLight>(null)
  /** Her strips' materials (cloned per mesh by the loader) and their rest intensity, found once she is mounted. */
  const strips = useRef<{ mats: MeshStandardMaterial[]; rest: number[] } | null>(null)
  useEffect(() => {
    handle.key = key.current
    handle.rim = rim.current
    // The world's figure never docks here: Figure then leaves the anchor to placeGuide.
    nav.atDock = true
    return () => {
      nav.atDock = false
      nav.anchor.on = false
    }
  }, [])

  useFrame((_, dt) => {
    handle.group = group.current
    if (!handle.rig.metrics) return
    if (!handle.living) handle.living = createLivingState(1, obs.clock + 0.3)
    input.viewport.w = size.width
    input.viewport.h = size.height
    input.beat = `station-${obs.station}`
    input.progress = obs.progress
    input.spokeAt = obs.line.from
    input.typingUntil = obs.line.typed < obs.line.text.length ? Infinity : 0
    input.transmitAt = obs.glowAt
    const picked = pickedLayers()
    if (String(picked) !== String(input.missionLayers)) {
      input.missionLayers = picked
      input.missionAt = obs.clock
    }
    input.still = nav.still
    input.clock = obs.clock
    input.dt = Math.min(0.1, dt)
    stepLiving(handle.living, input, nav.perf)
    nav.perf.head.yaw = nav.perf.head.yaw * HEAD_GAIN + HEAD_REST_YAW
    nav.perf.head.pitch *= HEAD_GAIN
    nav.perf.jaw = nav.still ? 0 : jawOpen(obs.line.text, obs.line.typed, obs.clock, obs.line.from)
    // The strips' pulse: every emissive material of hers, about its rest (the still keeps the rest).
    if (!strips.current && group.current) {
      const mats: MeshStandardMaterial[] = []
      group.current.traverse((o) => {
        const m = (o as { material?: unknown }).material
        if (m instanceof MeshStandardMaterial && STRIP_MATERIAL.test(m.name) && !mats.includes(m)) mats.push(m)
      })
      strips.current = { mats, rest: mats.map((m) => m.emissiveIntensity) }
    }
    const st = strips.current
    if (st) {
      const k = nav.still ? 1 : 1 + STRIP_PULSE * Math.sin(obs.clock * STRIP_HZ * Math.PI * 2)
      st.mats.forEach((m, i) => (m.emissiveIntensity = st.rest[i] * k))
    }
  }, -1)

  return (
    <>
      {/* The key from the ring's side (warm; placeGuide flips its side per window), a cool fill from the other front quarter, a near-neutral environment so her brushed metal reads silver, not gold or blue: no shadows. The lights stay outside her placed group. */}
      <Studio warm="#c9ab7a" cool="#8e98a6" base="#17171c" />
      <directionalLight ref={key} position={[-KEY_X, 2, 2]} intensity={2.2} color="#e9c98f" />
      {/* The faint gold rim from behind, the ring's side: her silhouette separates from the ink. */}
      <directionalLight ref={rim} position={[-KEY_X, 1, -3]} intensity={1.4} color="#d9a441" />
      <directionalLight position={[2, 2.5, 4]} intensity={1.0} color="#aebbd0" />
      <ambientLight intensity={0.3} color="#e4e2dc" />
      <group ref={group}>
        <Figure rig={handle.rig} variant="world" />
      </group>
    </>
  )
}

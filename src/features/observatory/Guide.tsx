import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { type DirectionalLight, Group, type Object3D, PerspectiveCamera, Vector3 } from 'three'
import { Studio } from '../experience/objects/Studio'
import { Figure, type FigureRig } from '../navigator/figure/Figure'
import { nav } from '../navigator/state'
import { obs } from './state'
import { createPose, GOLD, poseSettling, stepPose, type PoseInput, type PoseState } from './guidePose'
import type { Rect } from './windows'

/*
 * The guide: the Navigator's figure from the navigator pipeline (loadFigure + Figure, variant
 * 'world'), mounted once in the world and drawn by the world's passes: framed in the hero and the
 * contact windows, and as a bust in the porthole between them (porthole.ts). She never walks or
 * relocates: her life is guidePose.ts (head and eyes toward the cursor or the section, ear
 * flicks, blinks, breath, the strips' tint), stepped here once per frame into `nav.perf`, which
 * Figure applies.
 *
 * She is the Mecha roe deer (Osho, CC BY 4.0; src/assets/navigator/source/README.md), adopted as
 * src/assets/navigator/navigator.glb, her colours as the artist authored them.
 */

export interface GuideHandle {
  rig: FigureRig
  /** Her outer group (placed per window); null until mounted. */
  group: Group | null
  /** Her eye nodes, found once under the loaded figure. */
  eyes: [Object3D, Object3D] | null
  /** The key light (from the ring's side): placeGuide turns it to the window's side. */
  key: DirectionalLight | null
  /** Show or hide her seven systems' lights (the chakra dots: never in these windows). */
  systems: (on: boolean) => void
  /** Her life, and what the world asks of it this frame (written by the passes, read on the next step). */
  pose: PoseState | null
  input: PoseInput
  /** True while something of hers is moving: the world keeps the frames coming. */
  moving: () => boolean
}

export function createGuideHandle(): GuideHandle {
  const h: GuideHandle = {
    rig: { group: null, systems: [], metrics: null, explode: 0, assembled: 0, float: 0 },
    group: null,
    eyes: null,
    key: null,
    systems: () => {},
    pose: null,
    input: { mode: 'hero', station: 1, depth: 0, clock: 0, dt: 0, still: false, pointer: obs.pointer, eyes: { x: 0, y: 0 }, viewport: { w: 1, h: 1 }, focus: null, read: null, nodAt: -10, sentAt: 0, tint: [...GOLD], tintMix: 0 },
    moving: () => false,
  }
  h.systems = (on) => {
    for (const o of h.rig.systems) o.visible = on
  }
  // Breath, blinks and flicks never stop while she shows (still frames excepted): the springs only add to that.
  h.moving = () => !!h.rig.metrics && (!obs.still || (h.pose ? poseSettling(h.pose) : true))
  return h
}

const FOV = 30
const DEG = Math.PI / 180
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

/** Where she is drawn this frame: her eyes in viewport px, her height, her bank and pitch (degrees), the key light's side. */
export interface GuidePlace {
  x: number
  y: number
  figurePx: number
  bank: number
  pitch: number
  /** Her facing about the vertical (degrees: 0 faces the words, 90 the right). */
  facing: number
  key: -1 | 1
}

/**
 * Put her at `place` (viewport px) through a camera that draws the viewport rect `view` with
 * world units = CSS px: her eyes at (x, y), her whole height `figurePx`, banked and pitched.
 * Writes where her eyes are on screen (`nav.anchor`) for the gaze. Returns false when she is not ready.
 */
export function placeGuide(h: GuideHandle, place: GuidePlace, view: Rect, camera: PerspectiveCamera): boolean {
  const g = h.group
  const m = h.rig.metrics
  if (!g || !m) return false
  const s = place.figurePx / m.height
  const x = place.x - view.x - view.w / 2
  const y = view.h / 2 - (place.y - view.y)
  // The group turns about her eyes: the figure is offset so the eyes sit on the group's origin.
  g.position.set(x, y + h.rig.float * s, 0)
  g.scale.setScalar(s)
  g.rotation.set(place.pitch * DEG, place.facing * DEG, place.bank * DEG)
  const inner = g.children[0]
  if (inner) inner.position.set(0, -m.eyeY, -m.headZ)
  g.updateMatrixWorld(true)
  // The key light comes from the ring's side of this window.
  if (h.key) h.key.position.x = KEY_X * place.key
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
    nav.anchor.headPx = 0.25 * place.figurePx
    nav.anchor.on = true
  }
  return true
}

/**
 * Mounts the figure and steps her life before the frame is drawn (priority −1, so Figure's own
 * useFrame applies this frame's performance).
 */
export function Guide({ handle }: { handle: GuideHandle }) {
  const group = useRef<Group>(null)
  const key = useRef<DirectionalLight>(null)
  const { invalidate } = useThree()
  // While her GLB downloads no frame is due; one frame every 250 ms lets Figure mount her the moment she arrives.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (handle.rig.metrics) window.clearInterval(timer)
      else invalidate()
    }, 250)
    return () => window.clearInterval(timer)
  }, [handle, invalidate])
  useEffect(() => {
    handle.key = key.current
    // The world's figure never docks here: Figure then leaves the anchor to placeGuide.
    nav.atDock = true
    return () => {
      nav.atDock = false
      nav.anchor.on = false
    }
  }, [handle])

  useFrame((_, dt) => {
    handle.group = group.current
    if (!handle.rig.metrics) return
    if (!handle.pose) handle.pose = createPose(7, obs.clock)
    const i = handle.input
    i.clock = obs.clock
    i.dt = Math.min(0.1, dt)
    i.still = obs.still
    stepPose(handle.pose, i, nav.perf)
  }, -1)

  return (
    <>
      {/* Neutral studio light (a white key from the ring's side, a soft fill, a dim grey environment): her own colours as the artist authored them, her strips and lenses self-lit. No shadows. The lights stay outside her placed group. */}
      <Studio warm="#efe9df" cool="#dde2ea" base="#15151a" />
      <directionalLight ref={key} position={[-KEY_X, 2, 2]} intensity={2.0} color="#fff6e8" />
      <directionalLight position={[2, 2.5, 4]} intensity={0.9} color="#e6ebf2" />
      <ambientLight intensity={0.35} color="#ffffff" />
      <group ref={group}>
        <group>
          <Figure rig={handle.rig} variant="world" />
        </group>
      </group>
    </>
  )
}

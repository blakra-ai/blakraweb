import { chakraOf } from '../../content/shared'
import type { LayerId } from '../../content/types'

/**
 * The 3D stage: a black hole crowning seven lotus centres, the seven layers of a product.
 * Every section declares where the camera should be while it holds the middle of the
 * screen and what state the scene argues there (scattered orbits, the last stable orbit,
 * the column, how high the light has risen). The pose is interpolated between neighbouring
 * sections by scroll position, so every scroll moves the shot. A pinned section can hold
 * the screen and drive the pose itself while it is pinned.
 */

export const CROWN_Y = -2.9
export const GAP = 2.0
/** World height of centre k (0 root … 6 crown). Mirrors the shader. */
export const chakraY = (k: number) => CROWN_Y - (6 - k) * GAP

export interface Pose {
  target: [number, number, number]
  dist: number
  /** Elevation and azimuth of the camera around its target, radians. */
  el: number
  az: number
  /** Screen offset of the optical centre (view units), so the axis sits beside the text. */
  shift: [number, number]
  disk: number
  fade: number
  /** Scattered, tilted orbits shown again (0 none … 1 fully scattered). */
  chaos: number
  /** The dashed last stable orbit. */
  isco: number
  /** The disk's seven bands lifting to the column (0 in the disk … 1 arrived). */
  lift: number
  /** How present the column of centres is. */
  column: number
  /** How high the light may rise along the axis, in centres from the root (0 … 7). */
  flow: number
  /** How many centres, from the root, are fully open (0 … 7). */
  bloom: number
  /** The jet along the spin axis: the products (0 … 1). */
  jets: number
  /** How far the infalling filament (how a project runs) is drawn (0 … 1). */
  infall: number
  /** The three lights on the closest orbit: the people (0 … 1). */
  orbiters: number
}

export interface StageSection {
  el: HTMLElement
  pose: Pose
  narrow?: Partial<Pose>
  minutes?: number
  /** Pinned sections hold their pose for the whole pin instead of passing through it. */
  hold?: boolean
  /** While held, the section can drive the pose itself from the (smoothed) scroll position y. */
  live?: (y: number) => Partial<Pose> | null
}

const scene = { chaos: 0, isco: 0, lift: 0, column: 0, flow: 0, bloom: 0, jets: 0, infall: 0, orbiters: 0 }
/** After the engine: every layer arrived, open and lit. */
const built = { lift: 1, column: 1, flow: 7, bloom: 7 }

export const poses = {
  /** The first shot: the black hole and its disk, nothing else yet. */
  hero: { target: [0, -0.4, 0], dist: 22.5, el: 0.27, az: 0.3, shift: [0.36, 0.03], disk: 1, fade: 1, ...scene },
  /** The tipping point: orbits disturbed, the last stable orbit, the column below. */
  pulse: { target: [0, -5.4, 0], dist: 24, el: 0.2, az: 0.32, shift: [0.36, 0], disk: 1, fade: 1, ...scene, chaos: 0.42, isco: 1, column: 0.7, flow: 7 },
  overview: { target: [0, -6.9, 0], dist: 31, el: 0.12, az: 0.3, shift: [0.42, -0.02], disk: 1, fade: 1, ...scene, ...built },
  /** Edge-on to the disk: the moment a flow turns out to be a stack. */
  reveal: { target: [0, -1.4, 0], dist: 17, el: 0.04, az: 0.3, shift: [0.34, 0], disk: 1, fade: 1, ...scene, column: 0.6 },
  close: (k: number, side = 0.46): Pose => ({ target: [0, chakraY(k), 0], dist: 7.5, el: 0.32, az: 0.35, shift: [side, 0], disk: 1, fade: 1, ...scene, ...built }),
  crown: { target: [0, -2.2, 0], dist: 11, el: -0.08, az: 0.45, shift: [0.3, 0.05], disk: 1.1, fade: 1, ...scene, ...built },
  /** Above the hole, looking up the axis: the jet carries the products outward. */
  jets: { target: [0, 7, 0], dist: 27, el: -0.1, az: 0.35, shift: [0.36, -0.04], disk: 1, fade: 1, ...scene, ...built, column: 0.35, jets: 1 },
  /** High above the disk: a request falls in and is stretched into one exact line. */
  infall: { target: [0, 0, 0], dist: 25, el: 0.62, az: 0.9, shift: [0.36, 0.02], disk: 0.6, fade: 0.9, ...scene, ...built, column: 0.2, infall: 1 },
  /** The closest orbit: three lights, nothing between them and the core. */
  photon: { target: [0, 0.3, 0], dist: 13, el: 0.15, az: 0.5, shift: [0.34, 0], disk: 1, fade: 1, ...scene, ...built, column: 0.25, orbiters: 1 },
  /** At the edge of the shadow: past this line, the problem is ours. */
  horizon: { target: [0, 0.1, 0], dist: 7.8, el: 0.08, az: 0.62, shift: [-0.27, 0.04], disk: 1.1, fade: 1, ...scene, ...built, column: 0.15, orbiters: 0.35 },
} satisfies Record<string, Pose | ((k: number) => Pose)>

/** On phones the axis runs down the middle, higher up, further away, and dimmer: text sits on top of it. */
export const narrowOf = (p: Pose): Pose => ({ ...p, dist: p.dist * 1.35, shift: [0, 0.22], fade: p.fade * 0.72 })

const sections: StageSection[] = []
const listeners = new Set<() => void>()

export function registerSection(s: StageSection): () => void {
  sections.push(s)
  // Keep page order, whatever order components mounted in.
  sections.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
  listeners.forEach((fn) => fn())
  return () => {
    sections.splice(sections.indexOf(s), 1)
    listeners.forEach((fn) => fn())
  }
}

export function onSectionsChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getSections = () => sections

/** Extra light on specific layers (the card or layer being talked about). */
export const boost = { target: new Array(7).fill(0) as number[], current: new Array(7).fill(0) as number[] }

let boostOwner: string | null = null

/** Light these layers for `owner`; null clears them, but only if `owner` set them. */
export function setBoost(layers: readonly LayerId[] | null, owner: string) {
  if (!layers) {
    if (boostOwner !== owner) return
    boostOwner = null
    boost.target = new Array(7).fill(0)
    return
  }
  boostOwner = owner
  boost.target = new Array(7).fill(0)
  for (const l of layers) boost.target[chakraOf[l]] = 1
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  return {
    target: [lerp(a.target[0], b.target[0], t), lerp(a.target[1], b.target[1], t), lerp(a.target[2], b.target[2], t)],
    dist: lerp(a.dist, b.dist, t),
    el: lerp(a.el, b.el, t),
    az: lerp(a.az, b.az, t),
    shift: [lerp(a.shift[0], b.shift[0], t), lerp(a.shift[1], b.shift[1], t)],
    disk: lerp(a.disk, b.disk, t),
    fade: lerp(a.fade, b.fade, t),
    chaos: lerp(a.chaos, b.chaos, t),
    isco: lerp(a.isco, b.isco, t),
    lift: lerp(a.lift, b.lift, t),
    column: lerp(a.column, b.column, t),
    flow: lerp(a.flow, b.flow, t),
    bloom: lerp(a.bloom, b.bloom, t),
    jets: lerp(a.jets, b.jets, t),
    infall: lerp(a.infall, b.infall, t),
    orbiters: lerp(a.orbiters, b.orbiters, t),
  }
}

export function cameraFrom(p: Pose, time: number): { pos: [number, number, number]; target: [number, number, number] } {
  const az = p.az + Math.sin(time * 0.05) * 0.08
  const c = Math.cos(p.el)
  return {
    target: p.target,
    pos: [p.target[0] + Math.sin(az) * c * p.dist, p.target[1] + Math.sin(p.el) * p.dist, p.target[2] + Math.cos(az) * c * p.dist],
  }
}

/**
 * The screenplay in numbers (see .firm/runs/2026-10-28-bright-experience/screenplay.md): the
 * film's beats in t (0 … 1 over the home page), the acts that map page sections onto them, and
 * the camera's path. One place to retime the story.
 */
export const beats = {
  scattered: [0, 0.06],
  ignition: [0.06, 0.085],
  infall: [0.085, 0.15],
  mark: [0.15, 0.18],
  need: [0.18, 0.28],
  build: [0.28, 0.4],
  charge: [0.4, 0.43],
  launch: [0.43, 0.46],
  systems: [0.46, 0.66],
  product: [0.66, 0.73],
  orbit: [0.73, 0.8],
  people: [0.8, 0.85],
  running: [0.85, 1],
} as const satisfies Record<string, readonly [number, number]>

/** Page sections (data-beat) and the stretch of the story each one plays. */
export const acts = [
  { beat: 'hero', from: 0, to: beats.mark[1] },
  { beat: 'need', from: beats.need[0], to: beats.need[1] },
  { beat: 'layers', from: beats.build[0], to: beats.charge[1] },
  { beat: 'proof', from: beats.launch[0], to: beats.systems[1] },
  { beat: 'product', from: beats.product[0], to: beats.product[1] },
  { beat: 'process', from: beats.orbit[0], to: beats.orbit[1] },
  { beat: 'people', from: beats.people[0], to: beats.people[1] },
  { beat: 'contact', from: beats.running[0], to: beats.running[1] },
] as const

/**
 * How much of a section's scroll its act plays over: the stretch it holds the screen (its
 * height less one screen), so a held act ends exactly as the hold does; a section that does not
 * hold plays over most of its height. The rest of the scroll rests on the act's last frame.
 */
export const actSpan = (height: number, screen: number) => Math.max(height - screen, height * 0.6)

/** 0 … 1 across [a, b], clamped. */
export const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
export const beat = (t: number, b: readonly [number, number]) => span(t, b[0], b[1])
/** Smootherstep: starts and lands at rest. */
export const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
/** Frame-rate independent approach of a value to its target. */
export const damp = (from: number, to: number, lambda: number, dt: number) => from + (to - from) * (1 - Math.exp(-lambda * dt))

type V3 = [number, number, number]

/** The disk's tilt from the screen plane; the spin axis (the column, the jet) leans with it. */
export const DISK_TILT = -1.32
/** A point on the spin axis at height h. */
const axisAt = (h: number): V3 => [0, -Math.sin(DISK_TILT) * h, Math.cos(DISK_TILT) * h]

/** Where the five systems ignite along the jet: sideways offset, height on the axis, depth. */
export const stars = [
  [1.9, 11, 0.8],
  [-1.7, 14, -0.6],
  [2, 17, -1],
  [-1.6, 20, 0.6],
  [1.9, 23, 0.2],
] as const
/** When each of the five systems ignites. */
export const starAt = (k: number) => beats.systems[0] + 0.02 + k * 0.036

/**
 * Riding the jet: the camera settles on each system as its star ignites, the jet held right of
 * centre (the left is for its case) and each star beside it.
 */
const ride = stars.map(([, h, dz], k) => {
  const [, y, z] = axisAt(h)
  return { t: starAt(k), pos: [-2.2, y + 0.4, z + dz + 12.5] as V3, look: [-3.1, y + 0.7, z + dz] as V3 }
})

/** The camera's path: position and the point it looks at. The subject sits right of centre; the left is for the words. */
const keys: { t: number; pos: V3; look: V3 }[] = [
  { t: 0, pos: [0, 0.6, 17], look: [-1.2, 0, 0] },
  { t: 0.07, pos: [0, 0.6, 17], look: [-1.2, 0, 0] },
  { t: 0.15, pos: [0, 2.6, 13], look: [-3, 0.2, 0] },
  { t: 0.27, pos: [1, 2.3, 12.5], look: [-3.2, 0.2, 0] },
  { t: 0.31, pos: [5.4, 3.1, 9.2], look: [-1.6, 2.9, 0] },
  { t: 0.42, pos: [5.8, 3.9, 9.8], look: [-1.9, 3.9, 0] },
  { t: 0.46, pos: [4.5, 7, 13.5], look: [-2.2, 8.6, 1.6] },
  ...ride,
  { ...ride[ride.length - 1], t: beats.systems[1] },
  // Down the spin axis: straight over the look point (so screen right stays world right), the hole right of centre.
  { t: 0.69, pos: [-3.1, 11.4, 1.4], look: [-3.1, 0, 0] },
  { t: 0.72, pos: [-3, 10.6, 1.3], look: [-3, 0, 0] },
  { t: 0.77, pos: [-0.8, 5.6, 17], look: [-4.2, 1.1, 0] },
  { t: 0.83, pos: [0, 3, 12.5], look: [-2.8, 0.6, 0] },
  // The resolution: back to the opening's width, the whole system in frame above the end card.
  { t: 0.93, pos: [-0.6, 4.2, 19], look: [-2.4, 2.9, 0] },
  { t: 1, pos: [-0.6, 4.2, 19.4], look: [-2.4, 2.9, 0] },
]

/**
 * The camera at t. Portrait screens keep the subject centred and above the words: no sideways
 * offset, the look point lowered, and a step back to fit the narrower view.
 */
export function cameraAt(t: number, portrait: boolean, out: { pos: V3; look: V3 }) {
  let i = 0
  while (i < keys.length - 2 && t > keys[i + 1].t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const k = ease(span(t, a.t, b.t))
  for (let j = 0; j < 3; j++) {
    out.pos[j] = a.pos[j] + (b.pos[j] - a.pos[j]) * k
    out.look[j] = a.look[j] + (b.look[j] - a.look[j]) * k
  }
  if (portrait) {
    out.look[0] = 0
    const back = 1.32
    const top = out.pos[1] > 10 && Math.abs(out.pos[2]) < 1
    if (!top) {
      out.pos[2] = out.pos[2] * back
      out.look[1] -= 3.2
    } else out.look[2] = 3.2
  }
  return out
}

/** When centre k (root 0 … crown 6) blooms in Act IV. */
export const bloomAt = (k: number) => beats.build[0] + 0.03 + k * 0.018

/** Heights of the seven centres on the spin axis, root to crown. */
export const centreY = (k: number) => 1.1 + k * 0.82
export const jetBase = centreY(6) + 0.6

/** Act VI: our product comes into focus inside the shadow, then its facts, one at a time. */
export const productFocus = beats.product[0] + 0.024
export const factAt = (k: number) => beats.product[0] + 0.032 + k * 0.009

/** Act VI: the five stations of how we work light in turn on one orbit; the last is the key. */
export const stationAt = (k: number) => beats.orbit[0] + 0.01 + k * 0.011

/** Act VI: the three principals arrive on the figure-eight one at a time. */
export const bodyAt = (k: number) => beats.people[0] + 0.004 + k * 0.01

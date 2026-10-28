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

/**
 * Page sections (data-beat) and the stretch of the story each plays while it holds the screen
 * (in … out). From one act's out to the next one's in, the film goes on playing while the page
 * changes sections: the camera travels to the next subject as the next words arrive. So no
 * stretch of scroll leaves the story still (src/features/experience/scrollMap.ts).
 */
export const acts = [
  { beat: 'hero', in: 0, out: 0.15 },
  { beat: 'need', in: 0.19, out: 0.27 },
  { beat: 'layers', in: 0.295, out: 0.43 },
  { beat: 'proof', in: 0.455, out: 0.648 },
  { beat: 'product', in: 0.69, out: 0.722 },
  { beat: 'process', in: 0.745, out: 0.792 },
  { beat: 'people', in: 0.8, out: 0.835 },
  { beat: 'contact', in: 0.85, out: 1 },
] as const

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
  { t: 0.46, pos: [0.5, 7.4, 14], look: [-2.6, 8.6, 1.6] },
  ...ride,
  // A breath on the last system, then the long move of the film: down the jet to look along the axis.
  { ...ride[ride.length - 1], t: 0.648 },
  // Down the spin axis: straight over the look point (so screen right stays world right), the hole right of centre.
  { t: 0.695, pos: [-3.1, 11.4, 1.4], look: [-3.1, 0, 0] },
  { t: 0.715, pos: [-3, 10.6, 1.3], look: [-3, 0, 0] },
  { t: 0.775, pos: [-0.8, 5.6, 17], look: [-4.2, 1.1, 0] },
  { t: 0.83, pos: [0, 3, 12.5], look: [-2.8, 0.6, 0] },
  // The resolution: back to the opening's width, the whole system in frame above the end card.
  { t: 0.93, pos: [-0.6, 4.2, 19], look: [-2.4, 2.9, 0] },
  { t: 1, pos: [-0.6, 4.2, 19.4], look: [-2.4, 2.9, 0] },
]

/**
 * The camera's path through its keys as a monotone cubic per coordinate (Fritsch–Carlson): it
 * moves on through each key without stopping, never overshoots one, and comes to rest only
 * where the keys themselves hold still. Slopes are worked out once.
 */
const times = keys.map((k) => k.t)
const slopes = (values: number[]) => {
  const n = values.length
  const d = values.slice(0, -1).map((v, i) => (values[i + 1] - v) / (times[i + 1] - times[i]))
  const m = values.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2))
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const h = Math.hypot(a, b)
    if (h > 3) {
      m[i] = (3 * a * d[i]) / h
      m[i + 1] = (3 * b * d[i]) / h
    }
  }
  return m
}
const channels = [0, 1, 2].flatMap((j) => [keys.map((k) => k.pos[j]), keys.map((k) => k.look[j])])
const tangents = channels.map(slopes)

/**
 * The camera at t. Portrait screens keep the subject centred and above the words: a step back
 * along the view to fit the narrower frame, a slide sideways (not a turn) to centre the subject,
 * and the look point lowered along the camera's own up, so the subject rides high in the frame.
 */
export function cameraAt(t: number, portrait: boolean, out: { pos: V3; look: V3 }) {
  const x = Math.min(times[times.length - 1], Math.max(times[0], t))
  let i = 0
  while (i < times.length - 2 && x > times[i + 1]) i++
  const h = times[i + 1] - times[i]
  const s = (x - times[i]) / h
  const s2 = s * s
  const s3 = s2 * s
  for (let c = 0; c < 6; c++) {
    const v = channels[c]
    const m = tangents[c]
    const value = (2 * s3 - 3 * s2 + 1) * v[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * v[i + 1] + (s3 - s2) * h * m[i + 1]
    if (c % 2 === 0) out.pos[c / 2] = value
    else out.look[(c - 1) / 2] = value
  }
  if (portrait) {
    const { pos, look } = out
    for (let j = 0; j < 3; j++) pos[j] = look[j] + (pos[j] - look[j]) * 1.32
    pos[0] -= look[0]
    look[0] = 0
    // The camera's up: right = forward × world up, up = right × forward.
    const f = norm([look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]])
    const r = norm([-f[2], 0, f[0]])
    const u: V3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    for (let j = 0; j < 3; j++) look[j] -= u[j] * 3.2
  }
  return out
}

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** When centre k (root 0 … crown 6) blooms in Act IV. */
export const bloomAt = (k: number) => beats.build[0] + 0.03 + k * 0.018

/** Heights of the seven centres on the spin axis, root to crown. */
export const centreY = (k: number) => 1.1 + k * 0.82
export const jetBase = centreY(6) + 0.6

/** Act VI: our product comes into focus inside the shadow, then its facts, one at a time. */
export const productFocus = beats.product[0] + 0.03
export const factAt = (k: number) => beats.product[0] + 0.038 + k * 0.009

/** Act VI: the five stations of how we work light in turn on one orbit; the last is the key. */
export const stationAt = (k: number) => beats.orbit[0] + 0.016 + k * 0.01

/** Act VI: the three principals arrive on the figure-eight one at a time. */
export const bodyAt = (k: number) => beats.people[0] + 0.004 + k * 0.01

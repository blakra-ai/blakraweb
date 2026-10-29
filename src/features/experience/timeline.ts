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
const C = Math.cos(DISK_TILT)
const S = Math.sin(DISK_TILT)
/**
 * The system's own frame: EX across the disk, EY along it (away from the opening's viewer), and
 * the spin axis. Everything that turns, turns from EX toward EY (the disk's own sense).
 */
const EX: V3 = [1, 0, 0]
const EY: V3 = [0, C, S]
const AXIS_V: V3 = [0, -S, C]
const DEG = Math.PI / 180

/** When each of the five systems ignites, and how high on the jet. */
export const starAt = (k: number) => beats.systems[0] + 0.02 + k * 0.036
const starHeight = (k: number) => 11 + k * 3

/**
 * The camera is a satellite of the system: it makes exactly one turn around the spin axis over
 * the whole film, in the disk's own sense, never back, and ends where it began (the bookend).
 * Each key: azimuth (degrees round the axis from the opening view), elevation above the disk's
 * plane, distance, the height on the axis it looks at, and how far right of centre that point
 * sits (a share of the distance; the left is for the words). Past the opening (where the
 * lensed wordmark faces the viewer) the turn is even: about 21° a screen of scroll on a desktop,
 * so its speed never changes for no reason.
 */
type OrbitKey = { t: number; az: number; el: number; dist: number; h: number; k: number }
const ride: OrbitKey[] = [0, 1, 2, 3, 4].map((k) => ({ t: starAt(k), az: 95 + 14.2 * k, el: 12, dist: 12.6, h: starHeight(k) + 0.3, k: 0.2 }))
const keys: OrbitKey[] = [
  // I: wide and nearly still; II: in and down onto the disk as it forms; III: on its edge.
  { t: 0, az: 0, el: 16, dist: 17.1, h: 0, k: 0.07 },
  { t: 0.07, az: 2, el: 16, dist: 17, h: 0, k: 0.07 },
  { t: 0.15, az: 6, el: 24, dist: 13.6, h: 0.1, k: 0.22 },
  { t: 0.27, az: 13, el: 24, dist: 13, h: 0.2, k: 0.24 },
  // IV: round to the side and up, to watch the centres rise along the axis.
  { t: 0.31, az: 38, el: 13, dist: 11.6, h: 3, k: 0.15 },
  { t: 0.42, az: 62, el: 12, dist: 12.4, h: 3.9, k: 0.16 },
  // V: up the jet with the launch, past the five systems, still turning.
  { t: 0.46, az: 87, el: 12, dist: 13.6, h: 8.8, k: 0.19 },
  ...ride,
  { t: 0.648, az: 162, el: 12, dist: 12.6, h: 23.3, k: 0.2 },
  // VI: over the top, to look down the axis at the ring of light; then out to the orbit, the people.
  { t: 0.695, az: 198, el: 82, dist: 11.4, h: 0, k: 0.22 },
  { t: 0.715, az: 220, el: 82, dist: 10.7, h: 0, k: 0.22 },
  { t: 0.775, az: 267, el: 28, dist: 17.9, h: 1.1, k: 0.23 },
  { t: 0.83, az: 314, el: 24, dist: 13, h: 0.6, k: 0.21 },
  // VII: the turn completes on the opening's side, wide, the whole system above the end card.
  { t: 0.93, az: 350, el: 18, dist: 19.1, h: 3, k: 0.125 },
  { t: 1, az: 360, el: 18, dist: 19.5, h: 3, k: 0.125 },
]

/**
 * The orbit through its keys as a monotone cubic per value (Fritsch–Carlson): it moves on
 * through each key without stopping, never overshoots one (so the turn never runs back), and
 * comes to rest only where the keys hold still. Slopes are worked out once.
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
const names = ['az', 'el', 'dist', 'h', 'k'] as const
const channels = names.map((n) => keys.map((k) => k[n]))
const tangents = channels.map(slopes)

/** The orbit's values at t. */
export function orbitAt(t: number) {
  const x = Math.min(times[times.length - 1], Math.max(times[0], t))
  let i = 0
  while (i < times.length - 2 && x > times[i + 1]) i++
  const h = times[i + 1] - times[i]
  const s = (x - times[i]) / h
  const s2 = s * s
  const s3 = s2 * s
  const v = channels.map((c, j) => (2 * s3 - 3 * s2 + 1) * c[i] + (s3 - 2 * s2 + s) * h * tangents[j][i] + (-2 * s3 + 3 * s2) * c[i + 1] + (s3 - s2) * h * tangents[j][i + 1])
  return { az: v[0], el: v[1], dist: v[2], h: v[3], k: v[4] }
}

/** A point in the system's frame: across, along, up the axis. */
const inFrame = (x: number, y: number, z: number): V3 => [0, 1, 2].map((j) => EX[j] * x + EY[j] * y + AXIS_V[j] * z) as V3
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/**
 * Where each system ignites: beside the jet, on the side the camera sees as right when it
 * arrives there (a helix round the jet, turning as the camera does), 1.7 from the axis.
 */
export const starPlace = (k: number): V3 => {
  const a = orbitAt(starAt(k)).az * DEG
  return inFrame(Math.cos(a) * 1.7, Math.sin(a) * 1.7, starHeight(k))
}

/** The camera's up: the spin axis, so the column always stands upright on screen. */
export const cameraUp = AXIS_V

/**
 * The camera at t. Portrait screens keep the subject centred and above the words: a step back
 * along the view to fit the narrower frame, the subject centred, and the look point lowered
 * along the camera's own up, so the subject rides high in the frame.
 */
export function cameraAt(t: number, portrait: boolean, out: { pos: V3; look: V3 }) {
  const o = orbitAt(t)
  const dist = portrait ? o.dist * 1.32 : o.dist
  const a = (o.az - 90) * DEG
  const e = o.el * DEG
  const dir = inFrame(Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e))
  const right = norm(cross([-dir[0], -dir[1], -dir[2]], AXIS_V))
  const shift = portrait ? 0 : o.k * dist
  for (let j = 0; j < 3; j++) {
    const target = AXIS_V[j] * o.h - right[j] * shift
    out.look[j] = target
    out.pos[j] = target + dir[j] * dist
  }
  if (portrait) {
    const up = cross(right, [-dir[0], -dir[1], -dir[2]])
    for (let j = 0; j < 3; j++) out.look[j] -= up[j] * 3.2
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

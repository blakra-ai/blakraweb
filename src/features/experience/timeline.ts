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

/** 0 … 1 across [a, b], clamped. */
export const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
export const beat = (t: number, b: readonly [number, number]) => span(t, b[0], b[1])
/** Smootherstep: starts and lands at rest. */
export const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
/** Frame-rate independent approach of a value to its target. */
export const damp = (from: number, to: number, lambda: number, dt: number) => from + (to - from) * (1 - Math.exp(-lambda * dt))

type V3 = [number, number, number]
/** The camera's path: position and the point it looks at. The subject sits right of centre; the left is for the words. */
const keys: { t: number; pos: V3; look: V3 }[] = [
  { t: 0, pos: [0, 0.6, 17], look: [-1.2, 0, 0] },
  { t: 0.07, pos: [0, 0.6, 17], look: [-1.2, 0, 0] },
  { t: 0.15, pos: [0, 2.6, 13], look: [-3, 0.2, 0] },
  { t: 0.27, pos: [1, 2.3, 12.5], look: [-3.2, 0.2, 0] },
  { t: 0.31, pos: [6.5, 2.8, 10.5], look: [-1.6, 2.6, 0] },
  { t: 0.42, pos: [7, 3.6, 11.5], look: [-2, 3.6, 0] },
  { t: 0.46, pos: [5.5, 7, 12.5], look: [-1.6, 9, 0] },
  { t: 0.65, pos: [5, 22, 13], look: [-1.8, 24, 0] },
  { t: 0.69, pos: [0.01, 12.5, 0.6], look: [-1.6, 0, 0] },
  { t: 0.72, pos: [0.01, 11.5, 0.6], look: [-1.6, 0, 0] },
  { t: 0.77, pos: [0, 4.5, 12], look: [-2.8, 0.3, 0] },
  { t: 0.83, pos: [0, 3, 12.5], look: [-2.8, 0.6, 0] },
  { t: 0.92, pos: [0, 0.9, 18.5], look: [-1.8, 1.9, 0] },
  { t: 1, pos: [0, 0.9, 18.5], look: [-1.8, 1.9, 0] },
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

/** Heights of the seven centres on the spin axis, root to crown. */
export const centreY = (k: number) => 1.1 + k * 0.82
export const jetBase = centreY(6) + 0.6
/** Where the five systems ignite along the jet: sideways offset, height on the axis, depth. */
export const stars = [
  [2.6, 11, 1],
  [-2.8, 14, -0.6],
  [2.2, 17, -1.2],
  [-2.4, 20, 0.8],
  [2.8, 23, 0.4],
] as const
/** When each of the five systems ignites. */
export const starAt = (k: number) => beats.systems[0] + 0.02 + k * 0.036

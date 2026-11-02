/*
 * The deer's gait, pure and procedural: a lateral-sequence walk (LH → LF → RH → RF, a quarter
 * cycle apart, duty factor 0.65), driven by the ground she covers (phase += distance / stride),
 * so a stance foot is locked to the ground and a swing foot arcs to its next foothold. The legs
 * are solved by two-bone IK (the hoof kept parallel to the upper segment), the body bobs, rolls,
 * pitches and sways with the stride, the neck nods with the forelimbs and the head counters it.
 * Lengths are in the model's units; `h` (the hip height) sets every proportion (Alexander 1976:
 * stride λ = 2.3 · Fr^0.3 · h, walking at Froude 0.15).
 */

export type Leg = 'LH' | 'LF' | 'RH' | 'RF'
export const LEGS: Leg[] = ['LH', 'LF', 'RH', 'RF']

export const GAIT = {
  /** Footfall phase offsets (lateral sequence) and the duty factor (share of the cycle a foot is on the ground). */
  offsets: { LH: 0.0, LF: 0.25, RH: 0.5, RF: 0.75 } as Record<Leg, number>,
  duty: 0.65,
  /** The walk's Froude number (v² / g·h), its cap, and the stride law λ = k · Fr^e · h. */
  froude: 0.15,
  froudeMax: 0.3,
  strideK: 2.3,
  strideExp: 0.3,
  /** Stride frequency band (Hz) the page keeps her in, whatever the screen size. */
  freq: [1.0, 1.4] as [number, number],
  /** The swing foot's lift at mid-swing, in h. */
  lift: 0.11,
  /** The body: vertical bob (h, twice per stride), roll and pitch (degrees), lateral sway (h). */
  bob: 0.015,
  roll: 2,
  pitch: 1.5,
  sway: 0.01,
  /** The neck's nod in phase with the forelimbs (degrees); the head counters it. */
  neckPitch: 4,
  /** Joint ranges, peak to peak, degrees (the IK is clamped to them). */
  ranges: { shoulder: 35, elbow: 40, carpus: 90, hip: 35, stifle: 35, hock: 40 },
  /** Start and stop: the stride's share over which she accelerates; turning: the lean (degrees) and the speed cut. */
  accelStrides: 0.5,
  turnLean: 3,
  turnSpeed: 0.7,
  /** Idle: breathing (Hz, chest scale), weight shifts (s), ear flicks (s, each 0.2 s), the ears' turn toward the cursor (degrees). */
  idle: { breathHz: 0.25, chest: 0.01, shift: [4, 7] as [number, number], flick: [3, 6] as [number, number], flickS: 0.2, earTurn: 40 },
  /** Second-order springs for the plates and jets lagging the pelvis: frequency (Hz) and damping ratio. */
  plates: { hz: 2.5, zeta: 0.5 },
} as const

export const G = 9.81

/** The stride length for a hip height h at Froude fr. */
export const strideLength = (h: number, fr = GAIT.froude) => GAIT.strideK * Math.pow(fr, GAIT.strideExp) * h
/** The walking speed for h at Froude fr (m/s when h is in metres). */
export const walkSpeed = (h: number, fr = GAIT.froude) => Math.sqrt(fr * G * h)
/** Stride frequency (Hz) at speed v with stride λ. */
export const strideFreq = (v: number, lambda: number) => v / lambda
/** The Froude number at speed v for hip height h. */
export const froude = (v: number, h: number) => (v * v) / (G * h)

/** A leg's rest geometry: the hip joint (x forward, y up, relative to the body's origin), the three segment lengths, and which way the middle joint bends (+1 forward). */
export interface LegRest {
  hip: { x: number; y: number }
  upper: number
  lower: number
  hoof: number
  bend: 1 | -1
  /** Where the foot stands at rest, relative to the hip (y negative: below it). */
  stand: { x: number; y: number }
}

export interface LegPose {
  /** The foot (toe) relative to the body's origin, x forward, y up, and the local z offset of the lift. */
  foot: { x: number; y: number }
  /** Joint angles, degrees: the upper segment's pitch from straight down (+ forward), the lower's flex relative to the upper, the hoof's relative to the lower. */
  upper: number
  lower: number
  hoof: number
  /** 1 on the ground, 0 in the air (for the plant of a stopping foot). */
  stance: number
}

export interface GaitState {
  /** The stride phase (cycles). */
  phase: number
  /** Where the body is along the path, in model units. */
  s: number
  /** The walk's activity 0 … 1 (its ramp at start and stop). */
  active: number
  /** Whether she is coming to a stop: the swing feet finish and plant. */
  stopping: boolean
  /** The swing's lift share: 1 walking, easing to 0 as she stops (the feet in the air plant). */
  plant: number
  legs: Record<Leg, LegPose>
  /** The body: vertical bob, lateral sway (model units), roll and pitch (degrees). */
  body: { bob: number; sway: number; roll: number; pitch: number }
  /** The neck's nod and the head's counter, degrees. */
  neck: number
  head: number
}

export function createGait(rest: Record<Leg, LegRest>, h: number): GaitState {
  const legs = {} as Record<Leg, LegPose>
  for (const leg of LEGS) {
    const r = rest[leg]
    const ik = solveLeg(r, r.stand.x, r.stand.y)
    legs[leg] = { foot: { x: r.hip.x + r.stand.x, y: r.hip.y + r.stand.y }, upper: ik.upper, lower: ik.lower, hoof: ik.hoof, stance: 1 }
  }
  void h
  return { phase: 0, s: 0, active: 0, stopping: false, plant: 1, legs, body: { bob: 0, sway: 0, roll: 0, pitch: 0 }, neck: 0, head: 0 }
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const DEG = 180 / Math.PI
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * The foot of `leg` at `phase`, relative to the hip, along the path (x) and up (y): on the ground
 * it slides back under the body exactly as fast as the body advances (locked to the ground); in
 * the air it arcs forward to the next foothold.
 */
export function footAt(leg: Leg, phase: number, lambda: number, h: number): { dx: number; dy: number; stance: number } {
  const t = ((phase - GAIT.offsets[leg]) % 1 + 1) % 1
  const d = GAIT.duty
  const half = (lambda * d) / 2
  if (t < d) {
    const u = t / d
    return { dx: half - lambda * d * u, dy: 0, stance: 1 }
  }
  const w = (t - d) / (1 - d)
  return { dx: -half + lambda * d * ease(w), dy: GAIT.lift * h * Math.sin(Math.PI * w), stance: 0 }
}

/**
 * Two-bone IK in the sagittal plane for a three-segment leg: the hoof stays parallel to the upper
 * segment, so the chain is (upper + hoof) and (lower); the middle joint bends toward `bend`.
 * Returns degrees: the upper's pitch from straight down (+ forward), the lower's flex (relative), the hoof's (relative).
 */
export function solveLeg(rest: LegRest, dx: number, dy: number): { upper: number; lower: number; hoof: number } {
  const A = rest.upper + rest.hoof
  const B = rest.lower
  const dist = clamp(Math.hypot(dx, dy), Math.abs(A - B) + 1e-4, A + B - 1e-4)
  // The angle at the hip between the chain's line and the upper segment, and the middle joint's interior angle.
  const cosHip = (A * A + dist * dist - B * B) / (2 * A * dist)
  const cosMid = (A * A + B * B - dist * dist) / (2 * A * B)
  const hipA = Math.acos(clamp(cosHip, -1, 1))
  const midA = Math.acos(clamp(cosMid, -1, 1))
  // The line's pitch from straight down (+ forward), the upper's pitch, the lower's flex.
  const line = Math.atan2(dx, -dy)
  const upper = line - rest.bend * hipA
  const flex = rest.bend * (Math.PI - midA)
  return { upper: upper * DEG, lower: flex * DEG, hoof: -flex * DEG }
}

export interface GaitInput {
  /** The ground covered this frame along her heading (model units, ≥ 0 when walking forward). */
  travel: number
  /** Whether the journey wants her walking (false: she comes to a stop and plants). */
  moving: boolean
  dt: number
}

/**
 * One frame: the phase advances with the ground covered (no foot slides), the feet and legs follow,
 * the body rides the stride. Stopping holds the phase and brings the feet in the air down where
 * they are (all four planted); the first start ramps the stride in over half a stride.
 */
export function stepGait(g: GaitState, rest: Record<Leg, LegRest>, h: number, input: GaitInput): void {
  const lambda = strideLength(h)
  const dt = clamp(input.dt, 0, 0.1)
  // Above two strides a second the legs would blur: the ground beyond that is not walked.
  const advance = input.moving ? Math.min(Math.max(0, input.travel) / lambda, 2 * dt + 1e-9) : 0
  if (input.moving) {
    g.stopping = false
    g.active = clamp(g.active + advance / GAIT.accelStrides, 0, 1)
    g.plant = clamp(g.plant + dt / 0.15, 0, 1)
  } else {
    // Stopping: the phase holds, the feet in the air come down where they are (all four planted), the stance feet never move.
    g.plant = clamp(g.plant - dt / 0.2, 0, 1)
    g.stopping = g.plant > 0
  }
  g.phase = (g.phase + advance) % 1
  g.s += advance * lambda
  const a = g.active
  const p = g.phase * Math.PI * 2
  // Two bobs per stride, lowest just after each hind footfall; roll and sway with the side in support, pitch with the fore/hind exchange.
  g.body.bob = -GAIT.bob * h * Math.cos(2 * (p - 0.325 * Math.PI * 2)) * a
  g.body.sway = GAIT.sway * h * Math.sin(p) * a
  g.body.roll = GAIT.roll * Math.sin(p) * a
  g.body.pitch = GAIT.pitch * Math.sin(2 * p) * a
  // The neck nods with the forelimbs (down as each fore hoof lands), the head counters it: the eyes stay level.
  g.neck = GAIT.neckPitch * Math.sin(p - 0.25 * Math.PI * 2) * a
  g.head = -g.neck
  for (const leg of LEGS) {
    const r = rest[leg]
    const f = footAt(leg, g.phase, lambda, h)
    // The hip rides the bob: the foot's target is compensated, so a stance hoof stays on the ground.
    const dx = r.stand.x + f.dx * a
    const dy = r.stand.y + f.dy * a * g.plant - g.body.bob
    const pose = g.legs[leg]
    pose.foot.x = r.hip.x + dx
    pose.foot.y = r.hip.y + dy + g.body.bob
    pose.stance = f.stance === 1 || g.plant === 0 ? 1 : 0
    const ik = solveLeg(r, dx, dy)
    pose.upper = ik.upper
    pose.lower = ik.lower
    pose.hoof = ik.hoof
    // In swing the fore carpus folds backward (up to the range's 90°) and opens before the landing.
    if (leg[1] === 'F' && f.stance === 0) {
      const want = 0.95 * GAIT.ranges.carpus * swingFold(leg, g.phase)
      pose.hoof -= r.bend * Math.max(0, want - Math.abs(ik.hoof)) * a * g.plant
    }
  }
}

/** The fore carpus's fold through the swing, 0 … 1 (its peak is 95 % of the carpus range). */
export function swingFold(leg: Leg, phase: number): number {
  const t = ((phase - GAIT.offsets[leg]) % 1 + 1) % 1
  if (t < GAIT.duty) return 0
  const w = (t - GAIT.duty) / (1 - GAIT.duty)
  return Math.pow(Math.sin(Math.PI * Math.min(1, w * 1.15)), 2)
}

/** Idle life: breathing, weight shifts and ear flicks on a seeded schedule. Pure: the state carries its own timers. */
export interface IdleState {
  nextShift: number
  shiftAt: number
  shiftSide: 1 | -1
  nextFlick: number
  flickAt: number
  flickEar: 'L' | 'R'
  rng: () => number
}

export function createIdle(seed = 7): IdleState {
  let s = seed >>> 0
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const [s0, s1] = GAIT.idle.shift
  const [f0, f1] = GAIT.idle.flick
  return { nextShift: s0 + rng() * (s1 - s0), shiftAt: -1, shiftSide: 1, nextFlick: f0 + rng() * (f1 - f0), flickAt: -1, flickEar: 'L', rng }
}

export interface IdleOut {
  /** The chest's scale about 1, the weight shift's roll (degrees) and sway (h), the ears' flick (degrees, L and R). */
  chest: number
  roll: number
  sway: number
  flickL: number
  flickR: number
}

export function stepIdle(st: IdleState, clock: number, h: number, out: IdleOut): void {
  out.chest = 1 + GAIT.idle.chest * 0.5 * (1 + Math.sin(clock * GAIT.idle.breathHz * Math.PI * 2))
  if (clock >= st.nextShift) {
    st.shiftAt = clock
    st.shiftSide = st.rng() < 0.5 ? 1 : -1
    const [s0, s1] = GAIT.idle.shift
    st.nextShift = clock + s0 + st.rng() * (s1 - s0)
  }
  // A shift eases over 1.2 s to the side and holds.
  const sh = st.shiftAt < 0 ? 0 : clamp((clock - st.shiftAt) / 1.2, 0, 1)
  const side = st.shiftSide * ease(sh)
  out.roll = 1.5 * side
  out.sway = GAIT.sway * h * side
  if (clock >= st.nextFlick) {
    st.flickAt = clock
    st.flickEar = st.rng() < 0.5 ? 'L' : 'R'
    const [f0, f1] = GAIT.idle.flick
    st.nextFlick = clock + f0 + st.rng() * (f1 - f0)
  }
  const fl = st.flickAt < 0 ? 0 : (clock - st.flickAt) / GAIT.idle.flickS
  const flick = fl > 0 && fl < 1 ? 18 * Math.sin(Math.PI * fl) : 0
  out.flickL = st.flickEar === 'L' ? flick : 0
  out.flickR = st.flickEar === 'R' ? flick : 0
}

/** A second-order spring (frequency, damping ratio): the plates and jets lag the pelvis. */
export function spring2(x: number, v: number, target: number, dt: number, hz = GAIT.plates.hz, zeta = GAIT.plates.zeta): [number, number] {
  const w = hz * Math.PI * 2
  const a = w * w * (target - x) - 2 * zeta * w * v
  const nv = v + a * dt
  return [x + nv * dt, nv]
}

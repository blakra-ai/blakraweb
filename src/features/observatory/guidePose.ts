import type { Perf } from '../navigator/living'

/*
 * The guide's life, pure. She never walks or relocates: only her head, neck, ears, eyes (blink)
 * and her own emissive strips move. Per frame this steps critically damped springs toward the
 * targets the frame asks for (the cursor in the dark windows, the section's key element in the
 * porthole, the form when it has focus), schedules the idle ear flicks (each ear on its own,
 * every 3 … 7 s) and blinks (every 4 … 6 s), breathes (0.25 Hz), lays the ears back with depth,
 * tints the strips and answers a successful Send (head up, ears up, lights brighter for 1.2 s).
 * Reduced motion: no springs and no idle; a static pose per section. Degrees and seconds.
 */

export type GuideMode = 'hero' | 'porthole' | 'contact'

export const POSE = {
  /** The cursor's reach: ±15° of yaw, ±8° of pitch. */
  yawMax: 15,
  pitchMax: 8,
  /** The springs' natural frequency (rad/s): critically damped, no overshoot. */
  omega: 7,
  earOmega: 14,
  /** Idle: ear flicks every 3 … 7 s per ear, blinks every 4 … 6 s. */
  flick: { min: 3, max: 7, deg: 8, dur: 0.22 },
  blink: { min: 4, max: 6, close: 0.07, open: 0.13 },
  breathHz: 0.25,
  /** Depth lays the ears back by up to 12°. */
  earBackMax: 12,
  /** A section entering: one soft forward flick of both ears. */
  enter: { deg: -10, dur: 0.5 },
  /** A successful Send: 1.2 s of head up, ears up, lights brighter. */
  sent: { dur: 1.2, pitch: 7, prick: 10, gain: 1.9 },
} as const

/** Warm gold #d9a441, linear. */
export const GOLD: [number, number, number] = [0.693, 0.358, 0.053]

export interface PoseInput {
  mode: GuideMode
  station: number
  /** The descent's depth, 0 (top) … 1 (the contact). */
  depth: number
  clock: number
  dt: number
  still: boolean
  /** The cursor (viewport px) and whether there is a mouse; her eyes on screen (px); the viewport. */
  pointer: { x: number; y: number; on: boolean }
  eyes: { x: number; y: number }
  viewport: { w: number; h: number }
  /** The focused form field's centre (viewport px), or null. */
  focus: { x: number; y: number } | null
  /** The point on the guide's line her eyes read (viewport px), or null; when a new line of it began (clock s, a nod). */
  read: { x: number; y: number } | null
  nodAt: number
  /** When a Send succeeded (clock s), or 0. */
  sentAt: number
  /** The strips' tint (linear rgb) and how far toward it. */
  tint: [number, number, number]
  tintMix: number
}

export interface PoseState {
  yaw: number
  yawV: number
  pitch: number
  pitchV: number
  back: number
  backV: number
  prick: number
  prickV: number
  flick: [{ at: number; next: number }, { at: number; next: number }]
  blink: { at: number; next: number }
  /** Each ear's flick on its own critically damped spring (deg, deg/s). */
  ear: [number, number, number, number]
  station: number
  enterAt: number
  /** The idle glance at the viewer: when the next one starts (clock s). */
  glance: number
  rng: () => number
}

/** mulberry32: a small deterministic PRNG, so a seed replays the same idle. */
function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const between = (rng: () => number, r: { min: number; max: number }) => r.min + rng() * (r.max - r.min)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function createPose(seed = 7, clock = 0): PoseState {
  const rng = prng(seed)
  return {
    yaw: 0,
    yawV: 0,
    pitch: 0,
    pitchV: 0,
    back: 0,
    backV: 0,
    prick: 0,
    prickV: 0,
    flick: [
      { at: -10, next: clock + between(rng, POSE.flick) },
      { at: -10, next: clock + between(rng, POSE.flick) + 1.3 },
    ],
    blink: { at: -10, next: clock + between(rng, POSE.blink) },
    ear: [0, 0, 0, 0],
    station: 0,
    enterAt: -10,
    glance: clock + 6 + rng() * 4,
    rng,
  }
}

/** One step of a critically damped spring (semi-implicit Euler, sub-stepped for a stable large dt). */
export function springStep(x: number, v: number, target: number, omega: number, dt: number): [number, number] {
  const n = Math.max(1, Math.ceil(dt / (1 / 120)))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    v += (omega * omega * (target - x) - 2 * omega * v) * h
    x += v * h
  }
  return [x, v]
}

/**
 * Where each section has her look in the porthole (yaw negative = toward the words on the left,
 * pitch positive = up): toward its heading, up and to the left; a little different per station.
 */
export function sectionLook(station: number): { yaw: number; pitch: number } {
  switch (station) {
    case 2:
      return { yaw: -14, pitch: 6 }
    case 3:
    case 4:
    case 5:
      return { yaw: -13, pitch: 5 }
    case 6:
      return { yaw: -12, pitch: 5 }
    case 7:
      return { yaw: -12, pitch: 4 }
    case 8:
      return { yaw: -12, pitch: 3 }
    case 9:
      return { yaw: -14, pitch: 6 }
    default:
      return { yaw: -10, pitch: 2 }
  }
}

/** The ears' rest lean for a depth (0 … 1): 0 → 12° back. */
export const earBackFor = (depth: number) => POSE.earBackMax * clamp(depth, 0, 1)

/** The head's target: the cursor (dark windows), the section's look (porthole, with a little of the cursor), the form's focus (contact). */
export function headTarget(i: PoseInput): { yaw: number; pitch: number } {
  const look = sectionLook(i.station)
  const aim = (x: number, y: number, share: number) => {
    const dx = (x - i.eyes.x) / Math.max(1, 0.35 * i.viewport.w)
    const dy = (i.eyes.y - y) / Math.max(1, 0.35 * i.viewport.h)
    return { yaw: clamp(dx * POSE.yawMax, -POSE.yawMax, POSE.yawMax) * share, pitch: clamp(dy * POSE.pitchMax, -POSE.pitchMax, POSE.pitchMax) * share }
  }
  if (i.mode === 'contact' && i.focus) return aim(i.focus.x, i.focus.y, 1)
  // Reading the guide's line: toward the point being read (a full turn's share in the porthole too).
  if (i.read && !i.still) return aim(i.read.x, i.read.y, 1)
  if (i.mode === 'porthole') {
    if (!i.pointer.on || i.still) return look
    const c = aim(i.pointer.x, i.pointer.y, 0.3)
    return { yaw: clamp(look.yaw + c.yaw, -POSE.yawMax, POSE.yawMax), pitch: clamp(look.pitch + c.pitch, -POSE.pitchMax, POSE.pitchMax) }
  }
  if (!i.pointer.on || i.still) return { yaw: -6, pitch: 0 }
  return aim(i.pointer.x, i.pointer.y, 1)
}

/** A flick's shape over its duration: up fast, down slow (0 … 1 … 0). */
const pulse = (t: number, dur: number) => (t < 0 || t > dur ? 0 : Math.sin(Math.PI * Math.pow(t / dur, 0.6)))

/** Step her life one frame and write the performance Figure applies. */
export function stepPose(s: PoseState, i: PoseInput, out: Perf): void {
  const t = i.clock
  const sent = i.sentAt > 0 && t - i.sentAt >= 0 && t - i.sentAt < POSE.sent.dur ? Math.sin((Math.PI * (t - i.sentAt)) / POSE.sent.dur) : 0
  const target = headTarget(i)
  // Every 6 … 10 s, a ~1 s glance at the viewer (straight out of the frame).
  if (!i.still && !i.focus) {
    if (t >= s.glance + 1.1) s.glance = t + 6 + s.rng() * 4
    if (t >= s.glance) {
      target.yaw = 0
      target.pitch = 0
    }
  }
  // A line break: a tiny nod (down and back, 0.35 s).
  const nod = i.still ? 0 : -3 * pulse(t - i.nodAt, 0.35)
  const back = earBackFor(i.depth)
  if (s.station !== i.station) {
    if (s.station !== 0) s.enterAt = t
    s.station = i.station
  }

  if (i.still) {
    // A static pose per section: no springs, no idle, no flicks or blinks.
    s.yaw = target.yaw
    s.pitch = target.pitch
    s.back = back
    s.prick = 0
    s.yawV = s.pitchV = s.backV = s.prickV = 0
    out.lids = 0
    out.ears.flickL = out.ears.flickR = 0
    out.breath = 0
  } else {
    ;[s.yaw, s.yawV] = springStep(s.yaw, s.yawV, target.yaw, POSE.omega, i.dt)
    ;[s.pitch, s.pitchV] = springStep(s.pitch, s.pitchV, target.pitch + nod + POSE.sent.pitch * sent, POSE.omega, i.dt)
    ;[s.back, s.backV] = springStep(s.back, s.backV, back - 0.6 * back * sent, POSE.earOmega / 3, i.dt)
    ;[s.prick, s.prickV] = springStep(s.prick, s.prickV, POSE.sent.prick * sent, POSE.earOmega, i.dt)
    // Idle flicks, each ear on its own clock; a section's entry flicks both forward once.
    // Each ear: a step target (held for the flick's duration) smoothed by its own critically damped
    // spring, so the motion is silky and frame-rate independent; the schedule is drawn once per flick.
    const entering = t - s.enterAt >= 0 && t - s.enterAt < POSE.enter.dur ? POSE.enter.deg : 0
    for (let k = 0; k < 2; k++) {
      const f = s.flick[k]
      if (t >= f.next) {
        f.at = t
        f.next = t + between(s.rng, POSE.flick)
      }
      const want = (t - f.at < POSE.flick.dur ? POSE.flick.deg : 0) + entering
      ;[s.ear[k * 2], s.ear[k * 2 + 1]] = springStep(s.ear[k * 2], s.ear[k * 2 + 1], want, POSE.earOmega, i.dt)
    }
    out.ears.flickL = s.ear[0]
    out.ears.flickR = s.ear[2]
    // Blink.
    if (t >= s.blink.next) {
      s.blink.at = t
      s.blink.next = t + between(s.rng, POSE.blink)
    }
    const b = t - s.blink.at
    out.lids = b < POSE.blink.close ? b / POSE.blink.close : b < POSE.blink.close + POSE.blink.open ? 1 - (b - POSE.blink.close) / POSE.blink.open : 0
    out.breath = Math.sin(2 * Math.PI * POSE.breathHz * t)
  }

  // The rig turns the head to screen right for a positive bone yaw: the performance's sign is flipped
  // here so that everywhere above negative yaw means toward the words on the left.
  // In the porthole the lens eyes and strips burn brighter (the brightest thing in the circle; the tint reads).
  const docked = i.mode === 'porthole' ? 1 : 0
  out.head.yaw = -s.yaw
  out.head.pitch = s.pitch
  // The eyes are lenses: they follow the head by a third, nothing of their own.
  out.eyes.yaw = -s.yaw / 3
  out.eyes.pitch = s.pitch / 3
  out.body.yaw = 0
  out.jaw = 0
  out.ears.back = s.back
  out.ears.prick = s.prick
  out.ears.turn = 0
  out.ears.glow = 0
  for (let k = 0; k < 7; k++) out.sys[k] = 1
  out.bright = Math.max(sent, 0.7 * docked)
  out.band = -1
  out.tint.r = i.tint[0]
  out.tint.g = i.tint[1]
  out.tint.b = i.tint[2]
  out.tint.mix = i.tintMix
  out.tint.gain = (1 + 0.8 * docked) * (1 + (POSE.sent.gain - 1) * sent)
}

/** Whether her springs are still settling (the world keeps the frames coming meanwhile). */
export function poseSettling(s: PoseState): boolean {
  return Math.abs(s.yawV) > 0.05 || Math.abs(s.pitchV) > 0.05 || Math.abs(s.backV) > 0.05 || Math.abs(s.prickV) > 0.05
}

/**
 * The Navigator's living systems (screenplay v2): gaze, blink, ears, breath, the seven systems'
 * lights and the eyes' brightness. Pure: `stepLiving` reads a `LivingInput` (the caller maps `nav`
 * into it), advances a `LivingState` and writes a `Perf`, which both figures (world, dock) apply.
 * Angles are in degrees; times in seconds on the world's clock.
 */

export interface LivingInput {
  /** The cursor in CSS px, and whether there is one on the page. */
  pointer: { x: number; y: number; on: boolean }
  /** Where the eyes are on screen (CSS px), the head's height in px, and whether the figure is visible. */
  anchor: { eyes: { x: number; y: number }; headPx: number; on: boolean }
  viewport: { w: number; h: number }
  beat: string
  progress: number
  /** When the current line began (clock), until when it is typed, when the form was sent (0 = never). */
  spokeAt: number
  typingUntil: number
  transmitAt: number
  /** The mission chosen: when, and which layers (indices 0 … 6), or null. */
  missionAt: number
  missionLayers: number[] | null
  hover: { layer: number | null }
  /** Reduced motion: everything at rest. */
  still: boolean
  clock: number
  dt: number
}

export interface Perf {
  eyes: { yaw: number; pitch: number }
  head: { yaw: number; pitch: number }
  body: { yaw: number }
  /** 0 open … 1 closed. */
  lids: number
  /** 0 … 1; written by the caller from `jawOpen()`, zeroed here only when `still`. */
  jaw: number
  ears: { prick: number; turn: number; glow: number; back: number; flickL: number; flickR: number }
  /** −1 … 1, the 5.2 s cycle. */
  breath: number
  /** The emissive strips' tint (linear 0 … 1 rgb), how far toward it (0 … 1) and their brightness multiplier (1 = as authored). */
  tint: { r: number; g: number; b: number; mix: number; gain: number }
  /** The seven systems' light, root to crown (0 … ~1.4). */
  sys: Float32Array
  /** 0 … 1: the disks' extra brightness. */
  bright: number
  /** −1, or the band that flares. */
  band: number
}

export const EYE_LIMIT = 12
export const DAMP = { eyes: 18, head: 6, body: 3 } as const
export const BLINK = { close: 0.07, open: 0.12, slow: 0.4, min: 3, max: 6 } as const
export const EAR = { k: 90, c: 11, prick: 6, turn: 4, flick: 0.18 } as const
export const BREATH_PERIOD = 5.2
export const IGNITION_GAP = 0.11
export const MISSION_GAP = 0.09

export function createPerf(): Perf {
  return {
    eyes: { yaw: 0, pitch: 0 },
    head: { yaw: 0, pitch: 0 },
    body: { yaw: 0 },
    lids: 0,
    jaw: 0,
    ears: { prick: 0, turn: 0, glow: 0, back: 0, flickL: 0, flickR: 0 },
    breath: 0,
    tint: { r: 1, g: 1, b: 1, mix: 0, gain: 1 },
    sys: new Float32Array(7),
    bright: 0,
    band: -1,
  }
}

type BlinkPhase = 'open' | 'closing' | 'opening'

export interface LivingState {
  rng: () => number
  eyes: { yaw: number; pitch: number }
  head: { yaw: number; pitch: number }
  body: { yaw: number }
  blink: { phase: BlinkPhase; t: number; nextAt: number; close: number; open: number }
  ears: { prick: number; prickV: number; turn: number; turnV: number; glow: number }
  wander: { yaw: number; pitch: number; nextAt: number }
  sys: Float32Array
  bright: number
  /** The clock at which the systems start powering on (root → crown, 110 ms apart). */
  powerOn: number
  last: { spokeAt: number; beat: string | null; transmitAt: number }
}

/** mulberry32: a small deterministic PRNG, so idle gaze and blinks replay the same for a seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createLivingState(seed = 1, powerOn = 0): LivingState {
  const rng = mulberry32(seed)
  return {
    rng,
    eyes: { yaw: 0, pitch: 0 },
    head: { yaw: 0, pitch: 0 },
    body: { yaw: 0 },
    blink: { phase: 'open', t: 0, nextAt: BLINK.min + rng() * (BLINK.max - BLINK.min), close: BLINK.close, open: BLINK.open },
    ears: { prick: 0, prickV: 0, turn: 0, turnV: 0, glow: 0 },
    wander: { yaw: 0, pitch: 0, nextAt: 4 + rng() * 3 },
    sys: new Float32Array(7),
    bright: 0,
    powerOn,
    last: { spokeAt: Number.NaN, beat: null, transmitAt: Number.NaN },
  }
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const DEG = 180 / Math.PI
/** Exponential approach: the fraction of the gap closed in dt at `rate` per second. */
const approach = (v: number, target: number, rate: number, dt: number) => v + (target - v) * (1 - Math.exp(-rate * dt))

function startBlink(s: LivingState, close: number, open: number) {
  if (s.blink.phase !== 'open') return
  s.blink.phase = 'closing'
  s.blink.t = 0
  s.blink.close = close
  s.blink.open = open
}

/** Advance the state by `input.dt` and write the performance into `out`. */
export function stepLiving(s: LivingState, input: LivingInput, out: Perf): void {
  const dt = clamp(input.dt, 0, 0.1)
  const { clock } = input
  const first = s.last.beat === null
  const newLine = !first && input.spokeAt !== s.last.spokeAt
  const newBeat = !first && input.beat !== s.last.beat
  const sent = !first && input.transmitAt !== s.last.transmitAt && input.transmitAt > 0
  s.last.spokeAt = input.spokeAt
  s.last.beat = input.beat
  s.last.transmitAt = input.transmitAt

  const typing = clock < input.typingUntil && clock >= input.spokeAt
  const dx = input.pointer.x - input.anchor.eyes.x
  const dy = input.pointer.y - input.anchor.eyes.y
  const headPx = Math.max(1, input.anchor.headPx)
  const onFace = input.pointer.on && input.anchor.on && Math.hypot(dx, dy) < headPx * 0.6

  if (input.still) {
    s.eyes.yaw = s.eyes.pitch = s.head.yaw = s.head.pitch = s.body.yaw = 0
    s.blink.phase = 'open'
    s.ears.prick = s.ears.prickV = s.ears.turn = s.ears.turnV = s.ears.glow = 0
    s.bright = 0
    const chosen = input.missionLayers
    for (let i = 0; i < 7; i++) s.sys[i] = chosen ? (chosen.includes(i) ? 1 : 0.25) : 1
    write(s, out, 0)
    out.jaw = 0
    out.band = input.hover.layer ?? -1
    return
  }

  // Gaze: angles to the cursor over a focal length of 1.6 head heights; idle wander otherwise.
  let tYaw: number
  let tPitch: number
  if (input.pointer.on && input.anchor.on) {
    const f = 1.6 * headPx
    tYaw = Math.atan2(dx, f) * DEG
    tPitch = -Math.atan2(dy, f) * DEG
  } else {
    if (clock >= s.wander.nextAt) {
      // Every 4–7 s: a point near the camera, or back to it.
      const away = s.wander.yaw === 0 && s.wander.pitch === 0
      s.wander.yaw = away ? (s.rng() - 0.5) * 16 : 0
      s.wander.pitch = away ? (s.rng() - 0.5) * 8 : 0
      s.wander.nextAt = clock + (away ? 1.2 + s.rng() * 1.5 : 4 + s.rng() * 3)
    }
    tYaw = s.wander.yaw
    tPitch = s.wander.pitch
  }
  tYaw = clamp(tYaw, -EYE_LIMIT, EYE_LIMIT)
  tPitch = clamp(tPitch, -EYE_LIMIT, EYE_LIMIT)
  s.eyes.yaw = clamp(approach(s.eyes.yaw, tYaw, DAMP.eyes, dt), -EYE_LIMIT, EYE_LIMIT)
  s.eyes.pitch = clamp(approach(s.eyes.pitch, tPitch, DAMP.eyes, dt), -EYE_LIMIT, EYE_LIMIT)
  s.head.yaw = approach(s.head.yaw, tYaw / 3, DAMP.head, dt)
  s.head.pitch = approach(s.head.pitch, tPitch / 3, DAMP.head, dt)
  s.body.yaw = approach(s.body.yaw, tYaw / 10, DAMP.body, dt)

  // Blink: a state machine; forced on a new line and a new beat, slow when the form is sent.
  if (sent) startBlink(s, BLINK.slow * (BLINK.close / (BLINK.close + BLINK.open)), BLINK.slow * (BLINK.open / (BLINK.close + BLINK.open)))
  else if (newLine || newBeat) startBlink(s, BLINK.close, BLINK.open)
  else if (s.blink.phase === 'open' && clock >= s.blink.nextAt) startBlink(s, BLINK.close, BLINK.open)
  let lids = 0
  if (s.blink.phase !== 'open') {
    s.blink.t += dt
    if (s.blink.phase === 'closing') {
      if (s.blink.t >= s.blink.close) {
        s.blink.phase = 'opening'
        s.blink.t -= s.blink.close
      } else lids = s.blink.t / s.blink.close
    }
    if (s.blink.phase === 'opening') {
      if (s.blink.t >= s.blink.open) {
        s.blink.phase = 'open'
        s.blink.nextAt = clock + BLINK.min + s.rng() * (BLINK.max - BLINK.min)
      } else lids = 1 - s.blink.t / s.blink.open
    }
  }

  // Ears: a spring (k 90, c 11, semi-implicit Euler) toward the prick and turn targets.
  const flick = clock - input.spokeAt
  const prickTarget = flick >= 0 && flick < EAR.flick ? EAR.prick : 0
  const turnTarget = input.pointer.on && input.anchor.on ? Math.sign(dx) * EAR.turn : 0
  spring(s.ears, 'prick', 'prickV', prickTarget, dt)
  spring(s.ears, 'turn', 'turnV', turnTarget, dt)
  const sentFor = input.transmitAt > 0 ? clock - input.transmitAt : -1
  const glowTarget = sentFor >= 0 && sentFor < 1.2 ? 1 : typing ? 0.7 : 0
  s.ears.glow = approach(s.ears.glow, glowTarget, 10, dt)

  // Systems: ignition root → crown from powerOn; a mission lights its layers, dims the rest; hover flares one.
  const chosen = input.missionLayers
  for (let i = 0; i < 7; i++) {
    let target = clock >= s.powerOn + i * IGNITION_GAP ? 1 : 0
    if (chosen) {
      const picked = chosen.includes(i)
      const lit = clock >= input.missionAt + chosen.indexOf(i) * MISSION_GAP
      target = picked ? (lit ? 1 : 0.25) : 0.25
    }
    if (input.hover.layer === i) target = 1.4
    s.sys[i] = approach(s.sys[i], target, 10, dt)
  }

  s.bright = approach(s.bright, typing || onFace ? 1 : 0, 8, dt)
  write(s, out, Math.sin((2 * Math.PI * clock) / BREATH_PERIOD))
  out.lids = lids
  out.band = input.hover.layer ?? -1
}

function spring(e: LivingState['ears'], x: 'prick' | 'turn', v: 'prickV' | 'turnV', target: number, dt: number) {
  const acc = -EAR.k * (e[x] - target) - EAR.c * e[v]
  e[v] += acc * dt
  e[x] += e[v] * dt
}

function write(s: LivingState, out: Perf, breath: number) {
  out.eyes.yaw = s.eyes.yaw
  out.eyes.pitch = s.eyes.pitch
  out.head.yaw = s.head.yaw
  out.head.pitch = s.head.pitch
  out.body.yaw = s.body.yaw
  out.lids = 0
  out.ears.prick = s.ears.prick
  out.ears.turn = s.ears.turn
  out.ears.glow = s.ears.glow
  out.breath = breath
  out.sys.set(s.sys)
  out.bright = s.bright
}

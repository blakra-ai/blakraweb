import type { Rect, Sticky } from './windows'

/*
 * The scroll journey, pure: where the guide is on the page at this scroll, and how she gets
 * there. In the hero and the contact she stands at the window's framing (the cinematic crop).
 * Everywhere between, she WALKS the paper: one size (32 vh, her hooves on a baseline near the
 * viewport's floor), along the right margin, to a place per station (beside the nearest case at
 * the proof, beside the sealed well at the payload), turning to face the way she travels. A damped
 * spring carries her between places (inertia, no teleport); the gait follows the ground she covers
 * (the walk clip's rate = speed / stride, so the hooves do not slide), idle when the scroll stops.
 * Her head looks at the item or ahead. Everything here is per frame and reads no layout: the rects
 * arrive from the reflow (windows.ts, Journey.tsx).
 */

export type JourneyMode = 'hero' | 'paper' | 'contact'

/** The anchors Journey.tsx measures on reflow (page rects, CSS px). */
export interface JourneyAnchors {
  /** The words' blocks (page rects): she never stands over one. */
  text: Rect[]
  /** The proof's case rows and which one is the nearest (its id). */
  rows: { id: string; rect: Rect }[]
  nearest: string | null
  /** The payload's sealed well. */
  well: Rect | null
  /** The stage's ink well: its sticky hold (page rect, the hold's sticky rule) and the well's centre and radius inside the hold. */
  stage: { hold: Rect; sticky: Sticky | null; ring: { x: number; y: number; r: number } } | null
}

export interface JourneyInput {
  station: number
  scrollY: number
  viewport: { w: number; h: number }
  clock: number
  /** The hero and contact windows (viewport rects) with their guide framing, or null when absent. */
  hero: { view: Rect; eyes: { x: number; y: number }; figurePx: number } | null
  stage: { view: Rect; ring: { x: number; y: number; r: number } } | null
  contact: { view: Rect; eyes: { x: number; y: number }; figurePx: number } | null
  anchors: JourneyAnchors
}

export interface JourneyTarget {
  mode: JourneyMode
  /** Her eyes in viewport px, her whole height in px. */
  x: number
  y: number
  figurePx: number
  /** What she looks at (viewport px), or null to look ahead. */
  look: { x: number; y: number } | null
  /** The scroll this target is for (page px). */
  scrollY: number
  /** Whether her place is clear of the words (false: she fades out rather than stand over a line). */
  clear?: boolean
}

/** Her height on the paper as a share of the viewport's; her hooves this far above its floor; her eyes this far up her height. */
export const PAPER_SHARE = 0.32
export const FLOOR = 0.04
export const EYES_UP = 0.8
/** Where she walks to, per station, as a share of the viewport's width (the right margin; the words keep the left). */
export const PATH_X: Record<number, number> = { 2: 0.8, 3: 0.87, 4: 0.8, 5: 0.84, 6: 0.88, 7: 0.8, 8: 0.87 }
/** Page px walked per px scrolled: at a reading scroll (≈ 700 px/s) her stride frequency sits near 1.2 Hz. */
export const SCROLL_GROUND = 0.3
/** She walks while the scroll moved within this long (s); then she stops and plants. */
export const QUIET_S = 0.15
/** Facing (degrees about the vertical): 0 toward the reader; her profile at ±90 (scrolling down she walks one way, up the other). */
export const FACE = { up: 90, down: -90 } as const
/** The spring: natural frequency (rad/s) and damping ratio (slightly under critical: a settle, no bounce). */
export const SPRING = { w: 1.6, zeta: 0.95 } as const
/** The walk starts above this speed (px/s) and is full at the second; the turn follows the heading above the third. */
export const WALK = { from: 8, full: 60, turn: 12 } as const

/** Where she should be for this scroll. */
export function journeyTarget(i: JourneyInput): JourneyTarget {
  const { w, h } = i.viewport
  const s = i.station
  if (s <= 1 && i.hero) return { mode: 'hero', x: i.hero.view.x + i.hero.eyes.x, y: i.hero.view.y + i.hero.eyes.y, figurePx: i.hero.figurePx, look: null, scrollY: i.scrollY }
  if (s >= 9 && i.contact) return { mode: 'contact', x: i.contact.view.x + i.contact.eyes.x, y: i.contact.view.y + i.contact.eyes.y, figurePx: i.contact.figurePx, look: null, scrollY: i.scrollY }
  const figurePx = PAPER_SHARE * h
  const y = h * (1 - FLOOR) - EYES_UP * figurePx
  let x = (PATH_X[s] ?? 0.85) * w
  let look: JourneyTarget['look'] = null
  if (s === 5 && i.anchors.rows.length) {
    // Beside the nearest case (or the first), looking at it.
    const row = i.anchors.rows.find((r) => r.id === i.anchors.nearest) ?? i.anchors.rows[0]
    look = { x: row.rect.x + row.rect.w, y: row.rect.y + row.rect.h / 2 - i.scrollY }
  } else if (s === 7 && i.anchors.well) {
    // Approaching the sealed well: as near as the margin allows, looking at it.
    const wl = i.anchors.well
    x = Math.min(x, Math.max(wl.x + wl.w + 0.45 * figurePx, 0.7 * w))
    look = { x: wl.x + wl.w / 2, y: wl.y + wl.h / 2 - i.scrollY }
  } else if (s >= 2 && s <= 4 && i.stage) {
    look = { x: i.stage.view.x + i.stage.ring.x, y: i.stage.view.y + i.stage.ring.y }
  }
  x = clearOfText(x, y, figurePx, w, i.scrollY, i.anchors.text)
  // Where no place on the line is clear of the words, she steps out of sight until one is.
  const clear = textOverlap(x, y, figurePx, i.scrollY, i.anchors.text) === 0
  return { mode: 'paper', x, y, figurePx, look, scrollY: i.scrollY, clear }
}

/** Her footprint around her eyes (shares of her height): half its width, and how far it reaches above the eyes and below them (the hooves). */
export const FOOT = { half: 0.55, up: 0.25, down: EYES_UP + 0.02 } as const

/** How much of her footprint at eyes-x `x` covers the words (px²). */
export function textOverlap(x: number, y: number, fp: number, scrollY: number, text: Rect[]): number {
  const l = x - FOOT.half * fp
  const r = x + FOOT.half * fp
  const t = y - FOOT.up * fp + scrollY
  const b = y + FOOT.down * fp + scrollY
  let a = 0
  for (const q of text) {
    const ow = Math.min(r, q.x + q.w) - Math.max(l, q.x)
    const oh = Math.min(b, q.y + q.h) - Math.max(t, q.y)
    if (ow > 0 && oh > 0) a += ow * oh
  }
  return a
}

/** The x nearest `want` (the right margin first, then anywhere across) where her footprint is clear of the words (the least covered one if none is). */
export function clearOfText(want: number, y: number, fp: number, w: number, scrollY: number, text: Rect[]): number {
  const lo = FOOT.half * fp
  const hi = w - FOOT.half * fp
  let best = Math.min(Math.max(want, lo), hi)
  let bestA = textOverlap(best, y, fp, scrollY, text)
  if (bestA === 0) return best
  let bestD = Infinity
  for (let x = hi; x >= lo; x -= 16) {
    const a = textOverlap(x, y, fp, scrollY, text)
    const d = Math.abs(x - want)
    if (a < bestA || (a === bestA && d < bestD)) {
      best = x
      bestA = a
      bestD = d
    }
  }
  return best
}

export interface JourneyState {
  mode: JourneyMode
  x: number
  y: number
  vx: number
  vy: number
  figurePx: number
  /** Degrees: the body's bank and pitch (none while she walks), her facing (0 toward the words, 90 to the right), the head's yaw and pitch (added to her rest turn). */
  bank: number
  pitch: number
  facing: number
  headYaw: number
  headPitch: number
  /** The hover's lift in px (none: she walks). */
  hover: number
  /** The page ground she has walked (px, monotonic: the gait steps by its difference), whether she walks, and the scroll's last value and quiet time. */
  ground: number
  walking: boolean
  lastScroll: number
  quiet: number
  /** Her opacity on the paper: 0 while no place on the line is clear of the words. */
  alpha: number
  /** Whether she has been placed (the first frame snaps). */
  placed: boolean
}

export function createJourney(): JourneyState {
  return { mode: 'hero', x: 0, y: 0, vx: 0, vy: 0, figurePx: 1, bank: 0, pitch: 0, facing: 0, headYaw: 0, headPitch: 0, hover: 0, alpha: 1, ground: 0, walking: false, lastScroll: 0, quiet: 1, placed: false }
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const DEG = 180 / Math.PI

/**
 * One frame: the spring toward the target (semi-implicit Euler, stable at any dt under 0.1 s),
 * the gait and the facing from the scroll, the head toward the look point or the heading.
 * `still`, the windows and a change of shot place her at the target at once.
 */
export function stepJourney(s: JourneyState, t: JourneyTarget, dt: number, _clock: number, still = false): void {
  // A change of shot (hero ↔ paper ↔ contact) is a cut: she is placed at once, never flown between framings; inside a window she holds its framing.
  const cut = s.placed && s.mode !== t.mode
  s.mode = t.mode
  if (still || !s.placed || t.mode !== 'paper') {
    s.x = t.x
    s.y = t.y
    s.vx = s.vy = 0
    s.figurePx = t.figurePx
    s.bank = s.pitch = s.facing = s.headYaw = s.headPitch = s.hover = 0
    s.walking = false
    s.alpha = t.clear === false ? 0 : 1
    s.lastScroll = t.scrollY
    s.quiet = 1
    s.placed = true
    return
  }
  if (cut) {
    s.x = t.x
    s.vx = 0
    s.lastScroll = t.scrollY
  }
  const d = clamp(dt, 0, 0.1)
  const w = SPRING.w
  const c = 2 * SPRING.zeta * w
  // On the paper her hooves stay on the ground line at one size; only her place along it travels (she walks there).
  s.vx += (w * w * (t.x - s.x) - c * s.vx) * d
  s.x += s.vx * d
  s.y = t.y
  s.vy = 0
  s.figurePx = t.figurePx
  // Over the words she fades out (0.25 s); clear again, she fades back in.
  s.alpha += ((t.clear === false ? 0 : 1) - s.alpha) * (1 - Math.exp(-d / 0.25))
  const speed = Math.hypot(s.vx, s.vy)
  // The gait: on the paper she walks the page's travel (the scroll, and her own glide along the margin), facing the way it goes; in the windows she stands.
  const dScroll = t.scrollY - s.lastScroll
  s.lastScroll = t.scrollY
  s.quiet = Math.abs(dScroll) > 0.5 ? 0 : s.quiet + d
  const paper = t.mode === 'paper'
  const face = !paper ? 0 : Math.abs(dScroll) > 0.5 ? (dScroll > 0 ? FACE.down : FACE.up) : s.facing
  const before = s.facing
  s.facing += (face - s.facing) * (1 - Math.exp(-4 * d))
  // Turning: a 3° lean into the turn, and 30 % less ground while she comes round.
  const turnRate = d > 0 ? (s.facing - before) / d : 0
  const turning = Math.abs(face - s.facing) > 10
  s.bank += (clamp(turnRate / 90, -1, 1) * 3 - s.bank) * (1 - Math.exp(-6 * d))
  s.walking = paper && (s.quiet < QUIET_S || speed > WALK.from)
  if (paper) s.ground += (Math.abs(dScroll) * SCROLL_GROUND + Math.abs(s.vx) * d) * (turning ? 0.7 : 1)
  // The head: at the item when there is one, else ahead along the heading.
  let yaw = 0
  let hp = 0
  if (t.look) {
    yaw = clamp(Math.atan2(t.look.x - s.x, 1.6 * s.figurePx) * DEG, -35, 35)
    hp = clamp(Math.atan2(t.look.y - s.y, 1.6 * s.figurePx) * DEG, -20, 20)
  } else if (speed > 20) {
    yaw = clamp(Math.atan2(s.vx, 1.6 * speed) * DEG, -30, 30)
    hp = clamp(Math.atan2(s.vy, 1.6 * speed) * DEG, -15, 15)
  }
  // On the paper she walks in profile: the head turns toward the reader a little, and at the item.
  if (paper) yaw = (t.look ? yaw : 0) + (s.facing > 0 ? -12 : 12)
  s.headYaw += (yaw - s.headYaw) * (1 - Math.exp(-5 * d))
  s.headPitch += (hp - s.headPitch) * (1 - Math.exp(-5 * d))
}

/** Which of the dark windows she is inside (her eyes), else 'paper': who draws her this frame. */
export function journeyOwner(s: JourneyState, windows: { id: string; view: Rect }[]): string {
  for (const w of windows) if (s.x >= w.view.x && s.x <= w.view.x + w.view.w && s.y >= w.view.y && s.y <= w.view.y + w.view.h) return w.id
  return 'paper'
}

/** Whether the spring is still travelling (the frames keep coming). */
export function journeyMoving(s: JourneyState, t: JourneyTarget): boolean {
  return Math.hypot(s.vx, s.vy) > 2 || Math.hypot(t.x - s.x, t.y - s.y) > 1 || Math.abs(t.figurePx - s.figurePx) > 0.5 || s.walking || Math.abs(s.bank) > 0.05 || Math.abs((t.clear === false ? 0 : 1) - s.alpha) > 0.01
}

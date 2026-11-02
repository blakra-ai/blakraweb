import type { Rect } from './windows'

/*
 * The porthole, pure: the guide never walks or relocates. Between the two dark windows she lives
 * in ONE small round dark window docked at the right of the paper (a scissored pass of the same
 * canvas, World.tsx), framed as a bust. This file decides where it is (the margin, the corner, or
 * nowhere), how the hero's framing contracts into it and how it opens back into the contact's,
 * and whether it must step aside (a line of text or an ink well's disc in its way). Everything is
 * a pure function of numbers the world already has per frame; the rects come from the reflow.
 */

export type PortholeMode = 'margin' | 'corner' | 'hidden'

export const PORTHOLE = {
  /** Under this width there is no three.js at all (Stage.tsx): hidden on the paper. */
  phone: 768,
  /** From this width a right margin is reserved for it (global.css `--porthole-gutter`); under it, the corner. */
  margin: 1200,
  /** Its centre's height in the margin, as a share of the viewport. */
  yShare: 0.62,
  /** Diameter in the margin: clamp(190px, 15vw, 230px); in the corner: clamp(112px, 9vw, 120px). */
  min: 190,
  vw: 0.15,
  max: 230,
  cornerMin: 112,
  cornerVw: 0.09,
  cornerMax: 120,
  /** Its clearance from the viewport's right edge and from the words (the gutter is d + 2 gaps). */
  gap: 24,
  /** The corner's inset from the right and bottom edges. */
  inset: 20,
  /** The hero contracts into it over at least this much scroll. */
  contract: 600,
  /** Opacity's fade when something is in its way (ms). */
  fadeMs: 300,
} as const

export interface PortholeLayout {
  mode: PortholeMode
  /** Centre (viewport px) and diameter (px); zero when hidden. */
  cx: number
  cy: number
  d: number
  /** The right margin the paper reserves for it (px; 0 unless docked in the margin). */
  gutter: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Where the porthole sits for a viewport of vw × vh CSS px. */
export function portholeLayout(vw: number, vh: number): PortholeLayout {
  if (vw < PORTHOLE.phone) return { mode: 'hidden', cx: 0, cy: 0, d: 0, gutter: 0 }
  if (vw >= PORTHOLE.margin) {
    const d = clamp(PORTHOLE.vw * vw, PORTHOLE.min, PORTHOLE.max)
    // Never so low that it leaves the screen on a short window.
    const cy = Math.min(PORTHOLE.yShare * vh, vh - PORTHOLE.inset - d / 2)
    return { mode: 'margin', cx: vw - PORTHOLE.gap - d / 2, cy, d, gutter: Math.ceil(d + 2 * PORTHOLE.gap) }
  }
  const d = clamp(PORTHOLE.cornerVw * vw, PORTHOLE.cornerMin, PORTHOLE.cornerMax)
  return { mode: 'corner', cx: vw - PORTHOLE.inset - d / 2, cy: vh - PORTHOLE.inset - d / 2, d, gutter: 0 }
}

/** Whether a circle (centre, radius) comes within `pad` px of a rect. */
export function circleHitsRect(cx: number, cy: number, r: number, rect: Rect, pad = 0): boolean {
  const nx = clamp(cx, rect.x, rect.x + rect.w)
  const ny = clamp(cy, rect.y, rect.y + rect.h)
  const rr = r + pad
  return (cx - nx) ** 2 + (cy - ny) ** 2 < rr * rr
}

/** Whether two circles come within `pad` px of each other. */
export function circlesHit(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }, pad = 0): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + pad
}

/** Whether the docked porthole has something in its way: any word's rect or any well's disc (viewport px). */
export function portholeBlocked(l: PortholeLayout, text: readonly Rect[], discs: readonly { x: number; y: number; r: number }[], pad = 8): boolean {
  if (l.mode === 'hidden') return true
  const r = l.d / 2
  for (const t of text) if (circleHitsRect(l.cx, l.cy, r, t, pad)) return true
  for (const c of discs) if (circlesHit({ x: l.cx, y: l.cy, r }, c, pad)) return true
  return false
}

/** Opacity eased toward its target at a constant rate: 0 → 1 or 1 → 0 in `PORTHOLE.fadeMs`. */
export function stepFade(o: number, target: number, dt: number, still = false): number {
  if (still) return target
  const k = dt / (PORTHOLE.fadeMs / 1000)
  return o < target ? Math.min(target, o + k) : Math.max(target, o - k)
}

/** Smoothstep on 0 … 1. */
export const ease = (t: number) => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}
const easeOut = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3

/** The hero's contraction (0 framed as the hero … 1 docked) for a scroll: linear over max(600 px, ¾ of the hero's height). */
export function heroContraction(scrollY: number, heroH: number): number {
  return clamp(scrollY / Math.max(PORTHOLE.contract, 0.75 * heroH), 0, 1)
}

/**
 * The contact's expansion (0 docked … 1 framed as the contact): it begins once the window's top
 * has passed above the porthole (the circle then lies inside the dark window, so the opening never
 * crosses the paper) and ends `span` px of scroll later (600, or what the page has left).
 */
export function contactExpansion(contactTop: number, l: PortholeLayout, span: number): number {
  const start = l.cy - l.d / 2 - 8
  return clamp((start - contactTop) / Math.max(1, span), 0, 1)
}

/** The scroll span of the contact's expansion: 600 px, or the scroll the page has left once the window passes the porthole. */
export function contactSpan(contactPageTop: number, l: PortholeLayout, maxScroll: number): number {
  const startScroll = contactPageTop - (l.cy - l.d / 2 - 8)
  return clamp(maxScroll - startScroll - 40, 160, PORTHOLE.contract)
}

/** A rounded box (viewport px) and its corner radius: the shape the porthole's pass clips to. */
export interface Aperture extends Rect {
  r: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * The aperture between a window's view rect (t = 0, the window's own frame radius) and the docked
 * circle (t = 1, radius d / 2). The horizontal edges ease out (they leave the words' column
 * early), the vertical ones ease in-out; everything is continuous in t.
 */
export function apertureBetween(win: Rect, l: PortholeLayout, t: number, frameRadius: number): Aperture {
  const ex = easeOut(t)
  const ey = ease(t)
  const r = l.d / 2
  const x0 = lerp(win.x, l.cx - r, ex)
  const x1 = lerp(win.x + win.w, l.cx + r, ex)
  const y0 = lerp(win.y, l.cy - r, ey)
  const y1 = lerp(win.y + win.h, l.cy + r, ey)
  const w = Math.max(1, x1 - x0)
  const h = Math.max(1, y1 - y0)
  return { x: x0, y: y0, w, h, r: Math.min(lerp(frameRadius, r, ey), w / 2, h / 2) }
}

/**
 * The column a paper-side aperture may show in (viewport px): the reserved gutter in the margin,
 * the corner's own column under it. Outside the dark window the porthole's pass is clipped to it,
 * so the opening never paints over a line of the paper.
 */
export function paperColumn(l: PortholeLayout, vw: number): number {
  return l.mode === 'margin' ? vw - l.gutter + PORTHOLE.gap / 2 : l.cx - l.d / 2 - 4
}

/* ---------- the bust inside it ---------- */

/** The bust's framing inside a docked circle: eyes right of and above its centre, the whole figure's height (what scales her). */
export const BUST = { eyeX: -0.02, eyeY: -0.4, figure: 2.6, facing: -66, pitch: 6 } as const

/** How far above the circle's centre her eyes sit, in diameters (the head out of the hole). */
export const BUST_EYE_DROP = -BUST.eyeY

export function bustPlace(l: PortholeLayout): { x: number; y: number; figurePx: number; facing: number; pitch: number } {
  return { x: l.cx + BUST.eyeX * l.d, y: l.cy + BUST.eyeY * l.d, figurePx: BUST.figure * l.d, facing: BUST.facing, pitch: BUST.pitch }
}

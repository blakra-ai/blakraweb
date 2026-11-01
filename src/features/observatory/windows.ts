import { onReflow } from '../../motion/reflow'
import { obs } from './state'

/*
 * The Observatory's windows: the framed stages the document opens onto the one fixed canvas.
 * Each `<Window>` registers its element; its page rect is measured on reflow only (never per
 * frame). The world renders every visible window inside a scissor rect with its own framing
 * (ring centre and radius, the guide's place), all computed here as pure functions of the rect
 * so they are tested without a DOM. Pixels are CSS px; page rects are relative to the document.
 */

export type WindowKind = 'hero' | 'stage' | 'contact'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Framing {
  /** The ring's centre in window-local px and its radius (the storyboard's r 150 → 165 → 230 at 1392 wide). */
  ring: { x: number; y: number; r: number }
  /** The well's falloff (sigma) and pull, per kind, scaled with the ring. */
  sigma: number
  pull: number
  /** Where the grid's left fade ends (0 … 1 of the width): the words' column stays quiet. */
  fade: number
  /** The guide's eyes in window-local px and her head's height in px, or null where she is absent. */
  guide: { x: number; y: number; headPx: number } | null
}

export interface ObsWindow {
  id: string
  kind: WindowKind
  /** The element's page rect at rest, measured on reflow. */
  rect: Rect
  framing: Framing
  el: HTMLElement
  /** A window inside a `position: sticky` hold (the stage): what the browser clamps its place by. */
  sticky: Sticky | null
}

/** A sticky hold: it rests at `naturalY` (page), sticks at `top` (viewport) and stops at the bottom of its container. */
export interface Sticky {
  top: number
  naturalY: number
  containerY: number
  containerH: number
  h: number
}

/** Where a sticky element's top is on screen for a scroll (the browser's own rule, pure). */
export function stickyViewY(st: Sticky, scrollY: number): number {
  const natural = st.naturalY - scrollY
  const stop = st.containerY + st.containerH - scrollY - st.h
  return Math.min(Math.max(natural, st.top), stop)
}

/** The storyboard frame the radii were drawn at (1440 − 2 × 24 inset). */
export const REF_WIDTH = 1392
export const RING = { hero: 180, stage: 165, contact: 230 } as const
const SIGMA = { hero: 320, stage: 340, contact: 430 } as const
const PULL = { hero: 0.66, stage: 0.66, contact: 0.7 } as const
const FADE = { hero: 0.42, stage: 0.42, contact: 0.5 } as const
/** The ring's centre: 62 % across the hero, 58 % on the stage (its bands reach 1.6 r; the line stands on the tangent beyond them). */
const RING_X = { hero: 0.62, stage: 0.58, contact: 0.74 } as const
const RING_Y = { hero: 322 / 788, stage: 0.47, contact: 300 / 788 } as const
/** The guide's head: 30 % of the window's height; the words own the left half. */
export const HEAD_SHARE = 0.3
export const WORDS_COLUMN = 0.5
export const FRAME_RADIUS = 16
export const GRID_CELL = 24

/** How the ring grows with the window's width, clamped so a phone window keeps a readable ring. */
export const ringScale = (w: number) => Math.max(0.5, Math.min(1, w / REF_WIDTH))

/**
 * The framing for a window of `kind` with page rect `rect`. Pure. `hint` is the page's own place
 * for her eyes (fractions of the window, from the window's `--guide-x` / `--guide-y`), clamped as the default is.
 */
export function frameWindow(kind: WindowKind, rect: Rect, hint?: { x: number; y: number } | null): Framing {
  const s = ringScale(rect.w)
  let r = RING[kind] * s
  const ring = { x: rect.w * RING_X[kind], y: rect.h * RING_Y[kind], r }
  if (kind === 'contact') {
    // The horizon: the disk fills the window's right half, its glow reaching the frame.
    r = Math.min(rect.h * 0.42, rect.w * 0.24)
    ring.x = rect.w * 0.74
    ring.y = rect.h * 0.5
    ring.r = r
  }
  let guide: Framing['guide'] = null
  {
    // 30 % of the window's height, and never so large that she cannot fit in the right half.
    const headPx = Math.min(HEAD_SHARE * rect.h, 0.5 * rect.w)
    // At the lower-right rim: just past the ring's right edge, a third of a head below its centre
    // line times the radius, her chin near the frame's bottom edge (the shoulders are cut by it).
    let x = hint ? hint.x * rect.w : ring.x + r + 0.45 * headPx
    let y = hint ? hint.y * rect.h : ring.y + 1.3 * r
    y = Math.min(y, rect.h - 0.35 * headPx)
    // Never over the words: she stays right of the left column, and inside the frame.
    x = Math.max(x, WORDS_COLUMN * rect.w + 0.5 * headPx)
    x = Math.min(x, rect.w - 0.45 * headPx)
    y = Math.max(y, 0.5 * headPx)
    guide = { x, y, headPx }
  }
  return { ring, sigma: SIGMA[kind] * s, pull: PULL[kind], fade: FADE[kind], guide }
}

/**
 * The hole's radius (where the grid falls into black) as a multiple of the ring's radius, by
 * station 1 … 9: it grows station by station, the contact window enters with it already large.
 */
export function holeFor(station: number): number {
  const s = Math.max(1, Math.min(9, station))
  return 0.92 + 0.045 * (s - 1)
}

/** The window's rect on screen for the scroll `scrollY`: its viewport, and the part of it the viewport shows (or null when off-screen). */
export function onScreen(rect: Rect, scrollY: number, viewport: { w: number; h: number }, sticky: Sticky | null = null): { view: Rect; clip: Rect } | null {
  const view = { x: rect.x, y: sticky ? stickyViewY(sticky, scrollY) + (rect.y - sticky.naturalY) : rect.y - scrollY, w: rect.w, h: rect.h }
  const x0 = Math.max(0, view.x)
  const y0 = Math.max(0, view.y)
  const x1 = Math.min(viewport.w, view.x + view.w)
  const y1 = Math.min(viewport.h, view.y + view.h)
  if (x1 <= x0 || y1 <= y0) return null
  return { view, clip: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
}

/** A CSS-px rect (y down from the top) as GL device pixels (y up from the bottom), rounded outward. */
export function toGl(r: Rect, viewportH: number, dpr: number): Rect {
  const x = Math.floor(r.x * dpr)
  const y = Math.floor((viewportH - r.y - r.h) * dpr)
  return { x, y, w: Math.ceil((r.x + r.w) * dpr) - x, h: Math.ceil((viewportH - r.y) * dpr) - y }
}

/**
 * The well's warp, as the storyboard draws it (sb.js): a point at distance r from the centre is
 * pulled to r · (1 − pull · e^(−r²/σ²)). The shader draws the grid by the inverse: for each pixel
 * at distance R it finds the r whose warp lands there (`wellInverse`, Newton, three steps).
 */
export function wellWarp(r: number, sigma: number, pull: number): number {
  return r * (1 - pull * Math.exp(-(r * r) / (sigma * sigma)))
}

export function wellInverse(R: number, sigma: number, pull: number, steps = 3): number {
  const s2 = sigma * sigma
  let r = R / (1 - pull * Math.exp(-(R * R) / s2))
  for (let i = 0; i < steps; i++) {
    const e = Math.exp(-(r * r) / s2)
    const f = 1 - pull * e
    const df = f + r * (pull * e * (2 * r) / s2)
    r -= (r * f - R) / Math.max(df, 1e-4)
    if (r < 0) r = 0
  }
  return r
}

/** The load device: 0 → 1 over 900 ms, the storyboard's cubic-bezier(.2,.7,.2,1) (an ease-out). */
export const BEND_MS = 900
export function bendAt(ms: number): number {
  if (ms >= BEND_MS) return 1
  if (ms <= 0) return 0
  return cubicBezier(0.2, 0.7, 0.2, 1, ms / BEND_MS)
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  // Solve the curve's parameter for x by bisection, then read y.
  let lo = 0
  let hi = 1
  let t = x
  for (let i = 0; i < 24; i++) {
    const mt = 1 - t
    const cx = 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t
    if (Math.abs(cx - x) < 1e-5) break
    if (cx < x) lo = t
    else hi = t
    t = (lo + hi) / 2
  }
  const mt = 1 - t
  return 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t
}

/* ---------- the registry (DOM) ---------- */

const windows = new Map<string, ObsWindow>()
const listeners = new Set<() => void>()
let offReflow: (() => void) | null = null
/** The registry as an array, rebuilt only when a window comes or goes (the world reads it per frame). */
let list: ObsWindow[] = []

function changed() {
  list = [...windows.values()]
  listeners.forEach((fn) => fn())
}

/** The page's place for her eyes from the window's `--guide-x` / `--guide-y` (fractions or %), or null. */
function guideHint(el: HTMLElement): { x: number; y: number } | null {
  const cs = getComputedStyle(el)
  const read = (name: string) => {
    const v = cs.getPropertyValue(name).trim()
    if (!v) return Number.NaN
    const n = Number.parseFloat(v)
    return v.endsWith('%') ? n / 100 : n
  }
  const x = read('--guide-x')
  const y = read('--guide-y')
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

/** The nearest sticky ancestor of the window (its hold), read on reflow only. */
function stickyOf(el: HTMLElement): Sticky | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p)
    if (cs.position !== 'sticky') continue
    const container = p.parentElement
    if (!container) return null
    const c = container.getBoundingClientRect()
    const containerY = c.top + window.scrollY
    return { top: Number.parseFloat(cs.top) || 0, naturalY: containerY + p.offsetTop, containerY, containerH: c.height, h: p.offsetHeight }
  }
  return null
}

function measure(w: ObsWindow) {
  const r = w.el.getBoundingClientRect()
  w.sticky = stickyOf(w.el)
  // At rest the window sits in its hold's natural place; the rect is the resting one even when measured while stuck.
  const y = w.sticky ? w.sticky.naturalY + (w.el.offsetParent === w.el.parentElement ? w.el.offsetTop : 0) : r.top + window.scrollY
  w.rect = { x: r.left + window.scrollX, y, w: r.width, h: r.height }
  w.framing = frameWindow(w.kind, w.rect, guideHint(w.el))
  obs.windows[w.id] = w.rect
}

function measureAll() {
  windows.forEach(measure)
  listeners.forEach((fn) => fn())
}

/**
 * A `<Window>` registers its element and kind; its rect is measured now and on every reflow
 * (resize, fonts, content opening), never per frame. Returns the unregister function.
 */
export function registerWindow(id: string, el: HTMLElement, kind: WindowKind): () => void {
  const w: ObsWindow = { id, kind, el, rect: { x: 0, y: 0, w: 1, h: 1 }, framing: frameWindow(kind, { x: 0, y: 0, w: 1, h: 1 }), sticky: null }
  measure(w)
  windows.set(id, w)
  if (!offReflow) offReflow = onReflow(measureAll)
  changed()
  return () => {
    if (windows.get(id) === w) {
      windows.delete(id)
      delete obs.windows[id]
    }
    if (windows.size === 0 && offReflow) {
      offReflow()
      offReflow = null
    }
    changed()
  }
}

/** The registered windows, in registration order: one cached array, no allocation per frame. */
export function getWindows(): ObsWindow[] {
  return list
}

/** Whether a clip rect (window-local) touches her: a box 0.8 heads wide about the eyes, from 0.7 heads above them to the window's floor. */
export function guideInView(guide: { x: number; y: number; headPx: number }, clip: Rect, view: Rect): boolean {
  const cx0 = clip.x - view.x
  const cy0 = clip.y - view.y
  const left = guide.x - 0.8 * guide.headPx
  const right = guide.x + 0.8 * guide.headPx
  const top = guide.y - 0.7 * guide.headPx
  return cx0 < right && cx0 + clip.w > left && cy0 + clip.h > top && cy0 < view.h
}

/** Called when a window registers, leaves or is re-measured: the world invalidates its frame. */
export function onWindows(fn: () => void): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

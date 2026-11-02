import type { NeedId } from '../../content/types'

/** A page-space box in CSS pixels (document coordinates: y includes the scroll). */
export interface PageRect {
  x: number
  y: number
  w: number
  h: number
}

/** The framed windows the world paints through, by id (Window.tsx registers them on reflow). */
export type WindowId = 'hero' | 'stage' | 'contact' | (string & {})

/**
 * The Observatory's shared state: written by the page (the gauge, the windows, the picker, the
 * pointer), read by the world (src/features/observatory/World.tsx) each frame. Nothing here
 * renders; it is the one place the document and the picture agree. Nothing per frame reads
 * layout: `windows` is refreshed only on reflow (src/motion/reflow.ts).
 */
export const obs = {
  /** The station on screen (1 … 10) and the page's progress through the descent (0 … 1). */
  station: 1,
  progress: 0,
  /** Every framed window's page rect, in CSS px, measured on reflow. */
  windows: {} as Record<WindowId, PageRect>,
  /** The picker's choice ("What do you need built?"), or null. */
  picker: null as NeedId | 'all' | null,
  /** The cursor in CSS px (viewport), and whether a mouse is on the page. */
  pointer: { x: -9999, y: -9999, on: false },
  /** Reduced motion, motion off, or no GPU: the still is the final state. */
  still: false,
  /** The world's clock in seconds. */
  clock: 0,
  /** Sending the form: the moment it started (clock), or 0. */
  transmitAt: 0,
  /** The guide's line on screen: its text, how many characters are revealed, and when it began (clock); the jaw follows it. */
  line: { text: '', typed: 0, from: 0 },
  /** The stage's hold (0 … 1), how many layers are in orbit (0 … 7) and the ring → marker hand-over (0 … 1, the hold's last tenth). */
  hold: 0,
  inOrbit: 0,
  handover: 0,
  /** When the ring last had an event (the picker, Send), on the clock: the glow pulses once from it; 0 = never. */
  glowAt: 0,
  /** A field of the contact form has focus: its centre in viewport px (read on focus), or null. */
  formFocus: null as null | { x: number; y: number },
}

// Dev only: the headless probes read obs (station, progress, windows) while scrubbing.
if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__obs = obs

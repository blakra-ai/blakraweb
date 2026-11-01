import type { LayerId, NeedId } from '../../content/types'
import { createPerf, type Perf } from './living'
import type { Look } from './poses'

/** The seven layers, root to crown (the chakra order); index = subsystem = chakra. */
export const LAYERS: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']

/** The page's beats, in order; each section carries its own as data-beat. */
export type Beat = 'hero' | 'manifesto' | 'mission' | 'systems' | 'proof' | 'checklist' | 'payload' | 'crew' | 'contact'

/**
 * The Navigator's shared state: written by the director and the page, read by the world each
 * frame. Nothing here renders; it is the one place the page and the picture agree.
 */
export const nav = {
  /** The beat on screen and how far through it the reader is (0 … 1). */
  beat: 'hero' as Beat,
  progress: 0,
  /** How far the hero has scrolled out (0 … 1): the Navigator's walk from the stage to the dock. */
  leave: 0,
  /** The mission chosen in "What do you need built?", if any. */
  mission: null as null | { id: NeedId | 'all'; layers: readonly LayerId[]; at: number },
  /** The world's clock in seconds. */
  clock: 0,
  /** Reduced motion or motion off: still frames, no arrivals. */
  still: false,
  portrait: false,
  /** When the Navigator last began a line (clock), and until when he is typing it: his comms rings pulse meanwhile. */
  spokeAt: -10,
  typingUntil: -10,
  /** Sending the form: the moment it started (clock), or 0. */
  transmitAt: 0,
  /** Whether the world's helmet rests at the dock (so the docked companion shows instead). */
  atDock: false,
  /** Where the companion docks: the header slot's box, in CSS pixels. */
  dock: { x: 0, y: 0, w: 56, h: 56 },
  /** The sections drawn on ink, as screen bands [top, bottom] in CSS pixels, for the field. */
  inkBands: [] as [number, number][],
  /** Her performance this frame (living.ts), which both figures (world, dock) apply. */
  perf: createPerf() as Perf,
  /** Where her eyes and mouth are on screen (CSS px), her head's height in px, and whether a figure shows. */
  anchor: { eyes: { x: 0, y: 0 }, mouth: { x: 0, y: 0 }, headPx: 0, on: false },
  /** The line she is speaking: its text, how much is typed, and when it began (clock). */
  line: { text: '', typed: 0, from: 0 },
  /** Screens scrolled since the current beat's top, and the beat before it (for the glide). */
  enter: 0,
  prevBeat: 'hero' as Beat,
  /**
   * What the cursor rests on: a layer (0 … 6), a mission patch (0 … 4) and the layers that
   * mission used (indices, lit on her while hovered, from `at`), the product capsule, a crew badge, one of her eyes.
   */
  hover: {
    layer: null as number | null,
    patch: null as number | null,
    patchLayers: null as number[] | null,
    at: 0,
    capsule: false,
    crew: null as number | null,
    eye: false,
  },
  /** What the pose has her watch this beat, and where that is on screen (CSS px), or null for the visitor. */
  look: 'visitor' as Look,
  lookAt: null as null | { x: number; y: number },
  /** The pose's body turn this frame (degrees, damped), added to her living body yaw. */
  poseYaw: 0,
  /** The cursor in CSS px, and whether a mouse is on the page. */
  pointer: { x: -9999, y: -9999, on: false },
  /** The scroll's speed, smoothed, in screens per second (positive = down), clamped to ±6: the wind in her hair. */
  scrollV: 0,
  /** Boxes the speech card keeps clear of in the contact beat, in page coordinates (measured on reflow by the director): the form, the section's text blocks, and the left column's last paragraph. */
  contact: { form: null as Box | null, text: [] as Box[], lastPara: null as Box | null },
  /** Every section's words and cards, as page boxes by beat: the speech card keeps clear of them. */
  textBoxes: {} as Record<string, Box[]>,
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

// Dev only: the headless motion probe reads nav (anchor, beat, enter, atDock) while scrubbing.
if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__nav = nav

import type { LayerId, NeedId } from '../../content/types'

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
}

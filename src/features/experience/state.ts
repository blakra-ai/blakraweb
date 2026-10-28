import type { LayerId } from '../../content/types'

/** The film's shared state: written by the director and the page, read by the world each frame. */
export const film = {
  /** Where the story is (0 … 1), smoothed. */
  t: 0,
  /** Where the scroll says it is. */
  raw: 0,
  /** The world's clock in seconds, so choices made in the page line up with the 3D's time. */
  clock: 0,
  /** Reduced motion or motion switched off: the story cuts between still frames. */
  still: false,
  /** Portrait screens frame the subject above the words instead of beside them. */
  portrait: false,
  /** The visitor's need: the layers it takes, the case nearest to it, and when it was chosen. */
  need: null as null | { layers: readonly LayerId[]; proof: number; at: number },
}

/** The seven layers, root to crown (the chakra order). */
export const LAYERS: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']

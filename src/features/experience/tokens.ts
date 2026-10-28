/**
 * The experience's design tokens: colours, the seven centres, motion timings and quality
 * limits. Every scene, object and animation reads from here; nothing is hard-coded elsewhere.
 */

export const colors = {
  paper: '#f2f0eb',
  white: '#ffffff',
  ink: '#0b0b10',
  accent: '#ff5a1f',
} as const

/** The seven centres, root to crown: the seven layers of a product. Traditional colours and petal counts. */
export const chakras = [
  { name: 'Root', color: '#e8352b', petals: [4] },
  { name: 'Sacral', color: '#f57a1f', petals: [6] },
  { name: 'Solar plexus', color: '#f7c21b', petals: [10] },
  { name: 'Heart', color: '#2fb35a', petals: [12] },
  { name: 'Throat', color: '#2a9fe0', petals: [16] },
  { name: 'Third eye', color: '#4248c2', petals: [2] },
  // The thousand petals, drawn as three rings.
  { name: 'Crown', color: '#9a4fd0', petals: [24, 16, 8] },
] as const

export const blackHole = {
  /** Accretion disk, in horizon radii. */
  diskInner: 1.55,
  diskOuter: 3.4,
  /** Close to edge-on, so the lensed far side rises over the shadow. */
  diskTilt: -1.2,
  /** How far the cursor tilts the disk, in radians. */
  cursorTilt: 0.16,
  /** Einstein radius of the lens on the wordmark, in horizon radii. */
  einstein: 1.7,
  /** Angular speed of the disk at the inner edge (radians per second); outer parts follow Kepler. */
  spin: 0.55,
} as const

export const motion = {
  /** Damping rates (per second) for things that follow the cursor or the scroll. */
  follow: 3,
  settle: 5,
  ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  durations: { quick: 0.35, base: 0.8, slow: 1.4 },
} as const

export const quality = {
  /** Device pixel ratio caps: phones and desktops. */
  dpr: { phone: 1.25, desktop: 1.5, integrated: 0.85 },
  /** Wordmark texture width, per screen class. */
  wordmarkPx: { phone: 1536, desktop: 2048 },
} as const

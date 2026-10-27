import type { JSX } from 'react'
import type { gsap } from '../motion/gsap'

export type Timeline = ReturnType<typeof gsap.timeline>

/**
 * A scene renders its final state ("now") as plain SVG, so it reads correctly
 * without JS or motion. `build` adds the "before → now" transformation to a
 * timeline whose positions run from 0 to 1.
 */
export interface Scene {
  Art: () => JSX.Element
  build: (tl: Timeline, root: SVGSVGElement) => void
  /**
   * The finished system running by itself: a paused, endlessly repeating timeline
   * the chapter plays only while the scene is on screen. It animates its own
   * elements or properties, never the ones `build` scrubs.
   */
  live?: (root: SVGSVGElement) => Timeline
}

/** Deterministic pseudo-random in [0, 1): the same scatter on every load. */
export function rand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function spread(i: number, salt: number, range: number): number {
  return (rand(i, salt) - 0.5) * 2 * range
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

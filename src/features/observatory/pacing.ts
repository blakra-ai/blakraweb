/*
 * How often the world draws, pure. While the reader acts (scroll, pointer, a spring settling) it draws
 * every animation frame; at rest her life and the sky are slow enough for a lower rate, lower still
 * once nobody has touched the page for a while. The governor lowers the render scale when frames stay
 * late (an integrated GPU is fill-rate bound: 1440 × 900 gave 33 ms a frame, 1024 × 640 gave 16.7 ms)
 * and offers it back once frames stay on time.
 */

/** Frames per second at rest, and after DEEP_IDLE_S seconds without input. */
export const IDLE_FPS = 24
export const DEEP_IDLE_FPS = 15
export const DEEP_IDLE_S = 20
/** How often the well (the window's whole grid and sky, the costliest pass) is shaded; other frames copy it. */
export const SKY_HZ = 20

export const idlePeriodMs = (sinceInputS: number) => 1000 / (sinceInputS > DEEP_IDLE_S ? DEEP_IDLE_FPS : IDLE_FPS)

/** The scales from the machine's start down: never below 0.7 (under it the hairlines fall apart). */
export function dprLevels(start: number): number[] {
  return [start, ...[1, 0.85, 0.7].filter((d) => d < start)]
}

const WARMUP_MS = 3000
const WINDOW = 40
const GAP_MS = 250
/** A failed step up (late again this soon after it) caps the scale for the rest of the visit. */
const RETRY_MS = 6000
const UP_AFTER_FAST = 480

export interface Governor {
  levels: number[]
  level: number
  /** The best level still allowed. */
  ceiling: number
  startAt: number
  upAt: number
  n: number
  slow: number
  fast: number
  fastRun: number
}

export function createGovernor(start: number, now: number): Governor {
  return { levels: dprLevels(start), level: 0, ceiling: 0, startAt: now, upAt: -Infinity, n: 0, slow: 0, fast: 0, fastRun: 0 }
}

/**
 * One drawn frame: `gapMs` since the one before, `periodMs` what was asked for (0 = every animation
 * frame). Returns the new scale when it changes. A gap over 250 ms is a stop in a demand loop, not slowness.
 */
export function stepGovernor(g: Governor, gapMs: number, periodMs: number, now: number): number | null {
  if (now - g.startAt < WARMUP_MS) return null
  if (gapMs > GAP_MS) {
    g.n = g.slow = g.fast = 0
    return null
  }
  g.n++
  if (gapMs > (periodMs ? periodMs * 1.5 : 28)) g.slow++
  if (gapMs < (periodMs ? periodMs * 1.15 : 18.5)) g.fast++
  if (g.n < WINDOW) return null
  const slow = g.slow / g.n >= 0.6
  const fast = g.fast / g.n >= 0.9
  const n = g.n
  g.n = g.slow = g.fast = 0
  if (slow) {
    g.fastRun = 0
    if (g.level >= g.levels.length - 1) return null
    if (now - g.upAt < RETRY_MS) g.ceiling = g.level + 1
    g.level++
    return g.levels[g.level]
  }
  if (!fast) {
    g.fastRun = 0
    return null
  }
  g.fastRun += n
  if (g.fastRun < UP_AFTER_FAST || g.level <= g.ceiling) return null
  g.fastRun = 0
  g.level--
  g.upAt = now
  return g.levels[g.level]
}

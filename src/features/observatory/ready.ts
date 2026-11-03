/**
 * The world's readiness for the brand loader (src/boot.ts): set once, when her GLB has loaded and
 * the first frame with her has been drawn, or when the world steps aside (`gl-off`). No imports,
 * so the loader can read it without pulling in three.js.
 */
let ready = false
const waiters = new Set<() => void>()

export function markWorldReady() {
  if (ready) return
  ready = true
  for (const w of waiters) w()
  waiters.clear()
}

export const isWorldReady = () => ready

/** Calls `cb` once the world is ready (at once if it already is); returns an unsubscribe. */
export function onWorldReady(cb: () => void): () => void {
  if (ready) {
    cb()
    return () => {}
  }
  waiters.add(cb)
  return () => waiters.delete(cb)
}

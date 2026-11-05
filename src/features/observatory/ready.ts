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

/*
 * The reveal's quiet window: when the loader lifts before the world is ready, her remaining heavy
 * steps (measuring the GLB, uploading textures, compiling) wait until its exit has played and the
 * page has settled, so no long task lands on the reveal. The still covers the window meanwhile.
 */
let quietUntil = 0

/** Asks the world's heavy work to wait `ms` from now (src/boot.ts, as the loader lifts). */
export function holdWorld(ms: number) {
  quietUntil = Math.max(quietUntil, performance.now() + ms)
}

/** Resolves at once outside a hold; inside one, after it ends and the page is next idle. */
export function afterReveal(): Promise<void> {
  const wait = quietUntil - performance.now()
  if (wait <= 0) return Promise.resolve()
  return new Promise((r) =>
    setTimeout(() => {
      if (quietUntil - performance.now() > 1) return void afterReveal().then(r)
      if (window.requestIdleCallback) window.requestIdleCallback(() => r(), { timeout: 400 })
      else r()
    }, wait),
  )
}

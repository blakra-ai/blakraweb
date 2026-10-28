/**
 * "The layout changed": a resize, the fonts arriving, a section switching between held and
 * flowing, content opening under the pulse answer. Everything that caches positions (the
 * director, the held acts) re-measures on it, once per frame however many causes there were.
 */
const listeners = new Set<() => void>()
let frame = 0

export function onReflow(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Ask for a re-measure on the next frame. */
export function reflow() {
  if (frame || typeof window === 'undefined') return
  frame = requestAnimationFrame(() => {
    frame = 0
    listeners.forEach((fn) => fn())
  })
}

/** Re-measure now (before a scroll that depends on fresh positions). */
export function reflowNow() {
  cancelAnimationFrame(frame)
  frame = 0
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', reflow)
  window.addEventListener('load', reflow)
  document.fonts?.ready.then(reflow)
}

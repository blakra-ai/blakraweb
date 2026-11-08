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
  // Phones: the address bar showing or hiding changes only the height, on every scroll turn. That is
  // not a new layout (the world's canvas is sized on 100lvh), so it never re-measures: no jump.
  let lastW = window.innerWidth
  let lastH = window.innerHeight
  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const bar = w === lastW && Math.abs(h - lastH) < 200 && matchMedia('(pointer: coarse)').matches
    lastW = w
    if (bar) return
    lastH = h
    reflow()
  })
  // After `load`: reading document.fonts.ready forces a full layout.
  const fonts = () => void document.fonts?.ready.then(reflow)
  window.addEventListener('load', () => {
    reflow()
    fonts()
  })
  if (document.readyState === 'complete') fonts()
}

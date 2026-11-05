/** The pointer in view units (-1 … 1, y up), shared by the scenes, the cursor and the magnets. */
export const pointer = { x: 0, y: 0, px: -100, py: -100 }

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.px = e.clientX
      pointer.py = e.clientY
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = 1 - (e.clientY / window.innerHeight) * 2
    },
    { passive: true },
  )
}

/** Frame-rate independent approach of a value to its target. */
export const damp = (from: number, to: number, lambda: number, dt: number) => from + (to - from) * (1 - Math.exp(-lambda * dt))

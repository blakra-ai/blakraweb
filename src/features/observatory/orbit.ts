/*
 * The seven-layer stage, pure: where each layer's orbit sits round the ring, where its dot rests
 * on that orbit (nearest its label), and how far the hold has brought it. The storyboard
 * (d-02-stage.html) drew it at ring r 165 in a 1392 × 788 frame; everything scales with the ring.
 * Pixels are window-local CSS px, y down.
 */

export const LAYERS_N = 7
/** The orbits' tilt, degrees (the storyboard's rotate(-14)). */
export const TILT = -14
/** The hold: the layers leave the grid over its first part (stations 02–03), the picker closes it, the hand-over is its last tenth. */
export const ORBIT_END = 0.7
export const HANDOVER_START = 0.95

export interface Orbit {
  rx: number
  ry: number
  /** The dot's resting place on the orbit. */
  dot: { x: number; y: number }
  /** The label's left edge and its line (the dot's leader ends 8 px short of it). */
  label: { x: number; y: number }
}

/**
 * The orbits for a ring at (cx, cy) of radius r, root (k 0) to crown (k 6). Labels stand in a
 * column right of the ring (desktop, d-02) or at the window's left edge (phone, m-02: `side`
 * 'left', labels 21 px apart from 120 px above the centre, dots on the orbits' left side).
 */
export function orbitsFor(cx: number, cy: number, r: number, side: 'right' | 'left' = 'right'): Orbit[] {
  const s = r / 165
  const a = (TILT * Math.PI) / 180
  const left = side === 'left'
  const lx = left ? 12 : cx + 165 * s
  const ly0 = left ? cy - 120 : cy - 76 * s
  const dy = left ? 21 : 27 * s
  const out: Orbit[] = []
  for (let k = 0; k < LAYERS_N; k++) {
    const rx = (200 + k * 34) * s
    const ry = rx * 0.3
    const ly = ly0 + k * dy
    // The dot sits where the orbit passes nearest the label's anchor (just past the label).
    const ax = left ? lx + 96 : lx - 20 * s
    let best = { x: cx, y: cy, d: Infinity }
    for (let i = 0; i < 360; i += 2) {
      const t = (i * Math.PI) / 180
      const x = cx + rx * Math.cos(t) * Math.cos(a) - ry * Math.sin(t) * Math.sin(a)
      const y = cy + rx * Math.cos(t) * Math.sin(a) + ry * Math.sin(t) * Math.cos(a)
      const d = Math.hypot(x - ax, y - ly)
      if (d < best.d) best = { x, y, d }
    }
    out.push({ rx, ry, dot: { x: best.x, y: best.y }, label: { x: lx, y: ly } })
  }
  return out
}

/** How many layers are in orbit for a hold progress (0 … 1): 0 at the top, all seven by ORBIT_END. */
export function inOrbit(hold: number): number {
  if (hold <= 0) return 0
  return Math.min(LAYERS_N, Math.floor((hold / ORBIT_END) * LAYERS_N) + 1)
}

/** The ring → marker hand-over, 0 … 1 over the hold's last tenth. */
export function handoverAt(hold: number): number {
  return Math.max(0, Math.min(1, (hold - HANDOVER_START) / (1 - HANDOVER_START)))
}

/** The hold's progress for a scroll position: 0 when the section's top reaches the viewport's top, 1 when its bottom meets the viewport's bottom. */
export function holdAt(scrollY: number, top: number, height: number, viewportH: number): number {
  const span = Math.max(1, height - viewportH)
  return Math.max(0, Math.min(1, (scrollY - top) / span))
}

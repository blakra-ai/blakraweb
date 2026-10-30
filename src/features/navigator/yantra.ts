/**
 * The seven yantras as true line geometry (see .firm/runs/2026-10-29-blakra-identity/yantras.md):
 * a ring of lotus petals, the element's inner figure, and the bindu at the centre, which in
 * BLAKRA's reading is the event horizon. Polylines in a unit circle (y up), for SVG, canvas or 3D.
 */
export type Pt = [number, number]
export type Polyline = Pt[]

export const CHAKRAS = [
  { name: 'Root', layer: 'Cloud and backend', part: 'Power pack', color: '#e8352b', petals: [4] },
  { name: 'Sacral', layer: 'Data', part: 'Coolant ring', color: '#f57a1f', petals: [6] },
  { name: 'Solar plexus', layer: 'Automation and bots', part: 'Control unit', color: '#f7c21b', petals: [10] },
  { name: 'Heart', layer: 'Product design', part: 'Core window', color: '#2fb35a', petals: [12] },
  { name: 'Throat', layer: 'Web and mobile', part: 'Comms fins', color: '#2a9fe0', petals: [16] },
  { name: 'Third eye', layer: 'Launch and growth', part: 'Lamps', color: '#4248c2', petals: [2] },
  { name: 'Crown', layer: 'AI', part: 'Antenna', color: '#9a4fd0', petals: [24, 16, 8] },
] as const

const TAU = Math.PI * 2

const circle = (r: number, n = 96, cx = 0, cy = 0): Polyline => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * TAU) * r, cy + Math.sin((i / n) * TAU) * r])

/** A regular polygon, one vertex pointing at angle a0 (radians, 0 = right, π/2 = up). */
const polygon = (sides: number, r: number, a0: number): Polyline =>
  Array.from({ length: sides + 1 }, (_, i) => {
    const a = a0 + (i / sides) * TAU
    return [Math.cos(a) * r, Math.sin(a) * r]
  })

/** One lotus petal: two arcs from the inner circle meeting at a point (a quadratic curve each side). */
function petal(a: number, half: number, r0: number, r1: number, n = 14): Polyline {
  const base = (s: number): Pt => [Math.cos(a + s * half) * r0, Math.sin(a + s * half) * r0]
  const tip: Pt = [Math.cos(a) * r1, Math.sin(a) * r1]
  // The control point bows the side out, so the petal swells before it narrows to its tip.
  const ctrl = (s: number): Pt => {
    const r = r0 + (r1 - r0) * 0.55
    return [Math.cos(a + s * half * 1.25) * r, Math.sin(a + s * half * 1.25) * r]
  }
  const side = (s: number) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n
      const p0 = base(s)
      const c = ctrl(s)
      return [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * tip[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * tip[1]] as Pt
    })
  return [...side(-1), ...side(1).reverse()]
}

function lotus(count: number, r0: number, r1: number, offset = 0): Polyline[] {
  const half = (Math.PI / count) * 0.92
  return Array.from({ length: count }, (_, i) => petal(Math.PI / 2 + offset + (i / count) * TAU, half, r0, r1))
}

/** The yantra for chakra k (0 root … 6 crown), as polylines. */
export function yantra(k: number): Polyline[] {
  const lines: Polyline[] = [circle(1, 128)]
  const inner = 0.56
  const down = -Math.PI / 2
  if (k === 5) {
    // Ajna: two great petals, like wings, either side of the circle.
    lines.push(petal(0, 0.62, 0.42, 1.0, 24), petal(Math.PI, 0.62, 0.42, 1.0, 24))
    lines.push(circle(0.42), polygon(3, 0.34, down))
  } else if (k === 6) {
    // Sahasrara: the thousand petals, drawn as three rings, around the void.
    lines.push(...lotus(24, 0.7, 0.97), ...lotus(16, 0.5, 0.74, 0.1), ...lotus(8, 0.32, 0.54, 0.2))
    lines.push(circle(0.32))
  } else {
    lines.push(...lotus(CHAKRAS[k].petals[0], inner, 0.96), circle(inner))
    if (k === 0) {
      // Earth: the square, with the descending triangle inside it.
      const s = inner * 0.7
      lines.push([[-s, -s], [s, -s], [s, s], [-s, s], [-s, -s]], polygon(3, s * 0.82, down))
    } else if (k === 1) {
      // Water: the crescent moon.
      lines.push(circle(inner * 0.62, 64, 0, -inner * 0.06), circle(inner * 0.5, 64, 0, inner * 0.1))
    } else if (k === 2) {
      // Fire: the descending triangle, with a gate on each side.
      const t = polygon(3, inner * 0.82, down)
      lines.push(t)
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i / 3) * TAU
        const m: Pt = [Math.cos(a) * inner * 0.41, Math.sin(a) * inner * 0.41]
        const o: Pt = [Math.cos(a) * inner * 0.62, Math.sin(a) * inner * 0.62]
        lines.push([m, o], [[o[0] - Math.sin(a) * 0.06, o[1] + Math.cos(a) * 0.06], [o[0] + Math.sin(a) * 0.06, o[1] - Math.cos(a) * 0.06]])
      }
    } else if (k === 3) {
      // Air: the hexagram, two triangles interlaced.
      lines.push(polygon(3, inner * 0.86, Math.PI / 2), polygon(3, inner * 0.86, down))
    } else if (k === 4) {
      // Space: the descending triangle holding the full circle.
      lines.push(polygon(3, inner * 0.86, down), circle(inner * 0.36, 64, 0, -inner * 0.06))
    }
  }
  return lines
}

/** The bindu: the point at a yantra's heart; for BLAKRA, the event horizon. */
export const BINDU = 0.075

/** SVG path data for a yantra, in a viewBox of -1..1 (y flipped for SVG). */
export function yantraPath(k: number): string {
  return yantra(k)
    .map((l) => l.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(3)} ${(-y).toFixed(3)}`).join(''))
    .join('')
}

/**
 * The thread: the Navigator's orange light trail, as geometry. Pure functions over CSS-pixel
 * points; Thread.tsx draws what they return. Nothing here reads the page.
 */

export interface Point {
  x: number
  y: number
}

const f = (n: number) => (Math.round(n * 100) / 100).toString()

/**
 * A smooth open curve through `points` (Catmull-Rom, converted to cubic Béziers), as an SVG
 * path `d`. `tension` 0 is the straightest (a polyline), 1 the roundest; 0.5 is the classic.
 * One segment per pair of points; fewer than two points give an empty string.
 */
export function smoothPath(points: readonly Point[], tension = 0.5): string {
  if (points.length < 2) return ''
  const n = points.length
  const k = tension / 3
  let d = `M${f(points[0].x)} ${f(points[0].y)}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) * k
    const c1y = p1.y + (p2.y - p0.y) * k
    const c2x = p2.x - (p3.x - p1.x) * k
    const c2y = p2.y - (p3.y - p1.y) * k
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`
  }
  return d
}

/**
 * A closed figure-eight that passes through a, b and c in that order: out through a, a loop
 * around b, back through c, and a loop around a to close. Built as a closed Catmull-Rom spline
 * through four waypoints (a, b, c, and a point mirrored past a), sampled into `samples` points,
 * the first and last the same. The three points lie on the curve within rounding.
 */
export function figureEight(a: Point, b: Point, c: Point, samples = 96): Point[] {
  // The loop's spine runs a → b → c; the crossing sits at the midpoint of a and c, so the
  // return leg swings out on the far side of the spine around a and comes back through b's side.
  const mx = (a.x + c.x) / 2
  const my = (a.y + c.y) / 2
  // A perpendicular to the spine a → c, scaled to the loop's width.
  const dx = c.x - a.x
  const dy = c.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const w = Math.max(24, len * 0.28)
  const nx = (-dy / len) * w
  const ny = (dx / len) * w
  // Which side of the spine b sits on: the second lobe swings to the other side.
  const side = (b.x - mx) * nx + (b.y - my) * ny >= 0 ? -1 : 1
  // Control waypoints, closed: a, the far side of the first lobe, b, back through the centre, c, the far side of the second lobe.
  const q1 = { x: (a.x + b.x) / 2 - side * nx, y: (a.y + b.y) / 2 - side * ny }
  const q2 = { x: (b.x + c.x) / 2 - side * nx, y: (b.y + c.y) / 2 - side * ny }
  const q3 = { x: (c.x + mx) / 2 + side * nx, y: (c.y + my) / 2 + side * ny }
  const q4 = { x: (mx + a.x) / 2 + side * nx, y: (my + a.y) / 2 + side * ny }
  const way = [a, q1, b, q2, c, q3, { x: mx, y: my }, q4]
  const m = way.length
  const out: Point[] = []
  const per = samples / m
  for (let i = 0; i < samples; i++) {
    const u = i / per
    const seg = Math.floor(u) % m
    const t = u - Math.floor(u)
    const p0 = way[(seg - 1 + m) % m]
    const p1 = way[seg]
    const p2 = way[(seg + 1) % m]
    const p3 = way[(seg + 2) % m]
    out.push(catmull(p0, p1, p2, p3, t))
  }
  out.push({ ...a })
  return out
}

/** One Catmull-Rom segment between p1 and p2 at t. */
function catmull(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

/** The polyline's length in CSS pixels. */
export function arcLength(points: readonly Point[]): number {
  let l = 0
  for (let i = 1; i < points.length; i++) l += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  return l
}

/** The point at share t (0 … 1, clamped) of the polyline's arc length. */
export function pointAt(points: readonly Point[], t: number): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1 || t <= 0) return { ...points[0] }
  const total = arcLength(points)
  if (t >= 1 || total === 0) return { ...points[points.length - 1] }
  let want = t * total
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (want <= seg) {
      const u = seg === 0 ? 0 : want / seg
      return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * u, y: points[i - 1].y + (points[i].y - points[i - 1].y) * u }
    }
    want -= seg
  }
  return { ...points[points.length - 1] }
}

export interface Stitch {
  /** The whole route's `d` (from `from` through every patch). */
  d: string
  /** The route's full length, and the length drawn so far (for stroke-dasharray/offset). */
  length: number
  drawn: number
  /** Where the pen is. */
  pen: Point
  /** Per patch: whether the pen has passed it. */
  settled: boolean[]
}

/**
 * The stitched route: a smooth path leaving `from` and visiting each patch centre in order.
 * `t` (0 … 1) is the pen's progress over the whole route, by arc length of the sampled curve;
 * a patch settles once the pen's arc position reaches it. Pure in t, so scrubbing back
 * un-settles.
 */
export function stitch(from: Point, patches: readonly Point[], t: number): Stitch {
  const route = [from, ...patches]
  if (patches.length === 0) return { d: '', length: 0, drawn: 0, pen: { ...from }, settled: [] }
  const d = smoothPath(route)
  // Sample the same Béziers for lengths: the arc parameter must agree with what is drawn.
  const samples = sampleSmooth(route, 12)
  const length = arcLength(samples)
  const tt = t <= 0 ? 0 : t >= 1 ? 1 : t
  const drawn = length * tt
  // Each patch's arc position: the length of the samples up to its segment end.
  const settled: boolean[] = []
  let acc = 0
  let k = 0
  for (let i = 1; i < samples.length; i++) {
    acc += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y)
    if (i % 12 === 0) {
      // The end of segment k is patch k.
      settled[k] = drawn >= acc - 1e-6
      k++
    }
  }
  return { d, length, drawn, pen: pointAt(samples, tt), settled }
}

/** The Catmull-Rom spline through `points` sampled `per` times per segment (ends included), matching smoothPath's shape. */
export function sampleSmooth(points: readonly Point[], per = 12, tension = 0.5): Point[] {
  if (points.length < 2) return points.map((p) => ({ ...p }))
  const out: Point[] = [{ ...points[0] }]
  const k = tension / 3
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k }
    const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k }
    for (let j = 1; j <= per; j++) {
      const u = j / per
      const a = 1 - u
      out.push({
        x: a * a * a * p1.x + 3 * a * a * u * c1.x + 3 * a * u * u * c2.x + u * u * u * p2.x,
        y: a * a * a * p1.y + 3 * a * a * u * c1.y + 3 * a * u * u * c2.y + u * u * u * p2.y,
      })
    }
  }
  return out
}

/**
 * The Navigator's hair: bone chains as Verlet point chains on flat arrays. Pure, no three.js.
 * Rest positions and capsules are given in the head's local space (metres); every step they are
 * carried into world space by `headWorld`, so a head turn drags the roots and the strands lag.
 * Fixed step 1/60 with an accumulator (≤ 3 substeps a call), damping 0.98, two constraint
 * passes keeping the rest lengths, push-out from two capsules (head, shoulders).
 */

export const HAIR_STEP = 1 / 60
export const HAIR_SUBSTEPS = 3
export const HAIR_DAMPING = 0.98
export const HAIR_GRAVITY = 9.8
/** How much of a length correction the parent point takes (the child takes the rest). */
const PARENT_SHARE = 0.25

export interface HairState {
  chains: number
  perChain: number
  /** xyz per point, chain-major, world space. */
  points: Float32Array
  prev: Float32Array
  /** The rest pose, head-local. */
  rest: Float32Array
  /** Rest length of each segment (chains × (perChain − 1)). */
  lengths: Float32Array
  /** Capsules, head-local: ax ay az bx by bz r. */
  capsules: Float32Array
  /** The same capsules in world space after the last step. */
  capsulesWorld: Float32Array
  /** The last head matrix, column-major 4×4. */
  head: Float32Array
  acc: number
  /** Gravity in m/s², positive = down (scale it with the figure). */
  gravity: number
  primed: boolean
}

export function createHair(rest: Float32Array, chains: number, perChain: number, capsules: Float32Array, gravity = HAIR_GRAVITY): HairState {
  const n = chains * perChain
  if (rest.length !== n * 3) throw new Error(`hair: rest has ${rest.length / 3} points, expected ${n}`)
  const lengths = new Float32Array(chains * (perChain - 1))
  for (let c = 0; c < chains; c++) {
    for (let i = 0; i < perChain - 1; i++) {
      const a = (c * perChain + i) * 3
      const b = a + 3
      lengths[c * (perChain - 1) + i] = Math.hypot(rest[b] - rest[a], rest[b + 1] - rest[a + 1], rest[b + 2] - rest[a + 2])
    }
  }
  const head = new Float32Array(16)
  head[0] = head[5] = head[10] = head[15] = 1
  return {
    chains,
    perChain,
    points: new Float32Array(rest),
    prev: new Float32Array(rest),
    rest: new Float32Array(rest),
    lengths,
    capsules: new Float32Array(capsules),
    capsulesWorld: new Float32Array(capsules),
    head,
    acc: 0,
    gravity,
    primed: false,
  }
}

function xf(m: Float32Array, x: number, y: number, z: number, out: Float32Array, o: number) {
  out[o] = m[0] * x + m[4] * y + m[8] * z + m[12]
  out[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
  out[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
}

/** Carry the rest pose into world space (the first call, or to snap the hair still). */
export function resetHair(h: HairState, headWorld: Float32Array): void {
  h.head.set(headWorld)
  for (let i = 0; i < h.points.length; i += 3) xf(headWorld, h.rest[i], h.rest[i + 1], h.rest[i + 2], h.points, i)
  h.prev.set(h.points)
  worldCapsules(h)
  h.primed = true
}

function worldCapsules(h: HairState) {
  const m = h.head
  const scale = Math.hypot(m[0], m[1], m[2])
  for (let k = 0; k < h.capsules.length; k += 7) {
    xf(m, h.capsules[k], h.capsules[k + 1], h.capsules[k + 2], h.capsulesWorld, k)
    xf(m, h.capsules[k + 3], h.capsules[k + 4], h.capsules[k + 5], h.capsulesWorld, k + 3)
    h.capsulesWorld[k + 6] = h.capsules[k + 6] * scale
  }
}

/** Advance the hair by `dt` seconds under `headWorld`, with `wind` as an acceleration (m/s²). */
export function stepHair(h: HairState, dt: number, headWorld: Float32Array, wind: readonly [number, number, number]): void {
  if (!h.primed) resetHair(h, headWorld)
  h.head.set(headWorld)
  worldCapsules(h)
  h.acc += Math.min(dt, HAIR_STEP * HAIR_SUBSTEPS)
  let steps = 0
  while (h.acc >= HAIR_STEP && steps < HAIR_SUBSTEPS) {
    substep(h, HAIR_STEP, wind)
    h.acc -= HAIR_STEP
    steps++
  }
  if (h.acc >= HAIR_STEP) h.acc = 0
}

function substep(h: HairState, dt: number, wind: readonly [number, number, number]) {
  const { points: p, prev, perChain, chains } = h
  const ax = wind[0] * dt * dt
  const ay = (wind[1] - h.gravity) * dt * dt
  const az = wind[2] * dt * dt
  for (let c = 0; c < chains; c++) {
    const root = c * perChain * 3
    // The root rides the head.
    xf(h.head, h.rest[root], h.rest[root + 1], h.rest[root + 2], p, root)
    prev[root] = p[root]
    prev[root + 1] = p[root + 1]
    prev[root + 2] = p[root + 2]
    for (let i = 1; i < perChain; i++) {
      const o = root + i * 3
      const x = p[o]
      const y = p[o + 1]
      const z = p[o + 2]
      p[o] = x + (x - prev[o]) * HAIR_DAMPING + ax
      p[o + 1] = y + (y - prev[o + 1]) * HAIR_DAMPING + ay
      p[o + 2] = z + (z - prev[o + 2]) * HAIR_DAMPING + az
      prev[o] = x
      prev[o + 1] = y
      prev[o + 2] = z
    }
  }
  // Two passes, each ending with the push-out, so no point rests inside a capsule. The first
  // shares each correction between the two points (the swing); the second runs root to tip
  // moving only the child, which leaves every length exact.
  constrain(h, PARENT_SHARE)
  collide(h)
  constrain(h, 0)
  collide(h)
}

function constrain(h: HairState, parentShare: number) {
  const { points: p, perChain, chains, lengths } = h
  for (let c = 0; c < chains; c++) {
    for (let i = 0; i < perChain - 1; i++) {
      const a = (c * perChain + i) * 3
      const b = a + 3
      const dx = p[b] - p[a]
      const dy = p[b + 1] - p[a + 1]
      const dz = p[b + 2] - p[a + 2]
      const d = Math.hypot(dx, dy, dz)
      if (d < 1e-9) continue
      const rest = lengths[c * (perChain - 1) + i]
      const diff = (d - rest) / d
      if (i === 0 || parentShare === 0) {
        // The root is pinned: the child takes the whole correction.
        p[b] -= dx * diff
        p[b + 1] -= dy * diff
        p[b + 2] -= dz * diff
      } else {
        // Nearer the root a point is heavier: the child takes most of the correction.
        const up = diff * parentShare
        const down = diff * (1 - parentShare)
        p[a] += dx * up
        p[a + 1] += dy * up
        p[a + 2] += dz * up
        p[b] -= dx * down
        p[b + 1] -= dy * down
        p[b + 2] -= dz * down
      }
    }
  }
}

function collide(h: HairState) {
  const { points: p, perChain, chains, capsulesWorld: cw } = h
  for (let k = 0; k < cw.length; k += 7) {
    const ax = cw[k]
    const ay = cw[k + 1]
    const az = cw[k + 2]
    const bx = cw[k + 3] - ax
    const by = cw[k + 4] - ay
    const bz = cw[k + 5] - az
    const r = cw[k + 6]
    const bb = bx * bx + by * by + bz * bz
    for (let c = 0; c < chains; c++) {
      for (let i = 1; i < perChain; i++) {
        const o = (c * perChain + i) * 3
        const px = p[o] - ax
        const py = p[o + 1] - ay
        const pz = p[o + 2] - az
        let t = bb > 0 ? (px * bx + py * by + pz * bz) / bb : 0
        t = t < 0 ? 0 : t > 1 ? 1 : t
        const nx = px - bx * t
        const ny = py - by * t
        const nz = pz - bz * t
        const d = Math.hypot(nx, ny, nz)
        if (d >= r) continue
        if (d < 1e-9) {
          p[o + 1] = ay + by * t + r
          continue
        }
        const push = r / d
        p[o] = ax + bx * t + nx * push
        p[o + 1] = ay + by * t + ny * push
        p[o + 2] = az + bz * t + nz * push
      }
    }
  }
}

/** Signed distance of a world point to capsule `k` (negative inside), for tests and callouts. */
export function capsuleDistance(h: HairState, k: number, x: number, y: number, z: number): number {
  const cw = h.capsulesWorld
  const o = k * 7
  const bx = cw[o + 3] - cw[o]
  const by = cw[o + 4] - cw[o + 1]
  const bz = cw[o + 5] - cw[o + 2]
  const px = x - cw[o]
  const py = y - cw[o + 1]
  const pz = z - cw[o + 2]
  const bb = bx * bx + by * by + bz * bz
  let t = bb > 0 ? (px * bx + py * by + pz * bz) / bb : 0
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - cw[o + 6]
}

/**
 * The rotation that takes segment `i` of `chain` (point i → i+1) from its rest direction in
 * WORLD space (the rest bone direction carried through the current head rotation) to its current
 * world direction, as a quaternion [x, y, z, w]. For a bone that is a child of Head and whose rest
 * pose matches `rest`, premultiplying this (in head space) onto the bone's rest quaternion gives
 * its pose. Returns identity for a degenerate segment.
 */
export function segmentQuaternion(h: HairState, chain: number, i: number, out: Float32Array): Float32Array {
  const a = (chain * h.perChain + i) * 3
  const b = a + 3
  const m = h.head
  // Rest direction, rotated (not translated) by the head.
  const rx = h.rest[b] - h.rest[a]
  const ry = h.rest[b + 1] - h.rest[a + 1]
  const rz = h.rest[b + 2] - h.rest[a + 2]
  let fx = m[0] * rx + m[4] * ry + m[8] * rz
  let fy = m[1] * rx + m[5] * ry + m[9] * rz
  let fz = m[2] * rx + m[6] * ry + m[10] * rz
  let tx = h.points[b] - h.points[a]
  let ty = h.points[b + 1] - h.points[a + 1]
  let tz = h.points[b + 2] - h.points[a + 2]
  const fl = Math.hypot(fx, fy, fz)
  const tl = Math.hypot(tx, ty, tz)
  if (fl < 1e-9 || tl < 1e-9) {
    out[0] = out[1] = out[2] = 0
    out[3] = 1
    return out
  }
  fx /= fl
  fy /= fl
  fz /= fl
  tx /= tl
  ty /= tl
  tz /= tl
  const d = fx * tx + fy * ty + fz * tz
  if (d < -0.999999) {
    // Opposite: half a turn about any axis perpendicular to f.
    let ux = -fy
    let uy = fx
    let uz = 0
    if (Math.abs(fx) < 1e-6 && Math.abs(fy) < 1e-6) {
      ux = 0
      uy = -fz
      uz = fy
    }
    const ul = Math.hypot(ux, uy, uz)
    out[0] = ux / ul
    out[1] = uy / ul
    out[2] = uz / ul
    out[3] = 0
    return out
  }
  const cx = fy * tz - fz * ty
  const cy = fz * tx - fx * tz
  const cz = fx * ty - fy * tx
  const w = 1 + d
  const n = Math.hypot(cx, cy, cz, w)
  out[0] = cx / n
  out[1] = cy / n
  out[2] = cz / n
  out[3] = w / n
  return out
}

import { type Bone, type Object3D, Matrix4, Quaternion, SkinnedMesh, Vector3 } from 'three'
import { createGait, createIdle, GAIT, LEGS, solveLeg, spring2, stepGait, stepIdle, type GaitState, type IdleOut, type IdleState, type Leg, type LegRest } from '../gait'

/*
 * The deer's bones driven by the procedural gait (gait.ts): the legs' three segments by the IK,
 * the neck's nod and the head's counter, the ears' flicks, the plates and jets on springs behind
 * the body's bob. Every rotation composes with the bone's rest quaternion about her lateral axis
 * (the root's z: x is forward, y up), so the artist's rest pose is the zero. The leg geometry is
 * measured once from the bound skeleton; the toe from the hoof's lowest skinned vertices.
 */

const PREFIX: Record<Leg, string> = { LF: 'FL', RF: 'FR', LH: 'HL', RH: 'HR' }
const SEG = ['Upper', 'Lower', 'Hoof'] as const
const DEG = Math.PI / 180
const Z = new Vector3(0, 0, 1)
const Q = new Quaternion()

interface Driven {
  bone: Object3D
  rest: Quaternion
  axis: Vector3
}

export interface Drive {
  h: number
  rest: Record<Leg, LegRest>
  /** The rest pose's segment angles (degrees from straight down, + forward) per leg: upper, lower, hoof. */
  restAng: Record<Leg, [number, number, number]>
  legs: Record<Leg, [Driven, Driven, Driven]>
  neck: Driven | null
  head: Driven | null
  ears: [Driven | null, Driven | null]
  springs: { d: Driven; x: number; v: number; gain: number }[]
  gait: GaitState
  idle: IdleState
  idleOut: IdleOut
  /** The page ground last seen (px), to step by its difference. */
  ground: number
}

function driven(bone: Object3D | undefined, rootInv: Quaternion): Driven | null {
  if (!bone) return null
  const qb = bone.getWorldQuaternion(new Quaternion()).premultiply(rootInv)
  return { bone, rest: bone.quaternion.clone(), axis: Z.clone().applyQuaternion(qb.invert()).normalize() }
}

/** Rotate `d` from its rest by `deg` about her lateral axis (+ swings a downward segment forward). */
function turn(d: Driven, deg: number) {
  d.bone.quaternion.copy(d.rest).multiply(Q.setFromAxisAngle(d.axis, deg * DEG))
}
/** Add `deg` about her lateral axis on top of whatever the bone holds this frame. */
function addTurn(d: Driven, deg: number) {
  d.bone.quaternion.multiply(Q.setFromAxisAngle(d.axis, deg * DEG))
}

const ang = (a: Vector3, b: Vector3) => Math.atan2(b.x - a.x, -(b.y - a.y)) / DEG
const len2 = (a: Vector3, b: Vector3) => Math.hypot(b.x - a.x, b.y - a.y)

/** Build the drive for a loaded figure, or null when it has no legs (a still model). */
export function createDrive(root: Object3D): Drive | null {
  if (!root.getObjectByName('FL_Upper')) return null
  root.updateMatrixWorld(true)
  const inv = new Matrix4().copy(root.matrixWorld).invert()
  const rootInv = root.getWorldQuaternion(new Quaternion()).invert()
  const at = (o: Object3D) => o.getWorldPosition(new Vector3()).applyMatrix4(inv)
  const meshes: SkinnedMesh[] = []
  root.traverse((o) => {
    if (o instanceof SkinnedMesh) meshes.push(o)
  })
  /** The hoof's toe: the mean of its lowest skinned vertices (rigid weights: a vertex belongs to one bone). */
  const toeOf = (hoof: Object3D, fallback: Vector3) => {
    const pts: Vector3[] = []
    const v = new Vector3()
    for (const m of meshes) {
      const k = m.skeleton.bones.indexOf(hoof as Bone)
      if (k < 0) continue
      const si = m.geometry.getAttribute('skinIndex')
      const sw = m.geometry.getAttribute('skinWeight')
      for (let i = 0; i < si.count; i++) {
        if (si.getX(i) !== k || sw.getX(i) < 0.5) continue
        m.getVertexPosition(i, v)
        pts.push(m.localToWorld(v.clone()).applyMatrix4(inv))
      }
    }
    if (!pts.length) return fallback
    const lo = Math.min(...pts.map((p) => p.y))
    const span = Math.max(...pts.map((p) => p.y)) - lo
    const low = pts.filter((p) => p.y < lo + 0.06 * span)
    return low.reduce((s, p) => s.add(p), new Vector3()).multiplyScalar(1 / low.length)
  }

  const geo = {} as Record<Leg, { hip: Vector3; knee: Vector3; ankle: Vector3; toe: Vector3 }>
  const legs = {} as Drive['legs']
  for (const leg of LEGS) {
    const b = SEG.map((s) => root.getObjectByName(`${PREFIX[leg]}_${s}`)!)
    const [hip, knee, ankle] = b.map(at)
    const toe = toeOf(b[2], ankle.clone().add(new Vector3(0, -0.3, 0)))
    geo[leg] = { hip, knee, ankle, toe }
    legs[leg] = b.map((o) => driven(o, rootInv)!) as [Driven, Driven, Driven]
  }
  const ground = Math.min(...LEGS.map((l) => geo[l].toe.y))
  const h = LEGS.reduce((s, l) => s + geo[l].hip.y - ground, 0) / 4
  // The stance under each hip: the planted foot of the pair (the source poses one fore leg raised).
  const planted = (a: Leg, b: Leg) => (geo[a].toe.y <= geo[b].toe.y ? a : b)
  const restMap = {} as Record<Leg, LegRest>
  const restAng = {} as Drive['restAng']
  for (const leg of LEGS) {
    const g = geo[leg]
    const pair = planted(leg[1] === 'F' ? 'LF' : 'LH', leg[1] === 'F' ? 'RF' : 'RH')
    const p = geo[pair]
    const base = { hip: { x: g.hip.x, y: g.hip.y }, upper: len2(g.hip, g.knee), lower: len2(g.knee, g.ankle), hoof: len2(g.ankle, g.toe), stand: { x: p.toe.x - p.hip.x, y: ground - g.hip.y } }
    restAng[leg] = [ang(g.hip, g.knee), ang(g.knee, g.ankle), ang(g.ankle, g.toe)]
    // The middle joint bends the way the artist's rest pose bends it.
    const flex = restAng[leg][1] - restAng[leg][0]
    restMap[leg] = { ...base, bend: flex >= 0 ? 1 : -1 }
  }
  const named = (n: string) => driven(root.getObjectByName(n), rootInv)
  const springs: Drive['springs'] = []
  for (const [n, gain] of [['Plate_L', 6], ['Plate_R', 6], ['Jet_L', -4], ['Jet_R', -4]] as const) {
    const d = named(n)
    if (d) springs.push({ d, x: 0, v: 0, gain })
  }
  return {
    h,
    rest: restMap,
    restAng,
    legs,
    neck: named('Neck'),
    head: named('Head'),
    ears: [named('Ear_L'), named('Ear_R')],
    springs,
    gait: createGait(restMap, h),
    idle: createIdle(7),
    idleOut: { chest: 1, roll: 0, sway: 0, flickL: 0, flickR: 0 },
    ground: NaN,
  }
}

export interface DriveInput {
  /** The page ground covered so far (px, monotonic) and the model units per px at her size. */
  ground: number
  unitsPerPx: number
  moving: boolean
  dt: number
  clock: number
  still: boolean
}

export interface BodyOut {
  bob: number
  sway: number
  roll: number
  pitch: number
}

/** The legs' bones for this frame (call before the gaze, which writes the head and neck on its own). */
export function stepDrive(d: Drive, i: DriveInput, body: BodyOut): void {
  const g = d.gait
  const travel = Number.isFinite(d.ground) ? Math.max(0, i.ground - d.ground) * i.unitsPerPx : 0
  d.ground = i.ground
  stepGait(g, d.rest, d.h, { travel: i.still ? 0 : travel, moving: i.moving && !i.still, dt: i.dt })
  stepIdle(d.idle, i.still ? 0 : i.clock, d.h, d.idleOut)
  // Idle weight shifts fade in as the walk fades out.
  const rest = 1 - g.active * g.plant
  body.bob = g.body.bob
  body.sway = g.body.sway + d.idleOut.sway * rest
  body.roll = g.body.roll + d.idleOut.roll * rest
  body.pitch = g.body.pitch
  const c = Math.cos(-body.pitch * DEG)
  const s = Math.sin(-body.pitch * DEG)
  for (const leg of LEGS) {
    const r = d.rest[leg]
    const pose = g.legs[leg]
    // The foot wanted on the ground, seen from the body (bobbed and pitched about her origin): the stance hoof holds still on the page.
    const fx = pose.foot.x
    const fy = pose.foot.y - body.bob
    const bx = fx * c - fy * s
    const by = fx * s + fy * c
    const ik = solveLeg(r, bx - r.hip.x, by - r.hip.y)
    const fold = pose.hoof + pose.lower
    const U = ik.upper
    const L = U + ik.lower
    const H = L + ik.hoof + fold
    const [ru, rl, rh] = d.restAng[leg]
    const [du, dl, dh] = d.legs[leg]
    turn(du, U - ru)
    turn(dl, L - rl - (U - ru))
    turn(dh, H - rh - (L - rl))
  }
  // The plates and jets lag the bob on their springs.
  for (const sp of d.springs) {
    ;[sp.x, sp.v] = spring2(sp.x, sp.v, i.still ? 0 : (sp.gain * body.bob) / (GAIT.bob * d.h), Math.min(i.dt, 1 / 30))
    turn(sp.d, sp.x)
  }
}

/** After the gaze has set the head and neck: the nod and its counter, and the ears' flicks. */
export function stepDriveHead(d: Drive): void {
  if (d.neck) addTurn(d.neck, -d.gait.neck)
  if (d.head) addTurn(d.head, -d.gait.head)
  const [l, r] = d.ears
  if (l) addTurn(l, d.idleOut.flickL)
  if (r) addTurn(r, d.idleOut.flickR)
}

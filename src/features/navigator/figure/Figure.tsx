import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bone, Euler, Group, Matrix4, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three'
import { createHair, segmentQuaternion, stepHair, type HairState } from '../hair'
import { nav } from '../state'
import { CHAKRAS } from '../yantra'
import { GLB_URL, HAIR_BONES, type Figure as FigureData } from './contract'
import { loadFigure, type LoadedFigure } from './loadFigure'
import { markWorldReady } from '../../observatory/ready'

/** What the world asks of the figure each frame. */
export interface FigureRig {
  /** Her turning group, once mounted (for callouts and the field). */
  group: Group | null
  /** The seven systems' nodes, for the callouts. */
  systems: Object3D[]
  /** Her measurements, once loaded. */
  metrics: FigureData['metrics'] | null
  /** 0 … 1: the callouts open beside her parts (the systems beat). */
  explode: number
  /** 0 … 1: how far the ignition has played. */
  assembled: number
  /** Her slow float (world units), for whoever places her. */
  float: number
}

const DEG = Math.PI / 180
/** How the head's turn is shared down the neck: Head, Neck, Spine2. */
const SHARE = { Head: 0.6, Neck: 0.3, Spine2: 0.1 } as const
const BREATH_M = 0.004
/** Breathing as scale on the chest (Spine2, which carries the neck): 0.5 % at the breath's peak. */
const BREATH_SCALE = 0.005
/** The emissive strips' materials (the GLB's E_Neck, E_Head, E_Eyes and the chest strip). */
const STRIPS = /^(E_Eyes|E_Head|E_Neck|Material\.002)$/
const COLLAR_TURN = 0.006 // map offset per second

/* Hair: the Verlet chains (hair.ts) live in the head's space in metres and are carried into world
 * units by the Head bone's world matrix, so gravity and the wind scale with the figure. */
const HAIR_BUDGET_MS = 0.3
const HAIR_REPORT_S = 2
/** The head capsule: a sphere-like capsule about the head's centre; the shoulders: a bar across Spine2. */
const HEAD_CAPSULE_R = 0.5 // × head height (the roots sit on the scalp just outside it)
const SHOULDER_R = 0.3
const SHOULDER_HALF = 0.6
/** The wind: a slow drift (m/s²) plus the scroll's stream, up and back, per screen/s (6 screens/s tilts the tips ~32°, a lift of ~15% of their length). */
const WIND_NOISE = 0.15
const WIND_NOISE_HZ = 0.3
const WIND_UP = 0.42
const WIND_BACK = 0.75
const PROFILE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('profile')
/** Dev only: ?hairdrop forces the six-chain path after the warm-up window, to test it. */
const SW_PARENT = new Quaternion()
const SW_REST = new Quaternion()
const SW_DELTA = new Quaternion()
const SW_EULER = new Euler()

const FORCE_DROP = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('hairdrop')

interface HairRig {
  state: HairState
  /** Which chains of the figure the state simulates (index into figure.hair.bones). */
  chains: number[]
  /** Each bone's rest quaternion (parent space) and its rest rotation relative to the Head. */
  restLocal: Quaternion[][]
  restFromHead: Quaternion[][]
  /** The budget's bookkeeping: time spent and frames stepped since the last report. */
  ms: number
  frames: number
  since: number
  /** Windows measured so far: the first (the JIT's warm-up) never decides the chain count. */
  windows: number
  dropped: boolean
  /** Whether the figure was on screen last frame: back from the dock, the strands re-prime in the new head frame. */
  shown: boolean
}

/** Head-local rest points of the chosen chains and the two capsules, from what the loader measured (never from live matrices). */
function hairRest(figure: LoadedFigure, chains: number[]) {
  const hair = figure.hair!
  const rest = new Float32Array(chains.length * HAIR_BONES * 3)
  chains.forEach((c, i) => rest.set(hair.restHead.subarray(c * HAIR_BONES * 3, (c + 1) * HAIR_BONES * 3), i * HAIR_BONES * 3))
  const h = figure.metrics.headHeight
  const [sx, sy, sz] = hair.shoulder
  const capsules = new Float32Array([
    0, 0.45 * h, 0, 0, 0.55 * h, 0, HEAD_CAPSULE_R * h,
    sx - SHOULDER_HALF * h, sy, sz, sx + SHOULDER_HALF * h, sy, sz, SHOULDER_R * h,
  ])
  return { rest, capsules }
}

function buildHair(figure: LoadedFigure, chains: number[], prev?: HairRig): HairRig {
  const { rest, capsules } = hairRest(figure, chains)
  const bones = figure.hair!.bones
  const restLocal = bones.map((list) => list.map((b) => b.quaternion.clone()))
  const restFromHead = restLocal.map((list) => {
    let acc = new Quaternion()
    return list.map((q) => {
      acc = acc.clone().multiply(q)
      return acc
    })
  })
  return { state: createHair(rest, chains.length, HAIR_BONES, capsules), chains, restLocal, restFromHead, ms: 0, frames: 0, since: 0, windows: 0, dropped: prev?.dropped ?? false, shown: false }
}

const M = new Matrix4()
const HEAD_Q = new Quaternion()
const Q = new Quaternion()
const W = new Quaternion()
const PARENT = new Quaternion()
const SEG = new Float32Array(4)
const EAR_Q = new Quaternion()
const headMatrix = new Float32Array(16)
const wind: [number, number, number] = [0, 0, 0]

/** Put every hair bone back on its rest quaternion (the still frame). */
function restHair(figure: LoadedFigure, h: HairRig) {
  figure.hair!.bones.forEach((list, c) => list.forEach((b, k) => b.quaternion.copy(h.restLocal[c][k])))
}

/**
 * One frame of hair: the Head bone's world matrix carries the roots, the step lags the strands,
 * and each chain bone takes the rotation from its rest segment to the simulated one (in world
 * space, from `segmentQuaternion`), converted to its parent's space down the chain.
 */
function applyHair(figure: LoadedFigure, h: HairRig, dt: number, t: number) {
  const head = figure.bones.Head
  head.updateWorldMatrix(true, false)
  const m = head.matrixWorld
  headMatrix.set(m.elements)
  const scale = Math.hypot(m.elements[0], m.elements[1], m.elements[2])
  const v = Math.abs(nav.scrollV)
  // Metres per second squared, scaled to the figure's world units (as gravity is).
  wind[0] = WIND_NOISE * (Math.sin(t * WIND_NOISE_HZ * Math.PI * 2) * 0.7 + Math.sin(t * WIND_NOISE_HZ * 1.7 * Math.PI * 2 + 1.3) * 0.3) * scale
  wind[1] = WIND_UP * v * scale
  wind[2] = -WIND_BACK * v * scale
  h.state.gravity = 9.8 * scale
  stepHair(h.state, dt, headMatrix, wind)
  M.extractRotation(m)
  HEAD_Q.setFromRotationMatrix(M).normalize()
  const bones = figure.hair!.bones
  h.chains.forEach((c, i) => {
    const list: Bone[] = bones[c]
    PARENT.copy(HEAD_Q)
    for (let k = 0; k < list.length; k++) {
      segmentQuaternion(h.state, i, Math.min(k, HAIR_BONES - 2), SEG)
      Q.set(SEG[0], SEG[1], SEG[2], SEG[3])
      // World rotation wanted: the segment's swing, on the head's turn, on the bone's rest pose.
      W.copy(Q).multiply(HEAD_Q).multiply(h.restFromHead[c][k])
      list[k].quaternion.copy(PARENT).invert().multiply(W)
      PARENT.copy(W)
    }
  })
}

// One figure per variant: StrictMode's double mount and a remount reuse the same load.
const loads = new Map<string, Promise<LoadedFigure>>()
function figureFor(variant: string): Promise<LoadedFigure> {
  let p = loads.get(variant)
  if (!p) {
    p = loadFigure(GLB_URL)
    loads.set(variant, p)
  }
  return p
}

const damp = (from: number, to: number, l: number, dt: number) => from + (to - from) * (1 - Math.exp(-l * dt))

/**
 * The Navigator, loaded from her GLB and brought to life: every frame she applies `nav.perf`
 * (gaze, head, blink, jaw, ears, breath, the seven systems' light, the disks in her eyes) to her
 * bones and materials. The world's variant also tells the page where her eyes and mouth are
 * (`nav.anchor`). Where she stands is the poser's business: this group is placed from outside.
 */
export function Figure({ rig, variant }: { rig: FigureRig; variant: 'world' | 'dock' }) {
  const group = useRef<Group>(null)
  const [figure, setFigure] = useState<LoadedFigure | null>(null)
  const { camera, size } = useThree()
  const v = useMemo(() => new Vector3(), [])
  const w = useMemo(() => new Vector3(), [])
  const show = useRef(0)
  const firstFrame = useRef(false)
  const collarOffset = useRef(0)
  const hair = useRef<HairRig | null>(null)
  /** Single hair bones (HairSway_n, a model's own dynamic-hair joints): a damped spring per bone that lags her turns. */
  const sway = useRef<{ bones: Object3D[]; rest: Quaternion[]; ang: Float32Array; vel: Float32Array; last: { yaw: number; pitch: number } } | null>(null)

  useEffect(() => {
    let live = true
    figureFor(variant).then(
      (f) => live && setFigure(f),
      (e: unknown) => {
        // The still (the drawn face in the hero) stays; in dev the error also surfaces.
        document.documentElement.classList.add('gl-off')
        markWorldReady()
        if (import.meta.env.DEV) setTimeout(() => { throw e })
      },
    )
    return () => {
      live = false
    }
  }, [variant])

  // Rest poses of what we rotate, captured once per loaded figure.
  const rest = useMemo(() => {
    if (!figure) return null
    const r = (o: Object3D | undefined) => (o ? { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z } : null)
    const earMats = (bone: Object3D | undefined) => {
      const out: MeshStandardMaterial[] = []
      bone?.traverse((o) => {
        const m = (o as { material?: unknown }).material
        if (m instanceof MeshStandardMaterial) {
          m.emissive.set(CHAKRAS[6].color)
          m.emissiveIntensity = 0
          out.push(m)
        }
      })
      return out
    }
    // Each ear's lateral axis in the bone's own space (the root's z: x forward, y up), measured at rest.
    figure.root.updateMatrixWorld(true)
    const rootInv = figure.root.getWorldQuaternion(new Quaternion()).invert()
    const earAxes: { bone: Object3D; axis: Vector3; side: -1 | 1 }[] = []
    for (const [bone, side] of [[figure.bones.Ear_L, -1], [figure.bones.Ear_R, 1]] as const) {
      if (!bone) continue
      const qb = bone.getWorldQuaternion(new Quaternion()).premultiply(rootInv)
      earAxes.push({ bone, axis: new Vector3(0, 0, 1).applyQuaternion(qb.invert()).normalize(), side })
    }
    const strips: { mat: MeshStandardMaterial; r: number; g: number; b: number; i: number }[] = []
    // By material name (the strips' materials are cloned per mesh by the loader; their names survive).
    figure.root.traverse((m) => {
      const mats = (m as { material?: unknown }).material
      for (const mat of Array.isArray(mats) ? mats : [mats]) {
        if (mat instanceof MeshStandardMaterial && STRIPS.test(mat.name) && !strips.some((s) => s.mat === mat)) strips.push({ mat, r: mat.emissive.r, g: mat.emissive.g, b: mat.emissive.b, i: mat.emissiveIntensity })
      }
    })
    const collar = figure.root.getObjectByName('Collar') as { material?: MeshStandardMaterial } | undefined
    return {
      head: r(figure.bones.Head)!,
      neck: r(figure.bones.Neck)!,
      spine2: r(figure.bones.Spine2)!,
      spine2Z: figure.bones.Spine2.position.z,
      eyes: figure.eyes.map((e) => r(e)!),
      earL: r(figure.bones.Ear_L),
      earR: r(figure.bones.Ear_R),
      earMats: [...earMats(figure.bones.Ear_L), ...earMats(figure.bones.Ear_R)],
      earAxes,
      strips,
      collarMap: collar?.material instanceof MeshStandardMaterial ? collar.material.map : null,
    }
  }, [figure])

  // The hair's chains, world variant only (the dock's badge is still too small for it to read).
  useEffect(() => {
    hair.current = variant !== 'dock' && figure?.hair ? buildHair(figure, figure.hair.bones.map((_, i) => i)) : null
    if (figure && variant !== 'dock') {
      const bones: Object3D[] = []
      for (let i = 1; i <= 16; i++) {
        const b = figure.root.getObjectByName(`HairSway_${i}`)
        if (b) bones.push(b)
      }
      sway.current = bones.length ? { bones, rest: bones.map((b) => b.quaternion.clone()), ang: new Float32Array(bones.length * 2), vel: new Float32Array(bones.length * 2), last: { yaw: 0, pitch: 0 } } : null
    } else sway.current = null
  }, [figure, variant])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    rig.group = g
    if (!figure || !rest) return
    // The first frame with her in it: the loader may lift once it is on screen (the next frame).
    if (variant === 'world' && !firstFrame.current) {
      firstFrame.current = true
      requestAnimationFrame(() => markWorldReady())
    }
    rig.systems = figure.systems
    rig.metrics = figure.metrics
    const p = nav.perf
    const t = state.clock.elapsedTime
    const still = nav.still

    // Ignition: the systems light root → crown; the eyes open last, when the crown is lit.
    let lit = 0
    for (let i = 0; i < 7; i++) lit = Math.max(lit, p.sys[i])
    rig.assembled = Math.min(1, lit)
    const crown = Math.min(1, Math.max(0, (p.sys[6] - 0.3) / 0.6))
    show.current = still ? 1 : damp(show.current, crown, 6, dt)
    for (const m of figure.eyeMats) {
      m.uniforms.uShow.value = show.current
      m.uniforms.uTime.value = t
      m.uniforms.uBright.value = p.bright
      m.uniforms.uBand.value = Math.round(p.band)
    }


    // Gaze: the eyes lead; head, neck and shoulders share the head's turn; the body turns the group.
    const set = (o: Object3D, r: { x: number; y: number; z: number }, yaw: number, pitch: number) => {
      o.rotation.set(r.x - pitch * DEG, r.y + yaw * DEG, r.z)
    }
    figure.eyes.forEach((e, i) => set(e, rest.eyes[i], p.eyes.yaw, p.eyes.pitch))
    set(figure.bones.Head, rest.head, p.head.yaw * SHARE.Head, p.head.pitch * SHARE.Head)
    set(figure.bones.Neck, rest.neck, p.head.yaw * SHARE.Neck, p.head.pitch * SHARE.Neck)
    set(figure.bones.Spine2, rest.spine2, p.head.yaw * SHARE.Spine2, p.head.pitch * SHARE.Spine2)
    // Hair bones without chains: each one swings against the head's angular speed and lifts with the
    // scroll, on a spring (k 35, c 6), applied in world space over the bone's rest so any rig works.
    const sw = sway.current
    if (sw) {
      const step = Math.min(dt, 1 / 30)
      const yawVel = (p.head.yaw - sw.last.yaw) / Math.max(step, 1e-3)
      const pitchVel = (p.head.pitch - sw.last.pitch) / Math.max(step, 1e-3)
      sw.last.yaw = p.head.yaw
      sw.last.pitch = p.head.pitch
      const lift = -7 * Math.min(Math.abs(nav.scrollV), 2)
      sw.bones.forEach((b, i) => {
        const k = 1 + 0.12 * i
        const tYaw = nav.still ? 0 : Math.max(-20, Math.min(20, -0.5 * yawVel * k))
        const tPitch = nav.still ? 0 : Math.max(-18, Math.min(18, -0.5 * pitchVel * k + lift))
        for (const [j, target] of [[0, tYaw], [1, tPitch]] as const) {
          const a = sw.ang[i * 2 + j]
          const v = sw.vel[i * 2 + j]
          const acc = 35 * (target - a) - 6 * v
          sw.vel[i * 2 + j] = v + acc * step
          sw.ang[i * 2 + j] = a + sw.vel[i * 2 + j] * step
        }
        if (!b.parent) return
        b.parent.getWorldQuaternion(SW_PARENT)
        SW_REST.copy(SW_PARENT).multiply(sw.rest[i])
        SW_DELTA.setFromEuler(SW_EULER.set(sw.ang[i * 2 + 1] * DEG, sw.ang[i * 2] * DEG, 0))
        b.quaternion.copy(SW_PARENT.invert()).multiply(SW_DELTA.multiply(SW_REST))
      })
    }
    g.rotation.y = p.body.yaw * DEG

    // Blink (closed until the eyes ignite), jaw, breath.
    figure.blink(Math.max(p.lids, 1 - show.current))
    figure.jaw(p.jaw)
    figure.bones.Spine2.position.z = rest.spine2Z + BREATH_M * p.breath
    figure.bones.Spine2.scale.setScalar(1 + BREATH_SCALE * p.breath)
    // The strips' light: toward the tint, times the gain.
    const tint = p.tint
    for (const s of rest.strips) {
      s.mat.emissive.setRGB(s.r + (tint.r - s.r) * tint.mix, s.g + (tint.g - s.g) * tint.mix, s.b + (tint.b - s.b) * tint.mix)
      s.mat.emissiveIntensity = s.i * tint.gain
    }

    // Ears: prick (tips rise toward vertical), the cursor-side ear turns toward it, tips glow while she types.
    const earL = figure.bones.Ear_L
    const earR = figure.bones.Ear_R
    if (earL && rest.earL) earL.rotation.set(rest.earL.x, rest.earL.y + (p.ears.turn < 0 ? -p.ears.turn * DEG : 0), rest.earL.z - p.ears.prick * DEG)
    if (earR && rest.earR) earR.rotation.set(rest.earR.x, rest.earR.y + (p.ears.turn > 0 ? -p.ears.turn * DEG : 0), rest.earR.z + p.ears.prick * DEG)
    // The ears' rest lean (gravity) and their flicks, about her lateral axis on top of the prick and turn.
    for (const e of rest.earAxes) {
      const deg = p.ears.back + (e.side < 0 ? p.ears.flickL : p.ears.flickR)
      if (deg) e.bone.quaternion.multiply(EAR_Q.setFromAxisAngle(e.axis, -deg * DEG))
    }
    for (const m of rest.earMats) m.emissiveIntensity = 1.2 * p.ears.glow

    // The seven systems' light; the throat (Sys_05) also carries the ears' glow.
    figure.sysMats.forEach((m, i) => {
      const s = p.sys[i] + (i === 4 ? 0.6 * p.ears.glow : 0)
      m.emissiveIntensity = 0.3 + 2.2 * s
      figure.glows[i].opacity = 0.12 + 0.3 * Math.min(1, Math.max(0, s))
    })

    // The collar's ring turns slowly (when the model gives it a map).
    if (rest.collarMap && !still) {
      collarOffset.current = (collarOffset.current + dt * COLLAR_TURN) % 1
      rest.collarMap.offset.x = collarOffset.current
    }
    rig.float = still ? 0 : Math.sin(t * 0.6) * 0.02 * figure.metrics.headHeight

    // Hair: lags her turns, lifts with the scroll; still (reduced motion) keeps the rest pose.
    const h = hair.current
    if (h && !g.visible) h.shown = false
    if (h && g.visible) {
      if (!h.shown) {
        // Reappearing (after the dock): the points start from rest where the head is now, not where it was.
        h.state.primed = false
        h.shown = true
      }
      if (still) {
        if (h.state.primed) {
          restHair(figure, h)
          h.state.primed = false
        }
      } else {
        const t0 = performance.now()
        applyHair(figure, h, dt, t)
        h.ms += performance.now() - t0
        h.frames++
        h.since += dt
        if (h.since >= HAIR_REPORT_S) {
          const mean = h.ms / Math.max(1, h.frames)
          h.windows++
          if (PROFILE) console.info(`[navigator] hair step ${mean.toFixed(3)} ms mean over ${h.frames} frames at ${(h.frames / h.since).toFixed(0)} fps (${h.chains.length} chains)`)
          // Over budget after the warm-up: drop to six chains (skip the middle one), once.
          if ((mean > HAIR_BUDGET_MS || FORCE_DROP) && h.windows > 1 && !h.dropped && h.chains.length > 6) {
            const keep = h.chains.filter((_, i) => i !== Math.floor(h.chains.length / 2))
            restHair(figure, h)
            hair.current = buildHair(figure, keep, h)
            hair.current.dropped = true
            console.warn(`[navigator] hair over ${HAIR_BUDGET_MS} ms (${mean.toFixed(3)} ms): dropped to ${keep.length} chains`)
          } else {
            h.ms = 0
            h.frames = 0
            h.since = 0
          }
        }
      }
    }

    // Where she is on the page, for the living systems and the speech card: the visible figure
    // writes it (the dock's while she rests at the dock, the world's otherwise).
    const writes = variant === 'dock' ? nav.atDock : !nav.atDock && g.visible
    if (!writes) {
      if (variant !== 'dock' && !nav.atDock) nav.anchor.on = false
      return
    }
    // The dock's canvas is centred on the header's slot; its pixels are offset by its own corner.
    let ox = 0
    let oy = 0
    if (variant === 'dock') {
      const d = nav.dock
      ox = d.x + d.w / 2 - size.width / 2
      oy = d.y + d.h / 2 - size.height / 2
    }
    figure.root.updateMatrixWorld(true)
    figure.eyes[0].getWorldPosition(v)
    figure.eyes[1].getWorldPosition(w)
    v.add(w).multiplyScalar(0.5)
    // The head's height in px: the eyes' point lifted by the head's height, projected.
    w.copy(v).addScaledVector(up(g), figure.metrics.headHeight * g.scale.y)
    const ex = toX(v.project(camera).x, size.width)
    const ey = toY(v.y, size.height)
    w.project(camera)
    nav.anchor.eyes.x = ox + ex
    nav.anchor.eyes.y = oy + ey
    nav.anchor.headPx = Math.abs(toY(w.y, size.height) - ey)
    figure.mouth.getWorldPosition(v).project(camera)
    nav.anchor.mouth.x = ox + toX(v.x, size.width)
    nav.anchor.mouth.y = oy + toY(v.y, size.height)
    nav.anchor.on = true
  })

  return <group ref={group}>{figure && <primitive object={figure.root} />}</group>
}

const toX = (ndc: number, w: number) => ((ndc + 1) / 2) * w
const toY = (ndc: number, h: number) => ((1 - ndc) / 2) * h
const UP = new Vector3()
/** The group's local +y in world space (she can turn, so "up the head" follows her). */
function up(g: Group) {
  return UP.set(0, 1, 0).applyQuaternion(g.quaternion).normalize()
}

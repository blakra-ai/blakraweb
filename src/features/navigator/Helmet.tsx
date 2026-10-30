import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  MeshPhysicalMaterial,
  ShaderMaterial,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { COLLAR, EXPLODE, EXPLODE_COLLAR, EXPLODE_SHELL, EXPLODE_TORSO, PART_BASE, TORSO, collarTexture, finGeometry, glowTexture, shellTexture } from './figure'
import { lens, withLens } from './lens'
import { LAYERS, nav } from './state'
import { visorFragment, visorVertex } from './visor'
import { CHAKRAS } from './yantra'

export { EXPLODE, LABEL_DY, SUBSYSTEMS } from './figure'

const SHELL = new Vector3(1, 1.06, 1.04)
// The visor's patch of the dome (SphereGeometry angles): centred on the front, taller above the eyes.
const V = { phi0: Math.PI / 2 - 0.98, phiLen: 1.96, th0: 0.92, thLen: 1.2 }

const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const damp = (from: number, to: number, l: number, dt: number) => from + (to - from) * (1 - Math.exp(-l * dt))

/** A point on the visor's dome from its (u, v) texture coordinates, at radius r (before the shell's scale). */
function onVisor(u: number, v: number, r: number) {
  const phi = V.phi0 + u * V.phiLen
  const th = V.th0 + (1 - v) * V.thLen
  return new Vector3(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th)).multiply(SHELL)
}

/** The visor's outline (the same rounded rectangle its shader keeps), as points on the dome. */
function visorOutline(r: number, n = 160) {
  const hw = 0.5
  const hh = 0.44
  const cr = 0.16
  const pts: Vector3[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const d = new Vector2(Math.cos(a), Math.sin(a))
    let lo = 0
    let hi = 1
    for (let k = 0; k < 24; k++) {
      const m = (lo + hi) / 2
      const qx = Math.abs(d.x * m) - (hw - cr)
      const qy = Math.abs(d.y * m) - (hh - cr)
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - cr
      if (sd > 0) hi = m
      else lo = m
    }
    pts.push(onVisor(0.5 + d.x * lo, 0.5 + d.y * lo, r))
  }
  return pts
}

function blueprint(outline: Vector3[]) {
  const seg: number[] = []
  const line = (pts: Vector3[], closed = false) => {
    for (let i = 0; i < pts.length - 1 + (closed ? 1 : 0); i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      seg.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }
  const ring = (r: number, y: number) => Array.from({ length: 97 }, (_, i) => new Vector3(Math.cos((i / 96) * Math.PI * 2) * r, y, Math.sin((i / 96) * Math.PI * 2) * r))
  for (let lat = -45; lat <= 60; lat += 35) {
    const y = Math.sin((lat * Math.PI) / 180)
    const r = Math.cos((lat * Math.PI) / 180)
    line(ring(r, y).map((p) => p.multiply(SHELL)))
  }
  for (let lon = 0; lon < 180; lon += 45) {
    const a = (lon * Math.PI) / 180
    line(Array.from({ length: 97 }, (_, i) => {
      const t = -Math.PI / 2 + (i / 96) * Math.PI * 1.35
      return new Vector3(Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)).multiply(SHELL)
    }))
  }
  line(outline, true)
  for (const p of [COLLAR[1], COLLAR[3], COLLAR[5]]) line(ring(p.x, -1.02 + p.y))
  for (const p of [TORSO[3], TORSO[5], TORSO[7]]) line(ring(p.x, p.y))
  line([new Vector3(0, -3.3, 0), new Vector3(0, 1.85, 0)])
  line([new Vector3(-1.4, 0, 0), new Vector3(1.4, 0, 0)])
  line([new Vector3(1.5, -3.0, 0), new Vector3(1.5, 1.06, 0)])
  for (const y of [-3.0, 1.06]) line([new Vector3(1.42, y, 0), new Vector3(1.58, y, 0)])
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(seg, 3))
  return geo
}

/** What the world asks of the figure each frame. */
export interface HelmetRig {
  /** Its turning group, once mounted (for callouts and the field). */
  group: Group | null
  /** The parts' groups, by subsystem. */
  parts: (Group | null)[]
  /** 0 … 1: assembled … fully exploded. */
  explode: number
  /** 0 … 1: how far the assembly has played. */
  assembled: number
  /** His slow float (world units), for whoever places him. */
  float: number
}

/**
 * The Navigator, built. A ceramic head with its seams and the mark on its forehead, the visor
 * holding the black hole's reflection, two comms fins swept back like an elf's ears and lit at
 * their tips, a collar engraved with the seven yantras, a segmented neck. A sculpted torso with
 * a graphite chest plate (the core window and the control unit set in it), rounded pauldrons,
 * two arms at rest, a coolant ring at the waist, and twin power tanks on the back. Seven
 * subsystems, each lit in its chakra's colour with a soft glow. He assembles as the page opens,
 * follows the cursor with his gaze, blinks now and then, shows his blueprint under the X-ray
 * lens, opens into his parts along his axis, lights only the parts a chosen mission takes, and
 * pulses his fins while he types.
 */
export function Helmet({ rig }: { rig: HelmetRig }) {
  const root = useRef<Group>(null)
  const shell = useRef<Group>(null)
  const visor = useRef<Group>(null)
  const collar = useRef<Group>(null)
  const torso = useRef<Group>(null)
  const parts = useRef<(Group | null)[]>([])
  const ears = useRef<(Group | null)[]>([])
  const turn = useRef({ x: 0, y: 0 })
  const explode = useRef(0)
  const intensity = useRef(CHAKRAS.map(() => 1.6))

  const outline = useMemo(() => visorOutline(1.018), [])
  const geo = useMemo(
    () => ({
      gasket: new TubeGeometry(new CatmullRomCurve3(outline, true), 240, 0.024, 12, true),
      lines: blueprint(visorOutline(1.0)),
      collar: new LatheGeometry(COLLAR, 160),
      torso: new LatheGeometry(TORSO, 160),
      fin: finGeometry(0.46, 1.18, 0.11),
      finInner: finGeometry(0.3, 1.0, 0.05),
      plate: new RoundedBoxGeometry(1.26, 0.92, 0.16, 4, 0.14),
      unit: new RoundedBoxGeometry(0.5, 0.2, 0.08, 3, 0.04),
    }),
    [outline],
  )
  const mats = useMemo(() => {
    const ceramic = withLens(new MeshPhysicalMaterial({ map: shellTexture(), roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.3, sheenColor: new Color('#ffffff') }), 'outside')
    const plain = withLens(new MeshPhysicalMaterial({ color: '#f3f1ec', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.3, sheenColor: new Color('#ffffff') }), 'outside')
    const metal = withLens(new MeshPhysicalMaterial({ map: collarTexture(), metalness: 0.85, roughness: 0.3, clearcoat: 0.6 }), 'outside')
    const brass = withLens(new MeshPhysicalMaterial({ color: '#c9a86a', metalness: 1, roughness: 0.28, clearcoat: 0.5 }), 'outside')
    const graphite = withLens(new MeshPhysicalMaterial({ color: '#2a2b31', metalness: 0.55, roughness: 0.36, clearcoat: 0.8 }), 'outside')
    const accent = withLens(new MeshPhysicalMaterial({ color: '#ff5a1f', roughness: 0.3, clearcoat: 1, emissive: new Color('#ff5a1f'), emissiveIntensity: 0.15 }), 'outside')
    const dark = withLens(new MeshPhysicalMaterial({ color: '#0b0b10', roughness: 0.6 }), 'outside')
    const lights = CHAKRAS.map((c) => withLens(new MeshPhysicalMaterial({ color: c.color, emissive: new Color(c.color), emissiveIntensity: 1.6, roughness: 0.2 }), 'outside'))
    const glowMap = glowTexture()
    const glows = CHAKRAS.map((c) => new SpriteMaterial({ map: glowMap, color: c.color, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }))
    const visorMat = new ShaderMaterial({ vertexShader: visorVertex, fragmentShader: visorFragment, uniforms: { uLens: lens, uTime: { value: 0 }, uHole: { value: new Vector3(-0.32, 0.22, 1) }, uShow: { value: 0 } } })
    const ink = withLens(new LineBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: 0.85, depthTest: false }), 'inside')
    return { ceramic, plain, metal, brass, graphite, accent, dark, lights, glows, visorMat, ink }
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    // Assembling: the torso rises, the collar settles, the head lowers into place, the visor slides home, the systems light.
    const a = nav.still ? 1 : span(t, 0.3, 3.1)
    rig.assembled = a
    const pTorso = ease(span(a, 0, 0.5))
    const pCollar = ease(span(a, 0.1, 0.55))
    const pShell = ease(span(a, 0.2, 0.7))
    const pVisor = ease(span(a, 0.45, 0.82))
    const pParts = ease(span(a, 0.62, 1))
    // Exploding (scroll-bound through the world's rig), damped so a fast scroll never tears it.
    explode.current = nav.still ? rig.explode : damp(explode.current, rig.explode, 8, dt)
    const e = ease(explode.current)
    if (torso.current) torso.current.position.set(0, (1 - pTorso) * -3.2 + EXPLODE_TORSO.y * e, 0)
    if (collar.current) collar.current.position.set(0, (1 - pCollar) * -2.2 + EXPLODE_COLLAR.y * e, 0)
    if (shell.current) {
      shell.current.position.set(0, (1 - pShell) * 2.6 + EXPLODE_SHELL.y * e, 0)
      shell.current.rotation.x = (1 - pShell) * -0.7
    }
    if (visor.current) visor.current.position.z = (1 - pVisor) * 1.6
    parts.current.forEach((g, k) => {
      if (!g) return
      g.scale.setScalar(Math.max(0.0001, pParts))
      const base = PART_BASE[k]
      g.position.set(base.x + EXPLODE[k].x * e, base.y + EXPLODE[k].y * e, base.z + EXPLODE[k].z * e)
    })
    // The fins spread a little as they rise.
    ears.current.forEach((g, i) => g && g.position.setX((i ? 1 : -1) * (0.96 + 0.5 * e)))
    mats.visorMat.uniforms.uShow.value = ease(span(a, 0.7, 1))
    mats.visorMat.uniforms.uTime.value = t
    // Typing: while a line is being typed, the comms fins (the throat) pulse with it, and he nods as it begins.
    const since = nav.clock - nav.spokeAt
    const speaking = nav.still ? 0 : nav.clock < nav.typingUntil ? 1 : Math.max(0, 1 - (nav.clock - nav.typingUntil) / 0.6)
    const pulse = speaking * (0.5 + 0.5 * Math.sin(since * 9))
    // A blink every few seconds: the lamps dip for a tenth of a second. Alive, not flickering.
    const blinkPhase = (t + 2.3) % 6.4
    const blink = nav.still ? 0 : blinkPhase < 0.12 ? Math.sin((blinkPhase / 0.12) * Math.PI) : 0
    // The lights: all on; with a mission chosen, only the layers it takes stay bright.
    const m = nav.mission
    mats.lights.forEach((mat, k) => {
      const want = !m || m.layers.includes(LAYERS[k]) ? 1.6 : 0.22
      intensity.current[k] = nav.still ? want : damp(intensity.current[k], want, 4, dt)
      const v = intensity.current[k] + (k === 4 ? pulse * 1.4 : 0) - (k === 5 ? blink * 1.5 : 0)
      mat.emissiveIntensity = Math.max(0.05, v)
      mats.glows[k].opacity = 0.12 + 0.3 * Math.min(1, Math.max(0, v) / 1.6)
    })
    // The collar's ring turns, slowly, as a scanning ring does: his body is never quite still.
    if (!nav.still) mats.metal.map!.offset.x = (mats.metal.map!.offset.x + dt * 0.006) % 1
    // He turns to look toward the cursor, and floats; exploded, he faces straight on.
    const face = e
    const nod = speaking > 0 ? Math.sin(Math.min(1, since / 0.9) * Math.PI) * 0.07 : 0
    turn.current.x = damp(turn.current.x, state.pointer.x * 0.38 * (1 - face), 3, dt)
    turn.current.y = damp(turn.current.y, -state.pointer.y * 0.2 * (1 - face) + nod, 3, dt)
    const g = root.current
    if (g) {
      g.rotation.y = -0.18 * (1 - face) + turn.current.x
      g.rotation.x = turn.current.y
      rig.float = nav.still ? 0 : Math.sin(t * 0.6) * 0.04 * (1 - e)
      rig.group = g
      rig.parts = parts.current
    }
  })

  const glow = (k: number, size: number, pos: [number, number, number]) => (
    <sprite material={mats.glows[k]} position={pos} scale={[size, size, 1]} />
  )

  return (
    <group ref={root}>
      {/* The head: the shell, and the visor slid home as he assembles; a brass ring under the gasket. */}
      <group ref={shell}>
        <mesh material={mats.ceramic} scale={SHELL}>
          <sphereGeometry args={[1, 160, 120]} />
        </mesh>
        <group ref={visor}>
          <mesh material={mats.visorMat} scale={SHELL}>
            <sphereGeometry args={[1.012, 128, 96, V.phi0, V.phiLen, V.th0, V.thLen]} />
          </mesh>
          <mesh geometry={geo.gasket} material={mats.accent} />
        </group>
      </group>
      {/* The collar, and the neck in three rings. */}
      <group ref={collar}>
        <mesh geometry={geo.collar} material={mats.metal} position={[0, -1.02, 0]} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={i === 1 ? mats.plain : mats.graphite} position={[0, -1.3 - i * 0.07, 0]}>
            <cylinderGeometry args={[i === 1 ? 0.5 : 0.56, i === 1 ? 0.5 : 0.56, 0.06, 64]} />
          </mesh>
        ))}
      </group>
      {/* The torso: the body, the chest plate, the pauldrons, the arms at rest, the belt. */}
      <group ref={torso}>
        <mesh geometry={geo.torso} material={mats.plain} />
        <mesh geometry={geo.plate} material={mats.graphite} position={[0, -1.9, 0.78]} rotation={[-0.14, 0, 0]} />
        <mesh material={mats.brass} position={[0, -1.9, 0.78]} rotation={[-0.14, 0, 0]}>
          <torusGeometry args={[0.03, 0.01, 6, 12]} />
        </mesh>
        {[-1, 1].map((sgn) => (
          <group key={sgn}>
            {/* Pauldron: a ceramic cap on a graphite joint. */}
            <mesh material={mats.graphite} position={[sgn * 1.0, -1.56, 0]}>
              <sphereGeometry args={[0.3, 40, 32]} />
            </mesh>
            <mesh material={mats.plain} position={[sgn * 1.04, -1.5, 0]} rotation={[0, 0, sgn * -0.5]}>
              <sphereGeometry args={[0.34, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            </mesh>
            <mesh material={mats.brass} position={[sgn * 1.04, -1.5, 0]} rotation={[0, 0, sgn * -0.5]}>
              <torusGeometry args={[0.34, 0.012, 8, 64]} />
            </mesh>
            {/* The arm: upper arm, elbow, forearm, hand. */}
            <mesh material={mats.plain} position={[sgn * 1.17, -1.95, 0.02]} rotation={[0.05, 0, sgn * -0.22]}>
              <capsuleGeometry args={[0.14, 0.42, 8, 24]} />
            </mesh>
            <mesh material={mats.graphite} position={[sgn * 1.24, -2.25, 0.04]}>
              <sphereGeometry args={[0.16, 32, 24]} />
            </mesh>
            <mesh material={mats.plain} position={[sgn * 1.24, -2.55, 0.14]} rotation={[-0.32, 0, 0]}>
              <capsuleGeometry args={[0.13, 0.4, 8, 24]} />
            </mesh>
            <mesh material={mats.graphite} position={[sgn * 1.24, -2.86, 0.24]} scale={[1, 1.15, 0.8]}>
              <sphereGeometry args={[0.17, 32, 24]} />
            </mesh>
            {/* The power tanks, on the back. */}
            <mesh material={mats.graphite} position={[sgn * 0.5, -1.9, -0.92]}>
              <cylinderGeometry args={[0.22, 0.22, 1.1, 40]} />
            </mesh>
            <mesh material={mats.plain} position={[sgn * 0.5, -1.35, -0.92]}>
              <sphereGeometry args={[0.22, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          </group>
        ))}
        {/* The belt the coolant ring sits in. */}
        <mesh material={mats.graphite} position={[0, -2.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.86, 0.055, 10, 128]} />
        </mesh>
      </group>
      {/* Root: the tanks' port rings, lit. */}
      <group ref={(el) => void (parts.current[0] = el)} scale={0.0001}>
        {[-1, 1].map((sgn) => (
          <group key={sgn} position={[sgn * 0.5, -0.5, 0]}>
            <mesh material={mats.lights[0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2, 0.02, 8, 48]} />
            </mesh>
            {glow(0, 0.5, [0, -0.02, 0])}
          </group>
        ))}
      </group>
      {/* Sacral: the coolant ring, in its belt. */}
      <group ref={(el) => void (parts.current[1] = el)} scale={0.0001}>
        <mesh material={mats.lights[1]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.88, 0.02, 10, 128]} />
        </mesh>
      </group>
      {/* Solar plexus: the control unit, set in the chest plate. */}
      <group ref={(el) => void (parts.current[2] = el)} scale={0.0001}>
        <group rotation={[-0.14, 0, 0]}>
          <mesh geometry={geo.unit} material={mats.dark} />
          {[-0.14, 0, 0.14].map((x, i) => (
            <mesh key={x} material={i === 1 ? mats.lights[2] : mats.graphite} position={[x, 0, 0.045]}>
              <circleGeometry args={[0.03, 20]} />
            </mesh>
          ))}
          {glow(2, 0.3, [0, 0, 0.08])}
        </group>
      </group>
      {/* Heart: the core window, brass-rimmed. */}
      <group ref={(el) => void (parts.current[3] = el)} scale={0.0001}>
        <group rotation={[-0.14, 0, 0]}>
          <mesh material={mats.brass}>
            <torusGeometry args={[0.21, 0.03, 12, 64]} />
          </mesh>
          <mesh material={mats.dark} position={[0, 0, -0.01]}>
            <circleGeometry args={[0.2, 48]} />
          </mesh>
          <mesh material={mats.lights[3]}>
            <circleGeometry args={[0.11, 48]} />
          </mesh>
          {glow(3, 0.7, [0, 0, 0.06])}
        </group>
      </group>
      {/* Throat: the comms fins, swept back like an elf's ears, a graphite inner face, lit at the tips. */}
      <group ref={(el) => void (parts.current[4] = el)} scale={0.0001}>
        {[-1, 1].map((sgn, i) => (
          <group key={sgn} ref={(el) => void (ears.current[i] = el)} position={[sgn * 0.96, 0, 0]} rotation={[-0.12, sgn * 0.2, sgn * -0.98]}>
            <mesh geometry={geo.fin} material={mats.plain} />
            <mesh geometry={geo.finInner} material={mats.graphite} position={[sgn * -0.02, 0.06, 0.035]} />
            <mesh material={mats.brass} position={[0, 0.02, 0]}>
              <torusGeometry args={[0.2, 0.014, 8, 48]} />
            </mesh>
            <mesh material={mats.lights[4]} position={[0, 1.17, -0.41]}>
              <sphereGeometry args={[0.045, 20, 20]} />
            </mesh>
            {glow(4, 0.42, [0, 1.17, -0.41])}
          </group>
        ))}
      </group>
      {/* Third eye: the lamps above the visor, brass-rimmed. */}
      <group ref={(el) => void (parts.current[5] = el)} scale={0.0001}>
        {[-1, 1].map((sgn) => (
          <group key={sgn} position={[sgn * 0.66, 0, 0.62]} rotation={[0.35, sgn * 0.55, 0]}>
            <mesh material={mats.plain} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.085, 0.13, 40]} />
            </mesh>
            <mesh material={mats.brass} position={[0, 0, 0.066]}>
              <ringGeometry args={[0.052, 0.07, 40]} />
            </mesh>
            <mesh material={mats.lights[5]} position={[0, 0, 0.067]}>
              <circleGeometry args={[0.052, 40]} />
            </mesh>
            {glow(5, 0.34, [0, 0, 0.12])}
          </group>
        ))}
      </group>
      {/* Crown: the antenna, on a brass base. */}
      <group ref={(el) => void (parts.current[6] = el)} scale={0.0001}>
        <group rotation={[-0.25, 0, 0.42]}>
          <mesh material={mats.brass}>
            <cylinderGeometry args={[0.05, 0.08, 0.1, 24]} />
          </mesh>
          <mesh material={mats.graphite} position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.01, 0.016, 0.62, 12]} />
          </mesh>
          <mesh material={mats.lights[6]} position={[0, 0.67, 0]}>
            <sphereGeometry args={[0.036, 24, 24]} />
          </mesh>
          {glow(6, 0.34, [0, 0.67, 0])}
        </group>
      </group>
      {/* The blueprint, seen only through the X-ray lens. */}
      <lineSegments geometry={geo.lines} material={mats.ink} renderOrder={2} />
    </group>
  )
}

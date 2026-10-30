import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  MeshPhysicalMaterial,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { lens, withLens } from './lens'
import { visorFragment, visorVertex } from './visor'
import { CHAKRAS, yantra } from './yantra'

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
  // Walk the rounded rectangle by angle from its centre, pushing each ray to the boundary.
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

/** The collar's band: the seven yantras engraved between lines of guilloché, on brushed metal. */
function collarTexture() {
  const W = 2048
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#cfccc5')
  grad.addColorStop(0.5, '#e7e4de')
  grad.addColorStop(1, '#c4c1ba')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // Brushed grain.
  for (let i = 0; i < 1400; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.02})`
    g.beginPath()
    const y = Math.random() * H
    g.moveTo(0, y)
    g.lineTo(W, y + (Math.random() - 0.5) * 2)
    g.stroke()
  }
  const band = { top: H * 0.3, bottom: H * 0.7 }
  g.strokeStyle = 'rgba(20,20,26,0.55)'
  g.lineWidth = 2
  // Guilloché: interlaced waves along the band.
  for (let w = 0; w < 9; w++) {
    g.beginPath()
    for (let x = 0; x <= W; x += 4) {
      const y = (band.top + band.bottom) / 2 + Math.sin((x / W) * Math.PI * 2 * 21 + w * 0.7) * (band.bottom - band.top) * 0.42 * (0.4 + 0.6 * Math.abs(Math.sin(w + 1)))
      if (x === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.globalAlpha = 0.18
    g.stroke()
  }
  g.globalAlpha = 1
  g.lineWidth = 3
  g.strokeStyle = 'rgba(20,20,26,0.75)'
  g.beginPath()
  g.moveTo(0, band.top)
  g.lineTo(W, band.top)
  g.moveTo(0, band.bottom)
  g.lineTo(W, band.bottom)
  g.stroke()
  // The seven medallions, each its chakra's yantra, round the collar.
  const R = (band.bottom - band.top) * 0.62
  for (let k = 0; k < 7; k++) {
    const cx = ((k + 0.5) / 7) * W
    const cy = (band.top + band.bottom) / 2
    g.fillStyle = '#ebe8e2'
    g.beginPath()
    g.arc(cx, cy, R * 1.12, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(20,20,26,0.85)'
    g.lineWidth = 2.2
    for (const line of yantra(k)) {
      g.beginPath()
      line.forEach(([x, y], i) => (i ? g.lineTo(cx + x * R, cy - y * R) : g.moveTo(cx + x * R, cy - y * R)))
      g.stroke()
    }
    g.fillStyle = CHAKRAS[k].color
    g.beginPath()
    g.arc(cx, cy, R * 0.09, 0, Math.PI * 2)
    g.fill()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = RepeatWrapping
  t.anisotropy = 8
  return t
}

const COLLAR = [
  [0.6, 0.18],
  [0.8, 0.15],
  [0.885, 0.06],
  [0.9, -0.05],
  [0.875, -0.16],
  [0.78, -0.23],
  [0.6, -0.24],
].map(([r, y]) => new Vector2(r, y))

/** How far (px) each callout's label sits above (−) or below (+) its point, so neighbours never overlap. */
export const LABEL_DY = [34, 6, -26, 0, 0, 0, 0]

/** Where each subsystem sits on the helmet (local coordinates): its light, and its blueprint callout. */
export const SUBSYSTEMS: Vector3[] = [
  new Vector3(-0.66, -1.06, -0.52), // root: life-support port
  new Vector3(0.84, -1.0, 0.32), // sacral: cooling loop
  new Vector3(0, -0.98, 0.9), // solar plexus: chest control unit
  new Vector3(0, 0.12, 1.06), // heart: the visor
  new Vector3(1.04, -0.02, 0), // throat: comms module
  new Vector3(-0.66, 0.6, 0.66), // third eye: visor lamps
  new Vector3(-0.42, 1.62, -0.28), // crown: antenna tip
]

function blueprint(outline: Vector3[]) {
  const seg: number[] = []
  const line = (pts: Vector3[], closed = false) => {
    for (let i = 0; i < pts.length - 1 + (closed ? 1 : 0); i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      seg.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }
  // The shell, as a draughtsman would: its outline, the equator, a few sections.
  for (let lat = -45; lat <= 60; lat += 35) {
    const y = Math.sin((lat * Math.PI) / 180)
    const r = Math.cos((lat * Math.PI) / 180)
    line(Array.from({ length: 97 }, (_, i) => new Vector3(Math.cos((i / 96) * Math.PI * 2) * r, y, Math.sin((i / 96) * Math.PI * 2) * r).multiply(SHELL)))
  }
  for (let lon = 0; lon < 180; lon += 45) {
    const a = (lon * Math.PI) / 180
    line(Array.from({ length: 97 }, (_, i) => {
      const t = -Math.PI / 2 + (i / 96) * Math.PI * 1.35
      return new Vector3(Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)).multiply(SHELL)
    }))
  }
  line(outline, true)
  // The collar's rings (its outer edges only).
  for (const p of [COLLAR[1], COLLAR[3], COLLAR[5]]) line(Array.from({ length: 97 }, (_, i) => new Vector3(Math.cos((i / 96) * Math.PI * 2) * p.x, -1.02 + p.y, Math.sin((i / 96) * Math.PI * 2) * p.x)))
  // Centre lines, the way a drawing marks its axes.
  line([new Vector3(0, -1.6, 0), new Vector3(0, 1.85, 0)])
  line([new Vector3(-1.4, 0, 0), new Vector3(1.4, 0, 0)])
  // A dimension line beside it, with its ticks.
  line([new Vector3(1.5, -1.26, 0), new Vector3(1.5, 1.06, 0)])
  for (const y of [-1.26, 1.06]) line([new Vector3(1.42, y, 0), new Vector3(1.58, y, 0)])
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(seg, 3))
  return geo
}

/**
 * The Navigator's helmet: a ceramic shell, the visor holding the black hole's reflection, a
 * collar engraved with the seven yantras, and seven subsystems, each lit in its chakra's colour.
 * It assembles as the page opens, turns to follow the cursor, and under the X-ray lens shows its
 * blueprint. `rig.group` is its turning group, for whatever follows it (the callouts, the field).
 */
export function Helmet({ x = 1.15, y = 0.08, rig }: { x?: number; y?: number; rig: { group: Group | null } }) {
  const root = useRef<Group>(null)
  const shell = useRef<Group>(null)
  const visor = useRef<Group>(null)
  const collar = useRef<Group>(null)
  const parts = useRef<Group>(null)
  const turn = useRef({ x: 0, y: 0 })

  const outline = useMemo(() => visorOutline(1.018), [])
  const gasket = useMemo(() => new TubeGeometry(new CatmullRomCurve3(outline, true), 240, 0.028, 12, true), [outline])
  const lines = useMemo(() => blueprint(visorOutline(1.0)), [])
  const collarGeo = useMemo(() => new LatheGeometry(COLLAR, 160), [])
  const mats = useMemo(() => {
    const ceramic = withLens(new MeshPhysicalMaterial({ color: '#f3f1ec', roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.3, sheenColor: new Color('#ffffff') }), 'outside')
    const metal = withLens(new MeshPhysicalMaterial({ map: collarTexture(), metalness: 0.85, roughness: 0.3, clearcoat: 0.6 }), 'outside')
    const graphite = withLens(new MeshPhysicalMaterial({ color: '#2a2b31', metalness: 0.55, roughness: 0.38, clearcoat: 0.8 }), 'outside')
    const accent = withLens(new MeshPhysicalMaterial({ color: '#ff5a1f', roughness: 0.3, clearcoat: 1, emissive: new Color('#ff5a1f'), emissiveIntensity: 0.15 }), 'outside')
    const dark = withLens(new MeshPhysicalMaterial({ color: '#0b0b10', roughness: 0.6 }), 'outside')
    const lights = CHAKRAS.map((c) => withLens(new MeshPhysicalMaterial({ color: c.color, emissive: new Color(c.color), emissiveIntensity: 1.6, roughness: 0.2 }), 'outside'))
    const visorMat = new ShaderMaterial({ vertexShader: visorVertex, fragmentShader: visorFragment, uniforms: { uLens: lens, uTime: { value: 0 }, uHole: { value: new Vector3(-0.32, 0.22, 1) }, uShow: { value: 0 } } })
    const ink = withLens(new LineBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: 0.85, depthTest: false }), 'inside')
    return { ceramic, metal, graphite, accent, dark, lights, visorMat, ink }
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    // Assembling: the shell lowers into place, the collar rises, the visor slides home, the systems light.
    const a = span(t, 0.3, 2.9)
    const pShell = ease(span(a, 0, 0.55))
    const pCollar = ease(span(a, 0.12, 0.6))
    const pVisor = ease(span(a, 0.38, 0.78))
    const pParts = ease(span(a, 0.6, 1))
    if (shell.current) {
      shell.current.position.y = (1 - pShell) * 2.6
      shell.current.rotation.x = (1 - pShell) * -0.7
    }
    if (collar.current) collar.current.position.y = (1 - pCollar) * -2.2
    if (visor.current) visor.current.position.z = (1 - pVisor) * 1.6
    if (parts.current) parts.current.scale.setScalar(Math.max(0.0001, pParts))
    mats.visorMat.uniforms.uShow.value = ease(span(a, 0.65, 1))
    mats.visorMat.uniforms.uTime.value = t
    // It turns to look toward the cursor, and floats.
    turn.current.x = damp(turn.current.x, state.pointer.x * 0.38, 3, dt)
    turn.current.y = damp(turn.current.y, -state.pointer.y * 0.2, 3, dt)
    const g = root.current
    if (g) {
      g.rotation.y = -0.18 + turn.current.x
      g.rotation.x = turn.current.y
      g.position.y = Math.sin(t * 0.6) * 0.04
      rig.group = g
    }
  })

  return (
    <group position={[x, y, 0]}>
      <group ref={root}>
        <group ref={shell}>
          <mesh material={mats.ceramic} scale={SHELL}>
            <sphereGeometry args={[1, 160, 120]} />
          </mesh>
          <group ref={visor}>
            <mesh material={mats.visorMat} scale={SHELL}>
              <sphereGeometry args={[1.012, 128, 96, V.phi0, V.phiLen, V.th0, V.thLen]} />
            </mesh>
            <mesh geometry={gasket} material={mats.accent} />
          </group>
        </group>
        <group ref={collar}>
          <mesh geometry={collarGeo} material={mats.metal} position={[0, -1.02, 0]} />
          <mesh material={mats.dark} position={[0, -1.2, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.12, 64, 1, true]} />
          </mesh>
        </group>
        <group ref={parts}>
          {/* Throat: the comms modules, one each side. */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.985, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh material={mats.graphite}>
                <cylinderGeometry args={[0.24, 0.25, 0.05, 64]} />
              </mesh>
              <mesh material={mats.ceramic} position={[0, s * 0.03, 0]}>
                <cylinderGeometry args={[0.19, 0.2, 0.03, 64]} />
              </mesh>
              <mesh material={mats.lights[4]} position={[0, s * 0.047, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.215, 0.008, 8, 64]} />
              </mesh>
            </group>
          ))}
          {/* Third eye: the visor lamps. */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.66, 0.6, 0.62]} rotation={[0.35, s * 0.55, 0]}>
              <mesh material={mats.ceramic} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.07, 0.085, 0.13, 40]} />
              </mesh>
              <mesh material={mats.graphite} position={[0, 0, 0.066]}>
                <ringGeometry args={[0.052, 0.07, 40]} />
              </mesh>
              <mesh material={mats.lights[5]} position={[0, 0, 0.067]}>
                <circleGeometry args={[0.052, 40]} />
              </mesh>
            </group>
          ))}
          {/* Crown: the antenna. */}
          <group position={[-0.42, 0.95, -0.27]} rotation={[-0.25, 0, 0.42]}>
            <mesh material={mats.graphite}>
              <cylinderGeometry args={[0.06, 0.08, 0.1, 24]} />
            </mesh>
            <mesh material={mats.graphite} position={[0, 0.34, 0]}>
              <cylinderGeometry args={[0.012, 0.016, 0.62, 12]} />
            </mesh>
            <mesh material={mats.lights[6]} position={[0, 0.67, 0]}>
              <sphereGeometry args={[0.036, 24, 24]} />
            </mesh>
          </group>
          {/* Solar plexus: the chest control unit on the collar's front. */}
          <group position={[0, -0.99, 0.88]} rotation={[-0.2, 0, 0]}>
            <mesh material={mats.graphite}>
              <boxGeometry args={[0.36, 0.13, 0.08]} />
            </mesh>
            {[-0.1, 0, 0.1].map((x, i) => (
              <mesh key={x} material={i === 1 ? mats.lights[2] : mats.dark} position={[x, 0, 0.045]}>
                <circleGeometry args={[0.022, 20]} />
              </mesh>
            ))}
          </group>
          {/* Sacral: the cooling loop along the collar. */}
          <mesh material={mats.lights[1]}>
            <tubeGeometry args={[new CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => { const a = -0.35 + (i / 23) * 1.6; return new Vector3(Math.sin(a) * 0.905, -0.99, Math.cos(a) * 0.905) })), 96, 0.018, 10, false]} />
          </mesh>
          {/* Root: the life-support port at the back. */}
          <group position={[-0.66, -1.06, -0.55]} rotation={[0, -0.85, Math.PI / 2]}>
            <mesh material={mats.graphite}>
              <cylinderGeometry args={[0.11, 0.11, 0.12, 32]} />
            </mesh>
            <mesh material={mats.lights[0]} position={[0, 0.065, 0]}>
              <torusGeometry args={[0.08, 0.014, 8, 40]} />
            </mesh>
          </group>
        </group>
        {/* The blueprint, seen only through the X-ray lens. */}
        <lineSegments geometry={lines} material={mats.ink} renderOrder={2} />
      </group>
    </group>
  )
}

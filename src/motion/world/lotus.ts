import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { seeded } from './sky'

/**
 * One centre of the column: a lotus of real petals around a glowing gem, standing on a
 * base plate that carries an instrument dial and the centre's seed geometry (yantra).
 * Petal counts are the traditional ones; the crown's thousand petals are three rings,
 * 24 + 36 + 48 = 108. The petals' opening is data: a bud is closed, open is flowing.
 */

/** Accretion-disk temperatures, root (cool, red) to crown (hot, blue-white). Linear RGB. */
export const CENTRE_COLORS = [
  [1.0, 0.23, 0.12],
  [1.0, 0.42, 0.13],
  [1.0, 0.62, 0.2],
  [1.0, 0.8, 0.5],
  [0.84, 0.89, 1.0],
  [0.62, 0.74, 1.0],
  [0.56, 0.66, 1.0],
] as const

interface Ring {
  n: number
  /** Distance of the petal bases from the centre, length and half-width (lotus units). */
  base: number
  len: number
  width: number
  /** Extra closing for inner rings. */
  tilt: number
}

const ringsOf = (k: number): Ring[] => {
  if (k === 6)
    return [
      { n: 24, base: 0.11, len: 0.8, width: 0.0625, tilt: -0.15 },
      { n: 36, base: 0.09, len: 0.66, width: 0.042, tilt: 0.07 },
      { n: 48, base: 0.07, len: 0.52, width: 0.031, tilt: 0.29 },
    ]
  if (k === 5) return [{ n: 2, base: 0.08, len: 0.86, width: 0.3, tilt: 0.1 }]
  const n = [4, 6, 10, 12, 16][k]
  return [{ n, base: 0.11, len: 0.72, width: Math.min(0.14, Math.max(0.03, 1.5 / n)), tilt: 0 }]
}

/** A cupped, pointed petal: base at the origin, pointing along +x, cupped toward +y. */
function petalGeometry(len: number, width: number): BufferGeometry {
  const U = 20
  const V = 10
  const pos: number[] = []
  const uv: number[] = []
  for (let i = 0; i <= U; i++) {
    const u = i / U
    const w = width * Math.pow(Math.sin(Math.PI * u), 0.72) * (1 - 0.2 * u)
    for (let j = 0; j <= V; j++) {
      const v = (j / V) * 2 - 1
      const x = u * len
      const z = v * w
      const y = 0.9 * v * v * w * 0.55 + 0.16 * len * u * u
      pos.push(x, y, z)
      uv.push(u, j / V)
    }
  }
  const index: number[] = []
  for (let i = 0; i < U; i++)
    for (let j = 0; j < V; j++) {
      const a = i * (V + 1) + j
      const b = a + V + 1
      index.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

const petalVertex = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 w = m * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(m) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const petalFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uLit;
uniform float uBoost;
uniform vec3 uGem;
uniform float uFade;
uniform float uScale;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(n, v)), 3.0);
  vec3 toGem = uGem - vWorld;
  float dg = length(toGem) / uScale;
  toGem /= max(length(toGem), 1e-4);
  // Translucent petals: lit from the gem inside, brightest near their base.
  float sss = pow(clamp(dot(-n, toGem) * 0.5 + 0.5, 0.0, 1.0), 2.0) * exp(-dg * 2.6);
  float lit = mix(0.22, 1.0, uLit) * (1.0 + 1.3 * uBoost);
  float across = abs(vUv.y - 0.5) * 2.0;
  float vein = exp(-across * across * 400.0) * 0.5 + pow(abs(sin(across * 9.0)), 30.0) * 0.12;
  float base = exp(-vUv.x * 2.5);
  vec3 col = uColor * (0.04 + 2.1 * sss + 0.3 * base) * lit + uColor * fres * 1.15 * mix(0.45, 1.0, uLit);
  col += uColor * vein * lit * 0.6 * (1.0 - vUv.x);
  col += vec3(1.0, 0.97, 0.94) * pow(max(dot(n, normalize(normalize(vec3(0.4, 0.9, 0.5)) + v)), 0.0), 80.0) * 0.3;
  gl_FragColor = vec4(col * uFade, 1.0);
}`

const gemFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uLit;
uniform float uFade;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float f = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
  vec3 col = mix(uColor, vec3(1.0), 0.5 + 0.5 * f * f) * (1.4 + 2.4 * pow(f, 4.0)) * mix(0.3, 1.6, uLit);
  gl_FragColor = vec4(col * uFade, 1.0);
}`

const gemVertex = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`

/* ---------- the base plate: ribbons of light on the plane under the petals ---------- */

type Path = [number, number][]

/** A flat ribbon along a polyline in the xz plane. */
function ribbon(paths: Path[], width: number, closed: boolean): BufferGeometry {
  const pos: number[] = []
  const index: number[] = []
  for (const path of paths) {
    const start = pos.length / 3
    const n = path.length
    for (let i = 0; i < n; i++) {
      const prev = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
      const next = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
      const dx = next[0] - prev[0]
      const dz = next[1] - prev[1]
      const l = Math.hypot(dx, dz) || 1
      const nx = (-dz / l) * width * 0.5
      const nz = (dx / l) * width * 0.5
      pos.push(path[i][0] + nx, 0, path[i][1] + nz, path[i][0] - nx, 0, path[i][1] - nz)
    }
    const segs = closed ? n : n - 1
    for (let i = 0; i < segs; i++) {
      const a = start + i * 2
      const b = start + ((i + 1) % n) * 2
      index.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(index)
  return g
}

const circle = (r: number, cx = 0, cz = 0, n = 128): Path => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r])
const polygon = (r: number, sides: number, rot: number): Path => Array.from({ length: sides }, (_, i) => [Math.cos(rot + (i / sides) * Math.PI * 2) * r, Math.sin(rot + (i / sides) * Math.PI * 2) * r])

/** The seed geometry of each centre, in lotus units. */
function yantra(k: number): { closed: Path[]; open: Path[] } {
  switch (k) {
    case 0: // root: a square, the ground
      return { closed: [polygon(0.43 * Math.SQRT2, 4, Math.PI / 4)], open: [] }
    case 1: {
      // sacral: a crescent, flow
      const outer = Array.from({ length: 97 }, (_, i) => {
        const a = Math.PI * 1.18 + (i / 96) * Math.PI * 0.64 * 2.2
        return [Math.cos(a) * 0.47, Math.sin(a) * 0.47] as [number, number]
      })
      return { closed: [], open: [outer] }
    }
    case 2: // solar plexus: a downward triangle, fire
      return { closed: [polygon(0.54, 3, Math.PI / 2)], open: [] }
    case 3: // heart: two interlocking rings, the product and the people who use it
      return { closed: [circle(0.36, 0.18), circle(0.36, -0.18)], open: [] }
    case 4: // throat: a circle in a circle, voice
      return { closed: [circle(0.47), circle(0.25)], open: [] }
    case 5: // third eye: a triangle in a circle, vision
      return { closed: [circle(0.5), polygon(0.4, 3, Math.PI / 2)], open: [] }
    default: // crown: its petals are the symbol
      return { closed: [], open: [] }
  }
}

function dialTicks(): Path[] {
  const out: Path[] = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const len = i % 4 === 0 ? 0.045 : 0.02
    out.push([
      [Math.cos(a) * 0.74, Math.sin(a) * 0.74],
      [Math.cos(a) * (0.74 + len), Math.sin(a) * (0.74 + len)],
    ])
  }
  return out
}

const plateMaterial = (color: Color, strength: number) =>
  new MeshBasicMaterial({ color: color.clone().multiplyScalar(strength), blending: AdditiveBlending, transparent: true, depthWrite: false, side: DoubleSide })

export interface Lotus {
  group: Group
  /** Petal opening 0 … 1, light 0 … 1, extra light, presence 0 … 1, the visitor's ring 0 … 1. */
  update(open: number, lit: number, boost: number, fade: number, focus: number, time: number): void
  dispose(): void
}

export function createLotus(k: number, scale: number): Lotus {
  const color = new Color().setRGB(CENTRE_COLORS[k][0], CENTRE_COLORS[k][1], CENTRE_COLORS[k][2])
  const group = new Group()
  const spin = new Group()
  group.add(spin)
  group.scale.setScalar(scale)
  const rand = seeded(101 + k)

  const gemWorld = new Vector3()
  const petalMaterial = new ShaderMaterial({
    vertexShader: petalVertex,
    fragmentShader: petalFragment,
    uniforms: { uColor: { value: color }, uLit: { value: 1 }, uBoost: { value: 0 }, uGem: { value: gemWorld }, uFade: { value: 1 }, uScale: { value: scale } },
    side: DoubleSide,
  })
  const rings = ringsOf(k).map((ring) => {
    const geometry = petalGeometry(ring.len, ring.width)
    const mesh = new InstancedMesh(geometry, petalMaterial, ring.n)
    mesh.frustumCulled = false
    // Small differences per petal, so the flower reads as grown, not stamped.
    const jitter = Array.from({ length: ring.n }, () => [(rand() - 0.5) * 0.1, 1 + (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.06])
    spin.add(mesh)
    return { ring, mesh, geometry, jitter }
  })

  const gemGeometry = new SphereGeometry(0.045, 24, 16)
  const gemMaterial = new ShaderMaterial({ vertexShader: gemVertex, fragmentShader: gemFragment, uniforms: { uColor: { value: color }, uLit: { value: 1 }, uFade: { value: 1 } } })
  const gem = new Mesh(gemGeometry, gemMaterial)
  gem.position.y = 0.1
  group.add(gem)

  // The plate sits just under the petals and turns with them.
  const plate = new Group()
  plate.position.y = -0.017
  spin.add(plate)
  const dialMaterial = plateMaterial(color, 0.9)
  const seedMaterial = plateMaterial(color, 1.3)
  const focusMaterial = plateMaterial(new Color(1, 1, 1).lerp(color, 0.6), 2.2)
  const seed = yantra(k)
  const plateGeometries = [
    ribbon([circle(0.7)], 0.008, true),
    ribbon(dialTicks(), 0.006, false),
    ribbon(seed.closed, 0.009, true),
    ribbon(seed.open, 0.009, false),
    ribbon([circle(0.9, 0, 0, 160)], 0.012, true),
  ]
  const plateMeshes = [
    new Mesh(plateGeometries[0], dialMaterial),
    new Mesh(plateGeometries[1], dialMaterial),
    new Mesh(plateGeometries[2], seedMaterial),
    new Mesh(plateGeometries[3], seedMaterial),
  ]
  plateMeshes.forEach((m) => plate.add(m))
  const focusRing = new Mesh(plateGeometries[4], focusMaterial)
  focusRing.position.y = -0.017
  group.add(focusRing)

  const dialBase = dialMaterial.color.clone()
  const seedBase = seedMaterial.color.clone()
  const focusBase = focusMaterial.color.clone()
  const m = new Matrix4()
  const q = new Quaternion()
  const qy = new Quaternion()
  const qz = new Quaternion()
  const yAxis = new Vector3(0, 1, 0)
  const zAxis = new Vector3(0, 0, 1)
  const p = new Vector3()
  const s = new Vector3(1, 1, 1)
  let lastOpen = -1

  const layout = (open: number) => {
    const tiltOpen = 1.3 + (0.3 - 1.3) * open
    for (const { ring, mesh, jitter } of rings) {
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * Math.PI * 2 + (ring.tilt > 0 ? Math.PI / ring.n : 0)
        qy.setFromAxisAngle(yAxis, -a)
        qz.setFromAxisAngle(zAxis, tiltOpen + ring.tilt + jitter[i][0])
        q.copy(qy).multiply(qz)
        p.set(Math.cos(a) * ring.base, 0, Math.sin(a) * ring.base)
        s.set(jitter[i][1], 1, 1 + jitter[i][2])
        m.compose(p, q, s)
        mesh.setMatrixAt(i, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  return {
    group,
    update(open, lit, boost, fade, focus, time) {
      if (Math.abs(open - lastOpen) > 1e-3) {
        layout(open)
        lastOpen = open
      }
      spin.rotation.y = time * 0.15 * (k % 2 === 0 ? 1 : -1)
      gem.getWorldPosition(gemWorld)
      const u = petalMaterial.uniforms
      u.uLit.value = lit
      u.uBoost.value = boost
      u.uFade.value = fade
      gemMaterial.uniforms.uLit.value = lit
      gemMaterial.uniforms.uFade.value = fade
      const plateLight = (0.35 + 0.65 * lit) * (1 + boost) * fade
      dialMaterial.color.copy(dialBase).multiplyScalar(plateLight)
      seedMaterial.color.copy(seedBase).multiplyScalar(plateLight)
      focusRing.visible = focus > 0.01
      focusMaterial.color.copy(focusBase).multiplyScalar(focus * (0.75 + 0.25 * Math.sin(time * 2.2)) * fade)
    },
    dispose() {
      rings.forEach((r) => r.geometry.dispose())
      petalMaterial.dispose()
      gemGeometry.dispose()
      gemMaterial.dispose()
      plateGeometries.forEach((g) => g.dispose())
      dialMaterial.dispose()
      seedMaterial.dispose()
      focusMaterial.dispose()
    },
  }
}

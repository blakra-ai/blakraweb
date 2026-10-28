import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, InstancedBufferAttribute, Vector3, type InstancedMesh, type ShaderMaterial } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { chakras } from '../tokens'
import { film, LAYERS } from '../state'
import { AXIS, DISK_TILT } from '../space'
import { beats, centreY, damp } from '../timeline'
import { pointer } from '../controllers/pointer'

const R_IN = 1.4
const R_OUT = 3.6

/**
 * The scattered pieces of an organization (Act I) that gravity pulls into orbit (Act II), where
 * each takes its layer's colour and the disk forms in seven bands; in Act IV a share of each band
 * rises up the axis to its centre. Every path is computed on the GPU from the film's clock, so a
 * frame costs a few uniforms, whatever the count.
 */
export function Fragments({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null)
  const mat = useRef<ShaderMaterial>(null)
  const { viewport } = useThree()
  const push = useRef({ x: 0, y: 0 })

  const geometry = useMemo(() => {
    const g = new RoundedBoxGeometry(1, 0.64, 0.05, 2, 0.08)
    const rnd = mulberry(7)
    const scatter = new Float32Array(count * 3)
    const orbit = new Float32Array(count * 3)
    const meta = new Float32Array(count * 4)
    const size = new Float32Array(count * 2)
    const spin = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      const band = i % 7
      const sr = 5 + rnd() * 13
      const r = R_IN + ((band + rnd() * 0.92) / 7) * (R_OUT - R_IN)
      scatter.set([sr, rnd() * Math.PI * 2, (rnd() - 0.5) * 12], i * 3)
      orbit.set([r, rnd() * Math.PI * 2, 0.55 * Math.pow(R_IN / r, 1.5)], i * 3)
      // Layer, arrival delay (farther pieces arrive later), whether it rises in Act IV, its grey.
      meta.set([band, (sr - 5) / 13, rnd() < 0.34 ? 1 : 0, 0.5 + rnd() * 0.3], i * 4)
      // Pieces of different kinds: cards, bars, bubbles, windows.
      size.set([0.22 + rnd() * 0.38, 0.14 + rnd() * 0.22], i * 2)
      spin.set([(rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.8, rnd() * Math.PI * 2], i * 4)
    }
    g.setAttribute('aScatter', new InstancedBufferAttribute(scatter, 3))
    g.setAttribute('aOrbit', new InstancedBufferAttribute(orbit, 3))
    g.setAttribute('aMeta', new InstancedBufferAttribute(meta, 4))
    g.setAttribute('aSize', new InstancedBufferAttribute(size, 2))
    g.setAttribute('aSpin', new InstancedBufferAttribute(spin, 4))
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({
      uT: { value: 0 },
      uTime: { value: 0 },
      uPush: { value: [0, 0] },
      uInfall: { value: [beats.infall[0], beats.infall[1]] },
      uBuild: { value: beats.build[0] },
      uCentre: { value: [centreY(0), centreY(1) - centreY(0)] },
      uTilt: { value: [Math.cos(DISK_TILT), Math.sin(DISK_TILT)] },
      uAxis: { value: AXIS.clone() },
      uColors: { value: chakras.map((c) => new Color(c.color)) },
      uMine: { value: new Array(7).fill(0) },
      uLight: { value: new Vector3(0.45, 0.8, 0.55).normalize() },
    }),
    [],
  )

  useFrame((_, dt) => {
    const u = mat.current?.uniforms
    if (!u) return
    u.uT.value = film.t
    if (!film.still) u.uTime.value = film.clock
    // The cursor as a soft mass in Act I, on the plane of the centre.
    push.current.x = damp(push.current.x, pointer.x * viewport.width * 0.5, 4, dt)
    push.current.y = damp(push.current.y, pointer.y * viewport.height * 0.5, 4, dt)
    u.uPush.value = [push.current.x, push.current.y]
    // The visitor's layers brighten over a second and a half after the choice.
    const need = film.need
    const ramp = need ? Math.min(1, (film.clock - need.at) / 1.5) : 0
    for (let k = 0; k < 7; k++) u.uMine.value[k] = need && need.layers.includes(LAYERS[k]) ? ramp : 0
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} />
    </instancedMesh>
  )
}

const vertex = /* glsl */ `
attribute vec3 aScatter;
attribute vec3 aOrbit;
attribute vec4 aMeta;
attribute vec2 aSize;
attribute vec4 aSpin;
uniform float uT;
uniform float uTime;
uniform vec2 uPush;
uniform vec2 uInfall;
uniform float uBuild;
uniform vec2 uCentre;
uniform vec2 uTilt;
uniform vec3 uAxis;
uniform vec3 uColors[7];
uniform float uMine[7];
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vView;

float ease(float x) { return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0, -s, c, 0, 0, 0, 1); }

void main() {
  int band = int(aMeta.x + 0.5);
  float delay = aMeta.y;
  // Falling: farther pieces start later; the radius closes slowly, then fast; the angle winds on.
  float a0 = uInfall.x - 0.01 + delay * 0.05;
  float a1 = uInfall.y - 0.02 + delay * 0.05;
  float f = ease(clamp((uT - a0) / (a1 - a0), 0.0, 1.0));
  float th = aOrbit.y + uTime * aOrbit.z;
  float rr = aScatter.x + (aOrbit.x - aScatter.x) * pow(f * f * f, 0.6);
  float phi = aScatter.y * (1.0 - f) + th * f + f * (1.0 - f) * 5.0;
  float drift = (1.0 - f) * 0.35;
  vec3 l = vec3(rr * cos(phi) + sin(uTime * 0.13 + aSpin.w) * drift, rr * sin(phi) + cos(uTime * 0.11 + aSpin.w) * drift, aScatter.z * (1.0 - f) * (1.0 - f));
  vec3 p = vec3(l.x, l.y * uTilt.x - l.z * uTilt.y, l.y * uTilt.y + l.z * uTilt.x);
  // Act I: the cursor pushes the loose pieces aside.
  vec2 d = p.xy - uPush;
  float dd = max(0.2, length(d));
  p.xy += d / dd * (1.0 - f) * max(0.0, 2.6 - dd) * 0.5;
  // Act IV: a share of each band rises up the axis to its centre and is absorbed by it.
  float scale = 1.0;
  if (aMeta.z > 0.5) {
    float lk = uBuild + 0.012 + aMeta.x * 0.018;
    float g = ease(clamp((uT - lk) / 0.03, 0.0, 1.0));
    p = mix(p, uAxis * (uCentre.x + aMeta.x * uCentre.y), g);
    scale = 1.0 - g;
  }
  // Tumbling while loose; flat in the disk, smaller, once in orbit.
  float fit = (1.0 - 0.35 * f) * scale;
  mat3 R = rotX(aSpin.x * uTime * (1.0 - f) - 1.32 * f) * rotY(aSpin.y * uTime * (1.0 - f)) * rotZ(aSpin.z * uTime * (1.0 - f) + th * f);
  vec3 local = position * vec3(aSize.x * fit, aSize.y * fit, max(scale, 0.0001));
  vec4 world = modelMatrix * vec4(p + R * local, 1.0);
  vNormal = normalize(mat3(modelMatrix) * (R * normal));
  vView = normalize(cameraPosition - world.xyz);
  // Grey while loose; its layer's colour as it settles; lighter if the visitor's need takes it.
  vec3 col = mix(vec3(aMeta.w), uColors[band], f);
  vColor = mix(col, vec3(1.0), 0.2 * uMine[band] * step(0.9, f));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragment = /* glsl */ `
uniform vec3 uLight;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vView);
  // Glossy plastic: soft key light, sky fill, one sharp highlight and a thin rim.
  float diff = max(dot(n, uLight), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  float spec = pow(max(dot(n, normalize(uLight + v)), 0.0), 56.0) * 0.5;
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.22;
  gl_FragColor = vec4(vColor * (0.46 + 0.42 * diff + 0.16 * hemi) + spec + rim, 1.0);
  #include <colorspace_fragment>
}
`

/** A small seeded random, so the scatter is the same on every visit. */
function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

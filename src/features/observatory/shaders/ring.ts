import { DoubleSide, Mesh, NormalBlending, PlaneGeometry, ShaderMaterial } from 'three'

/*
 * The lensing ring: the one rendered object. A dark disk (the shadow, true black inside), a thin
 * porcelain edge, a soft gold accretion glow (#d9a441) just outside it and a wide faint halo, two
 * photon rings (sb.css .photon/.photon2) and a faint Einstein-ring crescent on the lower right,
 * as the storyboard's CSS draws it (sb.css .hole). No bloom pass: the glow is the shader's own
 * falloff. Units are window-local CSS px; the quad is sized from the ring's radius.
 *
 * Uniforms: uCentre, uR (px), uGlow (0 … 1: an event's pulse, never autoplay), uTime (s, the
 * crescent's slow drift only; a still frame passes a constant).
 */

export const ringVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const ringFragment = /* glsl */ `
precision highp float;
uniform vec2 uCentre;
uniform float uR;
uniform float uGlow;
uniform float uTime;
uniform float uExtent;
varying vec2 vUv;

const vec3 GOLD = vec3(0.8510, 0.6431, 0.2549);      // #d9a441
const vec3 WARM = vec3(1.0, 0.9255, 0.7843);          // rgba(255,236,200)
const vec3 PORCELAIN = vec3(0.9255, 0.9137, 0.8863);  // #ece9e2

void main() {
  // The quad spans uExtent × the radius each side of the centre.
  vec2 p = (vUv - 0.5) * 2.0 * uExtent * uR;
  float R = length(p);
  float d = R / uR;          // 1 at the edge
  float px = 1.0 / uR;       // one CSS px in d
  float ang = atan(p.y, p.x);

  vec3 col = vec3(0.0);
  float a = 0.0;

  // The disk: black, with an inset shadow that deepens toward the edge (inset 0 0 40px 12px).
  float disk = 1.0 - smoothstep(1.0 - px, 1.0 + px, d);
  col = mix(col, vec3(0.0), disk);
  a = max(a, disk);

  // The porcelain edge, 1.5 px at 92 %.
  float edge = exp(-pow((d - 1.0) / (1.6 * px), 2.0)) * 0.92;
  // The accretion glow: 18 px spread at 55 % (+ the pulse), 70 px at 14 %.
  float out1 = max(d - 1.0, 0.0);
  float glow = exp(-out1 / (18.0 * px)) * (0.55 + 0.45 * uGlow) * step(1.0, d);
  float halo = exp(-out1 / (70.0 * px)) * (0.14 + 0.1 * uGlow) * step(1.0, d);
  // The photon rings (inset −7 % → d 1.07 at 22 %, inset −16 % → d 1.16 at 8 %).
  float ph1 = exp(-pow((d - 1.07) / (0.9 * px), 2.0)) * 0.22;
  float ph2 = exp(-pow((d - 1.16) / (0.9 * px), 2.0)) * 0.08;
  // The Einstein crescent: a conic highlight over the upper-right rim (the sb.css conic from 150°), blurred, drifting slowly.
  float t = fract((ang + 0.61 - uTime * 0.02) / 6.2832 + 0.5);
  float arc = smoothstep(0.28, 0.42, t) * (1.0 - smoothstep(0.58, 0.72, t));
  float warmth = smoothstep(0.42, 0.5, t) * (1.0 - smoothstep(0.5, 0.58, t));
  float band = exp(-pow((d - 1.05) / (2.5 * px), 2.0));
  vec3 crescent = mix(GOLD * 0.55, WARM * 0.35, warmth) * arc * band;

  vec3 light = PORCELAIN * edge + GOLD * (glow + halo) + PORCELAIN * (ph1 + ph2) + crescent * (1.0 + 0.6 * uGlow);
  float la = clamp(edge + glow + halo + ph1 + ph2 + arc * band * 0.6, 0.0, 1.0);
  // Premultiplied: the disk covers the well in black; outside it the light adds over the well.
  col = light * (1.0 - disk);
  a = max(a, la * (1.0 - disk));
  gl_FragColor = vec4(col, a);
}
`

export interface RingUniforms extends Record<string, { value: unknown }> {
  uCentre: { value: [number, number] }
  uR: { value: number }
  uGlow: { value: number }
  uTime: { value: number }
  uExtent: { value: number }
}

/** How far the quad reaches, in radii (the halo's 70 px tail at r 150 is well inside 2). */
export const RING_EXTENT = 2.2

export function createRing(): { mesh: Mesh; uniforms: RingUniforms } {
  const uniforms: RingUniforms = { uCentre: { value: [0, 0] }, uR: { value: 150 }, uGlow: { value: 0 }, uTime: { value: 0 }, uExtent: { value: RING_EXTENT } }
  const mat = new ShaderMaterial({
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    uniforms,
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat)
  mesh.frustumCulled = false
  mesh.name = 'Ring'
  return { mesh, uniforms }
}

/** Put the ring at (x, y) with radius r, in window-local px. */
export function fitRing(mesh: Mesh, uniforms: RingUniforms, x: number, y: number, r: number) {
  mesh.position.set(x, y, 0)
  mesh.scale.set(2 * RING_EXTENT * r, 2 * RING_EXTENT * r, 1)
  uniforms.uCentre.value[0] = x
  uniforms.uCentre.value[1] = y
  uniforms.uR.value = r
}

/** The ring's pulse for an event at `at` (clock s), read at `clock`: a 1.2 s rise-and-fall, once. */
export function glowAt(clock: number, at: number): number {
  if (at <= 0) return 0
  const t = (clock - at) / 1.2
  if (t < 0 || t > 1) return 0
  return Math.sin(t * Math.PI)
}

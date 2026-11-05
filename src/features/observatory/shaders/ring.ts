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
uniform float uRipple;    // 0 … 1: the inward ripples (hero, contact); 0 on the stage
uniform float uExtent;
uniform float uBands;      // 0 … 7: how many of the seven layers' bands have formed (fractional: the last one forming)
uniform float uLit[7];     // 0.2 … 1 per band: the picker keeps the chosen lit and dims the rest
varying vec2 vUv;

const vec3 GOLD = vec3(0.8510, 0.6431, 0.2549);      // #d9a441
const vec3 LIMB = vec3(0.9529, 0.8863, 0.7059);      // #f3e2b4, the limb's hot tone
const vec3 WARM = vec3(1.0, 0.9255, 0.7843);          // rgba(255,236,200)
const vec3 PORCELAIN = vec3(0.9255, 0.9137, 0.8863);  // #ece9e2
const vec3 NEON_CORE = vec3(1.0, 0.96, 0.86);          // the tube's hot core, near white
const vec3 NEON = vec3(1.0, 0.56, 0.16);               // its bloom: saturated gold-orange

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

  // The limb: a 2 px hot edge in the pale gold, then the accretion glow two-toned from the limb's
  // #f3e2b4 into #d9a441 over 22 px, and a wide halo at 16 %.
  float edge = exp(-pow((d - 1.0) / (2.0 * px), 2.0)) * 0.95;
  float out1 = max(d - 1.0, 0.0);
  float glow = exp(-out1 / (22.0 * px)) * (0.62 + 0.4 * uGlow) * step(1.0, d);
  float halo = exp(-out1 / (80.0 * px)) * (0.16 + 0.1 * uGlow) * step(1.0, d);
  vec3 glowTone = mix(LIMB, GOLD, smoothstep(0.0, 14.0 * px, out1));
  // The rim's slow doppler shimmer: one side brighter, the bright side turning once in 20 s.
  float dop = 1.0 + 0.3 * uRipple * cos(ang - uTime * 0.31416);
  edge *= dop;
  glow *= dop;
  // The photon rings (inset −7 % → d 1.07 at 22 %, inset −16 % → d 1.16 at 8 %).
  float ph1 = exp(-pow((d - 1.07) / (0.9 * px), 2.0)) * 0.22;
  float ph2 = exp(-pow((d - 1.16) / (0.9 * px), 2.0)) * 0.08;
  // The Einstein crescent: a conic highlight over the upper-right rim (the sb.css conic from 150°), blurred, drifting slowly.
  float t = fract((ang + 0.61 - uTime * 0.02) / 6.2832 + 0.5);
  float arc = smoothstep(0.28, 0.42, t) * (1.0 - smoothstep(0.58, 0.72, t));
  float warmth = smoothstep(0.42, 0.5, t) * (1.0 - smoothstep(0.5, 0.58, t));
  float band = exp(-pow((d - 1.05) / (2.5 * px), 2.0));
  vec3 crescent = mix(GOLD * 0.55, WARM * 0.35, warmth) * arc * band;

  // The seven layers as concentric luminous bands outside the photon rings: thin to thick, inner
  // (cloud) to outer (AI); each forms from nothing as uBands passes it; the picker dims by uLit.
  vec3 bands = vec3(0.0);
  float ba = 0.0;
  float r0 = 1.22;
  for (int k = 0; k < 7; k++) {
    float wk = (0.02 + 0.005 * float(k));            // the band's width in d (thin to thick; the seven reach ~1.6 r)
    float gap = 0.02;
    float r1 = r0 + wk;
    float form = clamp(uBands - float(k), 0.0, 1.0);
    // The band forms by widening from its inner edge, softly.
    float inner = smoothstep(r0 - 0.6 * px, r0 + 0.6 * px, d);
    float outer = 1.0 - smoothstep(r0 + wk * form - 0.6 * px, r0 + wk * form + 0.6 * px, d);
    float on = inner * outer * form;
    float lit = uLit[k];
    // Luminous: pale gold, brighter at the inner edge of each band.
    float shade = 0.55 + 0.45 * (1.0 - smoothstep(r0, r1, d));
    bands += mix(LIMB, GOLD, 0.35) * on * shade * (0.16 + 0.44 * lit);
    ba += on * (0.3 + 0.5 * lit) * 0.6;
    r0 = r1 + gap;
  }

  // The pull: four faint gold ripples born at 1.8 r, falling inward (accelerating) over 3.5 s,
  // brightening and thinning as they near the rim, gone at it. Staggered by a quarter. Quiet on the
  // words' side (left of the ring). A still frame keeps them where they are: faint static rings.
  // Neon: every line is a tube, a thin near-white hot core inside a saturated gold-orange bloom
  // (a tight glow and a wide soft one, additive), with a faint hum (brightness breathing, no flicker).
  float hum = 1.0 + 0.04 * uRipple * sin(uTime * 1.7);
  float rip = 0.0;      // the ripples' core
  float ripGlow = 0.0;  // their bloom
  for (int k = 0; k < 4; k++) {
    float phk = fract(uTime / 3.5 + float(k) * 0.25);
    float rad = mix(1.8, 1.02, phk * phk);
    float life = smoothstep(0.0, 0.15, phk) * (1.0 - smoothstep(0.86, 1.0, phk));
    float amp = mix(0.45, 1.0, phk) * life;
    float dd = (d - rad) / px;                                    // CSS px from the ripple's line
    rip += exp(-dd * dd / (0.55 * 0.55)) * amp;                  // ~1 px core
    ripGlow += (exp(-dd * dd / 16.0) * 0.55 + exp(-abs(dd) / 14.0) * 0.22) * amp;
  }
  float side = step(1.0, d) * smoothstep(-1.5, -0.7, p.x / uR);
  float ripK = 0.36 * uRipple * side * hum;                      // ~35 % peak (×1.4 in the contact)
  rip *= ripK;
  ripGlow *= ripK;
  // The rim as a neon tube: its hot core on the limb, a tight orange bloom and a wide soft one.
  float rd = (d - 1.0) / px;
  float rimCore = exp(-rd * rd / (0.7 * 0.7)) * 0.9 * dop * hum * min(uRipple, 1.0);
  float rimBloom = (exp(-rd * rd / 36.0) * 0.5 + exp(-max(rd, 0.0) / 28.0) * 0.25) * dop * hum * min(uRipple, 1.0) * step(0.0, rd);
  vec3 light = NEON_CORE * (rip + rimCore) + NEON * (ripGlow + rimBloom) + LIMB * edge + glowTone * glow + GOLD * halo + PORCELAIN * (ph1 + ph2) + crescent * (1.0 + 0.6 * uGlow) + bands;
  float la = clamp(rip + ripGlow + rimCore + rimBloom + edge + glow + halo + ph1 + ph2 + arc * band * 0.6 + ba, 0.0, 1.0);
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
  uRipple: { value: number }
  uExtent: { value: number }
  uBands: { value: number }
  uLit: { value: Float32Array }
}

/** How far the quad reaches, in radii: the seven bands end near 1.9 r, the halo's tail inside 2.4. */
export const RING_EXTENT = 2.4

export function createRing(): { mesh: Mesh; uniforms: RingUniforms } {
  const uniforms: RingUniforms = { uCentre: { value: [0, 0] }, uR: { value: 150 }, uGlow: { value: 0 }, uTime: { value: 0 }, uRipple: { value: 0 }, uExtent: { value: RING_EXTENT }, uBands: { value: 0 }, uLit: { value: new Float32Array([1, 1, 1, 1, 1, 1, 1]) } }
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

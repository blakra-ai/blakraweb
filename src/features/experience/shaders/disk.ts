import { tnoise, wheel } from './noise'

/**
 * The accretion disk: the seven colours wound around the hole, streaked by turbulence,
 * hotter (whiter) at the inner edge, brighter on the side moving toward the viewer, and
 * turning faster near the centre (Kepler). Flat ring geometry in the xy plane.
 */
export const diskVertex = /* glsl */ `
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const diskFragment = /* glsl */ `
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform float uSpin;
uniform vec3 uColors[7];
uniform float uOpacity;
uniform sampler2D uNoise;
varying vec2 vPos;
${tnoise}
${wheel}
void main() {
  float r = length(vPos);
  float a = atan(vPos.y, vPos.x);
  float x = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float omega = uSpin * pow(uInner / r, 1.5);
  float flow = a + uTime * omega;
  // Turbulence stretched along the orbit: long streaks, not blobs.
  vec2 q = vec2(cos(flow), sin(flow)) * r;
  float n = tnoise(vec2(flow * 5.0, r * 7.0)) * 0.62 + tnoise(vec2(flow * 13.0, r * 21.0) + q) * 0.38;
  float bands = 0.8 + 0.2 * sin(r * 24.0 + n * 5.0);
  vec3 color = wheel(a / 6.28318 + 0.5 - uTime * 0.012);
  float heat = mix(1.18, 0.82, x);
  float doppler = 1.0 + 0.28 * sin(a);
  vec3 c = color * bands * heat * doppler;
  c = mix(c, vec3(1.0), pow(1.0 - x, 10.0) * 0.85);
  float edge = smoothstep(0.0, 0.06, x) * (1.0 - smoothstep(0.62, 1.0, x));
  gl_FragColor = vec4(c, edge * (0.9 + 0.1 * n) * uOpacity);
}
`

import { tnoise, wheel } from './noise'

/**
 * Seen from just above the disk, light from its far side is bent over and under the shadow:
 * a wide arc above, a thin one below, and a sharp photon ring hugging the edge. Drawn on a
 * camera-facing quad around the hole, in units of the shadow's radius.
 */
export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const haloFragment = /* glsl */ `
uniform float uTime;
uniform float uExtent;
uniform float uTilt;
uniform vec3 uColors[7];
uniform float uOpacity;
uniform sampler2D uNoise;
varying vec2 vUv;
${tnoise}
${wheel}
void main() {
  vec2 p = (vUv * 2.0 - 1.0) * uExtent;
  float d = length(p);
  float a = atan(p.y, p.x);
  // Arc width: widest straight up, thinnest straight down; the tilt shifts the balance.
  float up = 0.5 + 0.5 * sin(a);
  float width = mix(0.07, 0.62, pow(up, 1.6)) * (1.0 + uTilt);
  float inner = 1.06;
  float band = smoothstep(inner, inner + 0.035, d) * (1.0 - smoothstep(inner + width * 0.6, inner + width, d));
  float flow = a * 2.0 - uTime * 0.5;
  float streak = 0.82 + 0.18 * sin(d * 34.0 + tnoise(vec2(flow * 3.0, d * 8.0)) * 6.0);
  vec3 color = wheel(a / 6.28318 + 0.25 - uTime * 0.01) * streak;
  color = mix(color, vec3(1.0), (1.0 - smoothstep(inner, inner + width * 0.35, d)) * 0.3);
  // The photon ring: one thin, hot line at the very edge of the shadow.
  float ring = exp(-pow((d - 1.018) / 0.012, 2.0));
  vec3 c = mix(color, vec3(1.0, 0.98, 0.94), ring);
  float alpha = max(band, ring);
  gl_FragColor = vec4(c, alpha * uOpacity);
}
`

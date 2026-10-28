/**
 * Value noise, shared by the shaders (GLSL). vnoise computes it; tnoise reads it from a small
 * tiling texture baked once (uNoise), which is what the large surfaces use: a texture fetch costs
 * a fraction of the arithmetic, and the disk covers half the screen when the camera is close.
 */
export const noise = /* glsl */ `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
`

/** The seven colours as a continuous wheel (GLSL); expects uniform vec3 uColors[7]. */
export const wheel = /* glsl */ `
vec3 wheel(float t) {
  t = fract(t) * 7.0;
  int i = int(floor(t));
  return mix(uColors[i], uColors[(i + 1) % 7], smoothstep(0.0, 1.0, fract(t)));
}
`

/** Baked noise lookup (GLSL); expects uniform sampler2D uNoise (a tiling value-noise texture). */
export const tnoise = /* glsl */ `
float tnoise(vec2 p) { return texture2D(uNoise, p * 0.0625).r; }
`

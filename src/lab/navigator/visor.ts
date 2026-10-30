import { lensGlsl } from './lens'

/**
 * The visor: dark gold-coated glass, and in it the reflection of what the Navigator is looking at,
 * a black hole behind the viewer. The reflected ray is lensed as by a point mass (the shadow, the
 * Einstein ring, the starfield bent round it), and the accretion disk, in the seven chakra
 * colours, crosses in front of the shadow while its far side is lensed up over the top.
 */
export const visorVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

export const visorFragment = /* glsl */ `
uniform vec3 uLens;
uniform float uTime;
uniform vec3 uHole;
uniform float uShow;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

// Stars on the sky sphere: one chance per cell, sharp and few.
vec3 stars(vec3 d) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? 60.0 : 140.0;
    vec3 p = d * s;
    vec3 cell = floor(p);
    float h = hash(cell);
    if (h > 0.985 - float(i) * 0.01) {
      vec3 at = cell + 0.5 + (vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 4.1)) - 0.5) * 0.6;
      float d2 = length(p - at);
      c += vec3(0.85, 0.9, 1.0) * smoothstep(0.22, 0.0, d2) * (0.6 + h * 0.6);
    }
  }
  return c;
}

vec3 spectrum(float t) {
  vec3 k[7];
  k[0] = vec3(0.91, 0.21, 0.17); k[1] = vec3(0.96, 0.48, 0.12); k[2] = vec3(0.97, 0.76, 0.11);
  k[3] = vec3(0.18, 0.70, 0.35); k[4] = vec3(0.16, 0.62, 0.88); k[5] = vec3(0.26, 0.28, 0.76); k[6] = vec3(0.60, 0.31, 0.82);
  t = fract(t) * 7.0;
  int i = int(floor(t));
  int j = i == 6 ? 0 : i + 1;
  return mix(k[i], k[j], fract(t));
}

void main() {
  ${lensGlsl('outside')}
  // The visor's outline: a rounded rectangle on the dome.
  vec2 q = abs(vUv - 0.5) - vec2(0.5 - 0.16, 0.5 - 0.22);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.16;
  if (sd > 0.0) discard;

  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  vec3 r = reflect(-v, n);
  vec3 H = normalize(uHole);
  float th = acos(clamp(dot(r, H), -1.0, 1.0));
  vec3 e1 = normalize(cross(H, vec3(0.0, 1.0, 0.0)));
  vec3 e2 = cross(e1, H);
  vec3 side = r - H * cos(th);
  float sl = length(side);
  vec2 p = sl > 1e-5 ? vec2(dot(side, e1), dot(side, e2)) / sl * th : vec2(0.0);

  float rs = 0.34;              // the shadow's angular radius
  float einstein = rs * 1.32;   // where the ring of light sits
  vec3 col = vec3(0.0);

  // The sky, bent: a point-mass lens maps the seen angle th to the source angle beta.
  float beta = th - einstein * einstein / max(th, 1e-3);
  vec3 dir = normalize(H * cos(beta) + (sl > 1e-5 ? side / sl : e1) * sin(beta));
  col += stars(dir) * smoothstep(rs, rs * 1.2, th);
  // The thin photon ring, brightest just outside the shadow.
  col += vec3(1.0, 0.93, 0.85) * exp(-pow((th - rs * 1.06) / (rs * 0.035), 2.0)) * 0.9;

  // The disk: a ring in a tilted plane round the hole, turning in its own sense (the colours travel).
  float ang = atan(p.y, p.x);
  vec2 dp = vec2(p.x, p.y / 0.22);
  float dr = length(dp);
  float disk = smoothstep(rs * 1.45, rs * 1.75, dr) * (1.0 - smoothstep(rs * 3.0, rs * 3.9, dr));
  float front = step(p.y, 0.0) + step(rs * 1.02, th) * (1.0 - step(p.y, 0.0));
  float dang = atan(dp.y, dp.x);
  float streak = 0.75 + 0.25 * sin(dr * 60.0 - uTime * 1.2 + sin(dang * 3.0) * 2.0);
  float doppler = 0.7 + 0.5 * cos(dang);
  col += spectrum(dang / 6.2832 - uTime * 0.02) * disk * front * streak * doppler * 1.25;
  // The far side of the disk, lensed up over the shadow (and a fainter image under it).
  float halo = exp(-pow((th - rs * 1.32) / (rs * 0.16), 2.0));
  col += spectrum(ang / 6.2832 + 0.25 - uTime * 0.02) * halo * (0.55 + 0.45 * smoothstep(-0.2, 0.6, p.y / max(th, 1e-3))) * 0.9;

  // The shadow itself: true black.
  col *= smoothstep(rs * 0.97, rs * 1.0, th);

  // The visor: dark glass with a gold coating that shows at grazing angles, and one studio highlight.
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 glass = vec3(0.012, 0.012, 0.018) + vec3(1.0, 0.72, 0.36) * fres * 0.5;
  vec3 L = normalize(vec3(0.5, 0.8, 0.6));
  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 140.0) * 1.2 + pow(max(dot(reflect(-L, n), v), 0.0), 18.0) * 0.08;
  vec3 c = glass + col * 0.95 * uShow + spec;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`

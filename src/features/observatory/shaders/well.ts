import { DoubleSide, PlaneGeometry, Mesh, ShaderMaterial } from 'three'

/*
 * The well: a full-window quad that draws the hairline grid (24 px cells, grey at 12 %) in CSS
 * pixels, bent into the gravity well toward the ring's centre. The bend is the storyboard's warp
 * (sb.js: r → r · (1 − pull · e^(−r²/σ²))); the shader draws by its inverse, so a pixel at distance
 * R from the centre shows the grid at the r that lands there (three Newton steps, see
 * windows.ts `wellInverse`). Units are window-local CSS px, y down. The frame's background is
 * painted here too (#0d0d10, rounded 16 px), so the canvas needs no other fill inside a window.
 *
 * Uniforms: uSize (w, h), uCentre (the ring), uSigma, uPull, uBend (0 … 1, the load device),
 * uHole (px: inside it the grid falls into black), uFade (0 … 1 of the width: the words' column
 * is quieter), uRadius (the frame's corner).
 *
 * The sky (uSky 1: the hero and the contact): a sparse fine starfield and three tiny planets
 * (their images stretched into short arcs on the Einstein ring), lensed toward the hole by the thin-lens map (source = pixel · (1 − E²/R²), E the Einstein radius
 * at 1.35 ring radii), so what nears the ring stretches into tangential arcs; a few faint infall
 * particles spiral in, warming from porcelain to gold before the horizon; and the bent grid
 * breathes radially toward the hole (slow pull waves). uTime drives it; a still passes 0.
 */

export const wellVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const wellFragment = /* glsl */ `
precision highp float;
uniform vec2 uSize;
uniform vec2 uCentre;
uniform float uSigma;
uniform float uPull;
uniform float uBend;
uniform float uHole;
uniform float uFade;
uniform float uRadius;
uniform float uCell;
uniform float uTime;
uniform float uSky;
uniform float uRing;
varying vec2 vUv;

const vec3 FRAME = vec3(0.0510, 0.0510, 0.0627);     // #0d0d10
const vec3 PORCELAIN = vec3(0.9255, 0.9137, 0.8863); // #ece9e2
const float LINE_A = 0.12;

const vec3 GOLD = vec3(0.8510, 0.6431, 0.2549);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// A sparse field of fine stars in source space (one per 56 px cell at 18 %), each a soft point 1–2 px wide
// on screen whatever the local stretch: near the ring the lens map stretches the cell tangentially, the star with it.
float stars(vec2 src) {
  float cell = 56.0;
  vec2 c = floor(src / cell);
  float h = hash12(c);
  if (h > 0.18) return 0.0;
  vec2 centre = (c + vec2(hash12(c + 1.7), hash12(c + 9.1))) * cell;
  vec2 d = src - centre;
  vec2 w = max(fwidth(src), vec2(1e-3));
  float r = length(d / (w * (1.2 + 1.2 * hash12(c + 4.2))));
  return exp(-r * r) * (0.35 + 0.65 * hash12(c + 2.3));
}

// A tiny disk (radius in source px) at a source point, anti-aliased through the stretch.
float planet(vec2 src, vec2 at, float radius) {
  vec2 w = max(fwidth(src), vec2(1e-3));
  float d = length((src - at) / w);
  float rr = radius / max(w.x, w.y);
  return 1.0 - smoothstep(rr - 0.8, rr + 0.8, d);
}

// The inverse warp: the r whose warped distance is R.
float wellInverse(float R, float s2, float pull) {
  float r = R / (1.0 - pull * exp(-(R * R) / s2));
  for (int i = 0; i < 3; i++) {
    float e = exp(-(r * r) / s2);
    float f = 1.0 - pull * e;
    float df = f + r * (pull * e * (2.0 * r) / s2);
    r -= (r * f - R) / max(df, 1e-4);
    r = max(r, 0.0);
  }
  return r;
}

void main() {
  vec2 p = vUv * uSize; // the camera is y-down: uv (0, 0) is the window's top-left

  // The frame's rounded corner: outside it, nothing.
  vec2 q = abs(p - uSize * 0.5) - (uSize * 0.5 - uRadius);
  float corner = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  if (corner > 0.0) discard;

  // Where this pixel's grid comes from: the un-bent point.
  vec2 d = p - uCentre;
  float R = length(d);
  // The pull breathes toward the hole: a slow wave travelling inward (the grid's radial breath).
  float breath = uSky * 0.07 * sin(uTime * 0.45 + R / max(uSigma, 1.0) * 2.4);
  float pull = uPull * uBend * (1.0 + breath);
  // The ripples' lensing (the ring shader's four inward ripples): the grid and stars bend inward with each passing ripple.
  float lensR = R;
  if (uSky > 0.5 && uRing > 1.0) {
    for (int k = 0; k < 4; k++) {
      float phk = fract(uTime / 3.5 + float(k) * 0.25);
      float rad = uRing * mix(1.8, 1.02, phk * phk);
      float life = smoothstep(0.0, 0.15, phk) * (1.0 - smoothstep(0.86, 1.0, phk));
      lensR += 2.5 * exp(-pow((R - rad) / 12.0, 2.0)) * life;
    }
  }
  float r = pull > 0.0005 ? wellInverse(lensR, uSigma * uSigma, pull) : lensR;
  vec2 g = R > 1e-4 ? uCentre + d * (r / R) : uCentre;

  // Hairlines one CSS px wide, whatever the local stretch (fwidth keeps them a pixel on screen).
  vec2 cell = g / uCell;
  vec2 f = abs(fract(cell) - 0.5) * uCell;             // distance to the nearest line, in grid px
  vec2 w = max(fwidth(g), vec2(1e-3));                  // grid px per screen px
  vec2 aa = 1.0 - smoothstep(vec2(0.0), w, f);         // 1 on the line, soft over one screen px
  float line = max(aa.x, aa.y);
  // Inside the hole the grid is gone; it thins toward the rim.
  float hole = smoothstep(uHole * 0.92, uHole * 1.15, R);
  // The words' column (left) is quieter: 0.35 at the edge, 0.5 at the fade stop, 1 at the right.
  float x = vUv.x;
  float fade = x < uFade ? mix(0.35, 0.5, x / max(uFade, 1e-3)) : mix(0.5, 1.0, (x - uFade) / max(1.0 - uFade, 1e-3));

  float a = LINE_A * line * hole * fade;
  vec3 col = mix(FRAME, PORCELAIN, a);

  if (uSky > 0.5) {
    // The lens: the source behind this pixel, the Einstein radius E; inside E the sky is the hole's.
    float E = 1.35 * max(uRing, 1.0);
    float lens = 1.0 - (E * E) / max(R * R, 1.0);
    vec2 src = uCentre + d * lens + vec2(uTime * 0.6, 0.0);
    float outside = smoothstep(E, E * 1.12, R);
    float sky = stars(src) * outside * fade * uBend;
    // Three tiny planets on slow orbits just off the line of sight: their images ride the Einstein ring as short stretched arcs.
    vec2 drift = vec2(uTime * 0.6, 0.0);
    float p1 = planet(src, uCentre + drift + 0.32 * E * vec2(cos(0.6 + uTime * 0.021), sin(0.6 + uTime * 0.021)), 2.6);
    float p2 = planet(src, uCentre + drift + 0.55 * E * vec2(cos(2.9 - uTime * 0.014), sin(2.9 - uTime * 0.014)), 1.8);
    float p3 = planet(src, uCentre + drift + 0.8 * E * vec2(cos(4.4 + uTime * 0.009), sin(4.4 + uTime * 0.009)), 2.2);
    vec3 skyCol = PORCELAIN * sky * 0.55 + (PORCELAIN * 0.7 * p1 + mix(PORCELAIN, GOLD, 0.5) * 0.6 * p2 + PORCELAIN * 0.5 * p3) * outside * uBend;
    // The infall: ten particles on spirals from 3 E to the horizon, each fading in, warming to gold, gone at the rim.
    if (R < 3.4 * E) {
      vec3 fall = vec3(0.0);
      for (int k = 0; k < 10; k++) {
        float fk = float(k);
        float ph = fract(uTime / (9.0 + 2.3 * fract(fk * 0.37)) + fk * 0.1);
        float rad = mix(3.1 * E, E * 0.98, ph * ph * (3.0 - 2.0 * ph));
        float ang = fk * 2.4 + ph * 7.5 + uTime * 0.05;
        vec2 at = uCentre + rad * vec2(cos(ang), sin(ang));
        float dd = length(p - at);
        float dot = exp(-dd * dd / 1.8);
        float life = smoothstep(0.0, 0.15, ph) * (1.0 - smoothstep(0.9, 1.0, ph));
        fall += mix(PORCELAIN * 0.5, GOLD * 1.1, ph) * dot * life;
      }
      skyCol += fall * uBend;
    }
    col += skyCol * smoothstep(uHole * 0.95, uHole * 1.2, R);
  }
  // The hole's shadow: the frame darkens into black toward the centre.
  col *= mix(0.0, 1.0, smoothstep(uHole * 0.6, uHole * 1.05, R));
  gl_FragColor = vec4(col, 1.0);
}
`

export interface WellUniforms extends Record<string, { value: unknown }> {
  uSize: { value: [number, number] }
  uCentre: { value: [number, number] }
  uSigma: { value: number }
  uPull: { value: number }
  uBend: { value: number }
  uHole: { value: number }
  uFade: { value: number }
  uRadius: { value: number }
  uCell: { value: number }
  uTime: { value: number }
  uSky: { value: number }
  uRing: { value: number }
}

/** One quad in window-local px (0 … w, 0 … h, y down under the world's orthographic camera). */
export function createWell(): { mesh: Mesh; uniforms: WellUniforms } {
  const uniforms: WellUniforms = {
    uSize: { value: [1, 1] },
    uCentre: { value: [0, 0] },
    uSigma: { value: 320 },
    uPull: { value: 0.66 },
    uBend: { value: 0 },
    uHole: { value: 0 },
    uFade: { value: 0.42 },
    uRadius: { value: 16 },
    uCell: { value: 24 },
    uTime: { value: 0 },
    uSky: { value: 0 },
    uRing: { value: 150 },
  }
  const mat = new ShaderMaterial({ vertexShader: wellVertex, fragmentShader: wellFragment, uniforms, side: DoubleSide, depthTest: false, depthWrite: false })
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat)
  mesh.frustumCulled = false
  mesh.name = 'Well'
  return { mesh, uniforms }
}

/** Fit the quad to a window of w × h px (its geometry is a unit plane at the origin). */
export function fitWell(mesh: Mesh, uniforms: WellUniforms, w: number, h: number) {
  mesh.position.set(w / 2, h / 2, 0)
  mesh.scale.set(w, h, 1)
  uniforms.uSize.value[0] = w
  uniforms.uSize.value[1] = h
}

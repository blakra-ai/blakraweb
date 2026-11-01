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
varying vec2 vUv;

const vec3 FRAME = vec3(0.0510, 0.0510, 0.0627);     // #0d0d10
const vec3 PORCELAIN = vec3(0.9255, 0.9137, 0.8863); // #ece9e2
const float LINE_A = 0.12;

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
  float pull = uPull * uBend;
  float r = pull > 0.0005 ? wellInverse(R, uSigma * uSigma, pull) : R;
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

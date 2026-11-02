import { AlwaysDepth, CustomBlending, Mesh, NormalBlending, PlaneGeometry, ShaderMaterial, ZeroFactor, SrcAlphaFactor } from 'three'

/*
 * The porthole's pass (porthole.ts decides its shape): three full-viewport quads that ignore the
 * camera and work in device pixels from gl_FragCoord.
 * - bg: the dark disc (near-black, a faint vignette), a thin gold halo ring offset behind her head
 *   with its dark shadow inside, and a thin gold rim on the aperture's curved edge. Over a dark
 *   window it fades in with the contraction (the window's own sky shows through at first).
 * - mask (depth test on with ALWAYS: WebGL writes no depth with the test off): writes depth 0 everywhere OUTSIDE the aperture (no colour), so her fragments there fail
 *   the depth test: she is clipped to the round shape without a stencil buffer.
 * - fade: multiplies what the pass drew by an opacity (stepping aside for a word or a disc).
 * The clip: inside the rounded box AND (inside the dark window OR right of the paper column).
 */

const vertex = /* glsl */ `
uniform float uDepth;
void main() {
  gl_Position = vec4(position.xy, uDepth, 1.0);
}
`

const clip = /* glsl */ `
uniform vec4 uBox;      // x, y (bottom-left, device px), w, h
uniform float uR;       // corner radius (device px)
uniform vec4 uWin;      // the dark window's rect (device px), w 0 = none
uniform float uCol;     // the paper column's left edge (device px)
float sdBox(vec2 p) {
  vec2 c = uBox.xy + 0.5 * uBox.zw;
  vec2 q = abs(p - c) - (0.5 * uBox.zw - uR);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uR;
}
bool inWin(vec2 p) {
  return uWin.z > 0.0 && p.x >= uWin.x && p.x <= uWin.x + uWin.z && p.y >= uWin.y && p.y <= uWin.y + uWin.w;
}
uniform float uHeadOut; // 0 … 1: the head may leave the hole above the neck line
uniform float uNeck;    // the neck line (device px, y up)
uniform vec3 uCircle;   // the docked circle: centre, radius (device px)
uniform float uBgOn;    // 0 … 1: the docked disc's opacity over the paper
uniform float uWinOpen; // 1 while she is framed by the dark window (its whole rect is her frame), 0 as the bust
// Over the paper only the docked circle ever shows (no straight-sided shape while the opening travels).
bool inside(vec2 p) {
  // Inside the dark window she is clipped by the window alone (no shrinking box edge across her).
  return (uWinOpen > 0.5 && inWin(p)) || (p.x >= uCol && length(p - uCircle.xy) <= uCircle.z);
}
bool headOut(vec2 p) {
  return uHeadOut > 0.5 && p.y >= uNeck && p.x >= uCol;
}
`

const bgFragment = /* glsl */ `
precision highp float;
${clip}
uniform vec3 uHalo;      // centre x, y (device px), radius
uniform float uHaloOn;   // 0 … 1
uniform float uRim;      // 0 … 1
uniform float uOverWin;  // alpha over the dark window, 0 … 1
uniform float uPx;       // device px per CSS px
uniform float uTime;
const vec3 GOLD = vec3(0.8510, 0.6431, 0.2549);
const vec3 LIMB = vec3(0.9529, 0.8863, 0.7059);
void main() {
  vec2 p = gl_FragCoord.xy;
  if (!inside(p)) {
    // The neck's contact shadow on the paper just above the rim, where it comes out of the hole.
    float e = length(p - uCircle.xy) - uCircle.z;
    float up = clamp((p.y - uCircle.y) / max(uCircle.z, 1.0), 0.0, 1.0);
    float sh = uHeadOut * exp(-e / (9.0 * uPx)) * step(0.0, e) * up * up * 0.55;
    if (sh < 0.004 || p.x < uCol) discard;
    gl_FragColor = vec4(0.0, 0.0, 0.0, sh);
    return;
  }
  float sd = sdBox(p);
  vec2 c = uBox.xy + 0.5 * uBox.zw;
  float rr = 0.5 * min(uBox.z, uBox.w);
  // The dark: #0b0b0d at the rim, deeper toward the centre.
  float v = clamp(length(p - c) / max(rr, 1.0), 0.0, 1.0);
  vec3 col = mix(vec3(0.016, 0.016, 0.022), vec3(0.043, 0.043, 0.051), v * v);
  // The halo: the hole's shadow inside, a thin gold limb, a soft glow outside, a slow breathing.
  float hd = length(p - uHalo.xy) / max(uHalo.z, 1.0);
  float px = uPx / max(uHalo.z, 1.0);
  float shadow = (1.0 - smoothstep(1.0 - px, 1.0 + px, hd)) * 0.9;
  col = mix(col, vec3(0.0), shadow * uHaloOn);
  float limb = exp(-pow((hd - 1.0) / (1.4 * px), 2.0));
  float out1 = max(hd - 1.0, 0.0);
  float glow = exp(-out1 / (10.0 * px)) * step(1.0, hd) * (0.34 + 0.04 * sin(uTime * 1.3));
  float ph = exp(-pow((hd - 1.08) / (0.8 * px), 2.0)) * 0.25;
  col += (mix(LIMB, GOLD, 0.35) * limb * 0.85 + GOLD * glow * 0.55 + GOLD * ph) * uHaloOn;
  // The rim: a thin gold line on the aperture's edge, its light falling inward.
  float rim = exp(-pow((sd + 0.9 * uPx) / (0.8 * uPx), 2.0)) * 0.9 + exp((sd) / (7.0 * uPx)) * 0.16;
  col += GOLD * rim * uRim;
  float a = inWin(p) ? uOverWin : uBgOn;
  gl_FragColor = vec4(col * a, a);
}
`

const maskFragment = /* glsl */ `
precision highp float;
${clip}
void main() {
  if (inside(gl_FragCoord.xy) || headOut(gl_FragCoord.xy)) discard;
  gl_FragColor = vec4(0.0);
}
`

const fadeFragment = /* glsl */ `
precision highp float;
${clip}
uniform float uOpacity;
uniform float uPx;
uniform vec4 uKeep;     // a dark window on screen (device px): the fade never touches its sky
uniform float uRamp;    // px over which the figure fades in across the paper column's edge
void main() {
  vec2 p = gl_FragCoord.xy;
  if (!inside(p) && !headOut(p)) discard;
  // A dark window's own sky is never faded (its pixels are not hers to multiply: no paper-coloured strip).
  if (uKeep.z > 0.0 && p.x >= uKeep.x && p.x <= uKeep.x + uKeep.z && p.y >= uKeep.y && p.y <= uKeep.y + uKeep.w && uOpacity > 0.999) discard;
  float ramp = (inWin(p) || uRamp < 0.5) ? 1.0 : smoothstep(uCol, uCol + uRamp, p.x);
  // Over the paper she shows only as the porthole docks (nothing of the big framing spills out of the window).
  if (!inWin(p)) ramp *= uBgOn;
  // The head out of the hole: feathered 24 px at the column's edge (never a straight cut).
  if (!inside(p)) ramp *= smoothstep(uCol, uCol + 24.0 * uPx, p.x);
  gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity * ramp);
}
`

export interface PortholeUniforms {
  uDepth: { value: number }
  uBox: { value: [number, number, number, number] }
  uR: { value: number }
  uWin: { value: [number, number, number, number] }
  uCol: { value: number }
  uHalo: { value: [number, number, number] }
  uHaloOn: { value: number }
  uRim: { value: number }
  uOverWin: { value: number }
  uPx: { value: number }
  uTime: { value: number }
  uOpacity: { value: number }
  uHeadOut: { value: number }
  uNeck: { value: number }
  uCircle: { value: [number, number, number] }
  uRamp: { value: number }
  uBgOn: { value: number }
  uKeep: { value: [number, number, number, number] }
  uWinOpen: { value: number }
}

export function createPorthole(): { bg: Mesh; mask: Mesh; fade: Mesh; uniforms: PortholeUniforms } {
  const u: PortholeUniforms = {
    uDepth: { value: 0 },
    uBox: { value: [0, 0, 1, 1] },
    uR: { value: 0 },
    uWin: { value: [0, 0, 0, 0] },
    uCol: { value: 1e9 },
    uHalo: { value: [0, 0, 1] },
    uHaloOn: { value: 0 },
    uRim: { value: 0 },
    uOverWin: { value: 0 },
    uPx: { value: 1 },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uHeadOut: { value: 0 },
    uNeck: { value: 0 },
    uCircle: { value: [0, 0, 1] },
    uRamp: { value: 0 },
    uBgOn: { value: 1 },
    uKeep: { value: [0, 0, 0, 0] },
    uWinOpen: { value: 1 },
  }
  const geo = new PlaneGeometry(2, 2)
  const bg = new Mesh(geo, new ShaderMaterial({ vertexShader: vertex, fragmentShader: bgFragment, uniforms: { ...u, uDepth: { value: 0 } }, transparent: true, premultipliedAlpha: true, blending: NormalBlending, depthTest: false, depthWrite: false }))
  // Depth −1 in clip space is the near plane: depth 0 in the buffer, nearer than anything she draws.
  const mask = new Mesh(geo, new ShaderMaterial({ vertexShader: vertex, fragmentShader: maskFragment, uniforms: { ...u, uDepth: { value: -1 } }, colorWrite: false, depthTest: true, depthFunc: AlwaysDepth, depthWrite: true }))
  const fade = new Mesh(geo, new ShaderMaterial({ vertexShader: vertex, fragmentShader: fadeFragment, uniforms: { ...u, uDepth: { value: 0 } }, transparent: true, blending: CustomBlending, blendSrc: ZeroFactor, blendDst: SrcAlphaFactor, depthTest: false, depthWrite: false }))
  for (const m of [bg, mask, fade]) m.frustumCulled = false
  return { bg, mask, fade, uniforms: u }
}

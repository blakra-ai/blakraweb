import { CustomBlending, DoubleSide, Mesh, OneFactor, OneMinusSrcAlphaFactor, RingGeometry, ShaderMaterial, Vector3, type Texture } from 'three'
import { HOLE } from './glsl'

/**
 * The accretion disk, drawn twice: its far half goes into the lensed layer (so it bends
 * over and under the shadow), its near half into the layer in front of the hole.
 * Colour is temperature: red at the cool outer edge, white-hot at the inner edge; the
 * side moving toward the viewer is brighter (Doppler beaming).
 */
const vertex = /* glsl */ `
varying vec3 vWorld;
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const fragment = /* glsl */ `
uniform float uTime;
uniform float uBright;
uniform float uSide;
uniform float uIsco;
uniform vec3 uCam;
uniform sampler2D uNoise;
varying vec3 vWorld;
varying vec2 vLocal;
const float IN = ${HOLE.diskIn.toFixed(2)};
const float OUT = ${HOLE.diskOut.toFixed(2)};
const float ISCO = ${HOLE.isco.toFixed(2)};
void main() {
  // Far half: beyond the plane through the hole that faces the camera. The halves
  // overlap in a soft band, so the lensed and the unlensed parts meet without a seam.
  float behind = dot(vWorld, -normalize(uCam));
  float share = uSide > 0.0 ? smoothstep(-0.9, 0.9, behind) : 1.0 - smoothstep(-0.9, 0.9, behind);
  if (share < 0.002) discard;
  float r = length(vLocal);
  float a = atan(vLocal.y, vLocal.x);
  // Inner orbits turn faster (Kepler): read the baked turbulence at the point rotated back in time.
  float omega = 2.2 * pow(r, -1.5) * uTime;
  vec2 ring = mat2(cos(omega), sin(omega), -sin(omega), cos(omega)) * vLocal;
  vec2 nf = texture2D(uNoise, ring / (2.0 * OUT) + 0.5).rg;
  float n = nf.r;
  float fine = nf.g;
  float lanes = 0.8 + 0.2 * sin(r * 21.0 + n * 14.0 + fine * 4.0);
  float temp = pow(IN / r, 1.1);
  vec3 c = mix(vec3(1.0, 0.36, 0.1), vec3(1.0, 0.9, 0.74), temp) * (0.25 + 1.9 * temp);
  vec3 v = normalize(vec3(-vWorld.z, 0.0, vWorld.x));
  float doppler = 1.0 + 0.6 * dot(v, normalize(uCam - vWorld));
  float edge = smoothstep(IN, IN + 0.35, r) * (1.0 - smoothstep(OUT - 3.4, OUT, r));
  float dens = edge * (0.2 + 0.9 * n * n) * lanes * (0.75 + 0.5 * fine);
  vec3 col = c * dens * doppler * uBright * 1.35 * share;
  // The last stable orbit: a dashed ring, drawn on the disk when the story needs it.
  float dash = step(0.45, fract(a * 36.0 / 6.2831853 - uTime * 0.05));
  float w = fwidth(r) * 1.2 + 0.006;
  col += vec3(1.0, 0.45, 0.2) * smoothstep(w, 0.0, abs(r - ISCO)) * dash * 2.4 * uIsco * share;
  // Premultiplied: the gas glows and also hides a little of what lies behind it.
  gl_FragColor = vec4(col, clamp(dens * 0.75 * uBright * share, 0.0, 0.85));
}`

export interface Disk {
  far: Mesh
  near: Mesh
  update(time: number, bright: number, isco: number, cam: Vector3): void
  dispose(): void
}

export function createDisk(noise: Texture): Disk {
  const geometry = new RingGeometry(HOLE.diskIn, HOLE.diskOut, 256, 24)
  const make = (side: number) => {
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uBright: { value: 1 }, uSide: { value: side }, uIsco: { value: 0 }, uCam: { value: new Vector3() }, uNoise: { value: noise } },
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      depthWrite: false,
      side: DoubleSide,
      transparent: true,
    })
    const mesh = new Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.frustumCulled = false
    return mesh
  }
  const far = make(1)
  const near = make(-1)
  return {
    far,
    near,
    update(time, bright, isco, cam) {
      for (const m of [far, near]) {
        const u = (m.material as ShaderMaterial).uniforms
        u.uTime.value = time
        u.uBright.value = bright
        u.uIsco.value = isco
        u.uCam.value.copy(cam)
      }
      far.visible = near.visible = bright > 0.002 || isco > 0.002
    },
    dispose() {
      geometry.dispose()
      ;(far.material as ShaderMaterial).dispose()
      ;(near.material as ShaderMaterial).dispose()
    },
  }
}

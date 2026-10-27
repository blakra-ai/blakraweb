import { CustomBlending, DoubleSide, Mesh, OneFactor, OneMinusSrcAlphaFactor, RingGeometry, ShaderMaterial, Vector3 } from 'three'

/**
 * The people: three points of light on the closest orbit around the hole, each trailing
 * a short arc. Nothing stands between them and the core. Like the disk, drawn twice so
 * the part of each orbit behind the hole is lensed.
 */
const R = 3.4
const TILT = 0.22

const fragment = /* glsl */ `
uniform float uTime;
uniform float uShow;
uniform float uSide;
uniform vec3 uCam;
varying vec2 vLocal;
varying vec3 vWorld;
void main() {
  float behind = dot(vWorld, -normalize(uCam));
  float share = uSide > 0.0 ? smoothstep(-0.6, 0.6, behind) : 1.0 - smoothstep(-0.6, 0.6, behind);
  if (share < 0.002) discard;
  float r = length(vLocal);
  float across = (r - ${R.toFixed(2)}) / 0.035;
  float line = exp(-across * across);
  float a = atan(vLocal.y, vLocal.x);
  float light = 0.0;
  for (int i = 0; i < 3; i++) {
    float head = uTime * 0.5 + float(i) * 2.0943951;
    // Angle behind each light, wrapped to 0 … 2π: a comet's tail.
    float d = mod(head - a, 6.2831853);
    light += exp(-d * 1.4) * 1.2 + exp(-d * d * 400.0) * 6.0;
  }
  vec3 col = vec3(1.0, 0.9, 0.78) * line * (0.04 + light) * uShow * share;
  gl_FragColor = vec4(col, clamp(line * light * 0.3 * uShow * share, 0.0, 0.6));
}`

export function createOrbiters() {
  const geometry = new RingGeometry(R - 0.12, R + 0.12, 384, 1)
  const make = (side: number) => {
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uShow: { value: 0 }, uSide: { value: side }, uCam: { value: new Vector3() } },
      vertexShader: /* glsl */ `
        varying vec2 vLocal;
        varying vec3 vWorld;
        void main() {
          vLocal = position.xy;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: fragment,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })
    const mesh = new Mesh(geometry, material)
    mesh.rotation.set(-Math.PI / 2 + TILT, 0, 0.4)
    mesh.frustumCulled = false
    return mesh
  }
  const far = make(1)
  const near = make(-1)
  return {
    far,
    near,
    update(time: number, show: number, cam: Vector3) {
      for (const m of [far, near]) {
        m.visible = show > 0.003
        const u = (m.material as ShaderMaterial).uniforms
        u.uTime.value = time
        u.uShow.value = show
        u.uCam.value.copy(cam)
      }
    },
    dispose() {
      geometry.dispose()
      ;(far.material as ShaderMaterial).dispose()
      ;(near.material as ShaderMaterial).dispose()
    },
  }
}

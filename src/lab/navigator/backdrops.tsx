import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { ShaderMaterial } from 'three'
import { lens } from './lens'

const fullscreen = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }
`

/**
 * The gravity field behind everything (BLAKRA's answer to Lando's track contours): contour lines
 * of the potential of two masses, the Navigator and the cursor. They bend round the cursor and
 * drift slowly inward, as everything near a black hole does.
 */
export function Field({ hole }: { hole: { x: number; y: number } }) {
  const { size, gl } = useThree()
  // Built once and passed by reference: R3F copies a uniforms object given as a prop.
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: { uRes: { value: [1, 1] }, uMouse: { value: [0, 0] }, uHole: { value: [0, 0] }, uTime: { value: 0 }, uDpr: { value: 1 } },
        vertexShader: fullscreen,
        fragmentShader: /* glsl */ `
          uniform vec2 uRes; uniform vec2 uMouse; uniform vec2 uHole; uniform float uTime; uniform float uDpr;
          varying vec2 vUv;
          void main() {
            vec2 p = gl_FragCoord.xy / uRes.y;
            vec2 h = uHole / uRes.y;
            vec2 m = uMouse / uRes.y;
            // Potential of the Navigator's well and the cursor's small mass.
            float phi = 1.0 / (length(p - h) * 3.2 + 0.32) + 0.38 / (length(p - m) * 5.0 + 0.22);
            float f = phi * 7.0 - uTime * 0.05;
            float w = fwidth(f);
            float line = 1.0 - smoothstep(0.0, w * 1.15, abs(fract(f - 0.5) - 0.5));
            // Every fifth line a little firmer, like a survey map's index contours.
            float major = 1.0 - smoothstep(0.0, w * 1.3, abs(fract(f / 5.0 - 0.5) - 0.5) * 5.0);
            vec3 paper = vec3(0.949, 0.941, 0.922);
            vec3 ink = vec3(0.043, 0.043, 0.063);
            vec3 c = mix(paper, ink, line * 0.13 + major * 0.08);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useFrame((state) => {
    const u = mat.uniforms
    const dpr = gl.getPixelRatio()
    u.uRes.value = [size.width * dpr, size.height * dpr]
    u.uDpr.value = dpr
    u.uMouse.value = [lens.value[0], lens.value[1]]
    u.uHole.value = [hole.x * size.width * dpr, (1 - hole.y) * size.height * dpr]
    u.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh renderOrder={-10} frustumCulled={false} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

/**
 * Inside the X-ray lens: blueprint paper (deep blue, a fine grid), ringed in the accent, under
 * the blueprint lines of the helmet.
 */
export function LensPaper() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        transparent: true,
        uniforms: { uLens: lens },
        vertexShader: fullscreen,
        fragmentShader: /* glsl */ `
          uniform vec3 uLens;
          void main() {
            float d = length(gl_FragCoord.xy - uLens.xy);
            if (d > uLens.z + 2.0) discard;
            vec2 g = abs(fract((gl_FragCoord.xy - uLens.xy) / 24.0 - 0.5) - 0.5) * 24.0;
            float grid = 1.0 - smoothstep(0.0, 1.0, min(g.x, g.y));
            vec3 blue = vec3(0.012, 0.035, 0.16);
            vec3 c = blue + grid * 0.035;
            float ring = smoothstep(uLens.z - 3.0, uLens.z - 1.5, d);
            c = mix(c, vec3(1.0, 0.353, 0.122), ring);
            float a = 1.0 - smoothstep(uLens.z, uLens.z + 1.5, d);
            gl_FragColor = vec4(c, a);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  return (
    <mesh renderOrder={-5} frustumCulled={false} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

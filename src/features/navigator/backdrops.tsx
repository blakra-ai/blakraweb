import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { ShaderMaterial } from 'three'
import { lens } from './lens'
import { nav } from './state'

const fullscreen = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }
`

/**
 * The page's ground and the gravity field (BLAKRA's answer to Lando's track contours): contour
 * lines of the potential of two masses, the Navigator and the cursor, drifting slowly inward.
 * Sections drawn on ink are painted here as bands, edge to edge, so paper and ink alternate with
 * the lines running through both: the page is one continuous surface, never a stack of boxes.
 */
export function Field({ hole }: { hole: { x: number; y: number } }) {
  const { size, gl } = useThree()
  // Built once and passed by reference: R3F copies a uniforms object given as a prop.
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uRes: { value: [1, 1] },
          uMouse: { value: [0, 0] },
          uHole: { value: [0, 0] },
          uTime: { value: 0 },
          uBands: { value: new Float32Array(8) },
          uBandCount: { value: 0 },
        },
        vertexShader: fullscreen,
        fragmentShader: /* glsl */ `
          uniform vec2 uRes; uniform vec2 uMouse; uniform vec2 uHole; uniform float uTime;
          uniform float uBands[8]; uniform int uBandCount;
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
            // Ink where an ink section is on screen (bands in device pixels from the top).
            float yTop = uRes.y - gl_FragCoord.y;
            float ink = 0.0;
            for (int i = 0; i < 4; i++) {
              if (i >= uBandCount) break;
              ink = max(ink, step(uBands[i * 2], yTop) * step(yTop, uBands[i * 2 + 1]));
            }
            vec3 paper = vec3(0.949, 0.941, 0.922);
            vec3 inkC = vec3(0.043, 0.043, 0.063);
            vec3 ground = mix(paper, inkC, ink);
            vec3 strokeC = mix(inkC, vec3(0.93, 0.92, 0.9), ink);
            vec3 c = mix(ground, strokeC, (line * 0.13 + major * 0.08) * mix(1.0, 0.8, ink));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useFrame((_, dt) => {
    const u = mat.uniforms
    const dpr = gl.getPixelRatio()
    u.uRes.value = [size.width * dpr, size.height * dpr]
    u.uMouse.value = [lens.value[0], lens.value[1]]
    u.uHole.value = [hole.x * size.width * dpr, (1 - hole.y) * size.height * dpr]
    if (!nav.still) u.uTime.value += dt
    const bands = u.uBands.value as Float32Array
    nav.inkBands.forEach(([t, b], i) => {
      bands[i * 2] = t * dpr
      bands[i * 2 + 1] = b * dpr
    })
    u.uBandCount.value = nav.inkBands.length
  })
  return (
    <mesh renderOrder={-10} frustumCulled={false} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

/** Inside the X-ray lens: blueprint paper (deep blue, a fine grid), ringed in the accent. */
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

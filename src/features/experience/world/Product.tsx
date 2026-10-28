import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CanvasTexture, SRGBColorSpace, type Mesh, type ShaderMaterial } from 'three'
import { film } from '../state'
import { beats, ease, productFocus, span } from '../timeline'

/**
 * Act VI: inside the system. Seen down the spin axis the disk is a ring of light around the
 * shadow, and in the shadow our product comes into focus, drawn in light: the face the skin
 * analysis reads, its sample points, the three it flags, and the scan passing over it.
 */
export function ProductMark({ radius }: { radius: number }) {
  const mesh = useRef<Mesh>(null)
  const mat = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uMap: { value: drawFace() }, uA: { value: 0 }, uTime: { value: 0 } }), [])
  useFrame(() => {
    const T = film.t
    const a = ease(span(T, productFocus - 0.01, productFocus + 0.008)) * (1 - ease(span(T, beats.orbit[0] - 0.001, beats.orbit[0] + 0.008)))
    if (mesh.current) mesh.current.visible = a > 0.001
    const u = mat.current?.uniforms
    if (!u) return
    u.uA.value = a
    u.uTime.value = film.clock
  })
  return (
    <Billboard>
      <mesh ref={mesh} position={[0, 0, radius * 1.05]} visible={false} renderOrder={4}>
        <planeGeometry args={[radius * 1.84, radius * 1.84]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  )
}

const vertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uA;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  if (length(c) > 0.5) discard;
  vec4 tex = texture2D(uMap, vUv);
  // Coming into focus: the drawing sharpens from a soft glow as it arrives.
  float soft = (1.0 - uA) * 0.012;
  vec4 blur = (texture2D(uMap, vUv + vec2(soft, 0.0)) + texture2D(uMap, vUv - vec2(soft, 0.0)) + texture2D(uMap, vUv + vec2(0.0, soft)) + texture2D(uMap, vUv - vec2(0.0, soft))) * 0.25;
  tex = mix(tex, blur, 1.0 - uA);
  // The scan: a band of light passing down the face, inside its contour.
  float y = 1.0 - fract(uTime * 0.22);
  float inside = step(pow(c.x / 0.3, 2.0) + pow((c.y + 0.02) / 0.4, 2.0), 1.0);
  float band = exp(-pow((vUv.y - y) / 0.018, 2.0)) * inside;
  vec3 col = mix(vec3(0.95, 0.94, 0.92), tex.rgb, tex.a) + vec3(1.0, 0.45, 0.2) * band * 0.6;
  gl_FragColor = vec4(col, (tex.a + band * 0.55) * uA);
  #include <colorspace_fragment>
}
`

/** The drawing, once: the contour, sample points on a grid inside it, three flagged in accent. */
function drawFace() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  const cx = 256
  const cy = 266
  const rx = 150
  const ry = 200
  g.strokeStyle = 'rgba(242, 240, 235, 0.9)'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  g.stroke()
  const hot = new Set([9, 16, 23])
  let i = 0
  for (let y = cy - ry + 34; y < cy + ry; y += 34)
    for (let x = cx - rx + 26; x < cx + rx; x += 34) {
      if (((x - cx) / (rx - 14)) ** 2 + ((y - cy) / (ry - 14)) ** 2 >= 1) continue
      const flagged = hot.has(i++)
      g.fillStyle = flagged ? '#ff5a1f' : 'rgba(242, 240, 235, 0.75)'
      g.beginPath()
      g.arc(x, y, flagged ? 9 : 4, 0, Math.PI * 2)
      g.fill()
      if (flagged) {
        g.strokeStyle = 'rgba(255, 90, 31, 0.8)'
        g.lineWidth = 2
        g.beginPath()
        g.arc(x, y, 20, 0, Math.PI * 2)
        g.stroke()
      }
    }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

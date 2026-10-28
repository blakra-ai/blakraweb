import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, LinearFilter, Vector3, type Mesh, type ShaderMaterial } from 'three'
import { lensFragment, lensVertex } from '../shaders/lens'
import { colors, quality } from '../tokens'

/** The giant BLAKRA, drawn once into a texture (the page's own Geist), as wide as the view. */
function useWordmark(width: number) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round(width * 0.25)
    const t = new CanvasTexture(canvas)
    t.minFilter = LinearFilter
    t.generateMipmaps = false
    return t
  }, [width])
  useEffect(() => {
    let live = true
    const draw = () => {
      if (!live) return
      const canvas = texture.image as HTMLCanvasElement
      const g = canvas.getContext('2d')!
      g.clearRect(0, 0, canvas.width, canvas.height)
      g.fillStyle = '#000'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      // Fit the word to 94% of the width.
      let size = canvas.height * 1.05
      g.font = `800 ${size}px Geist, system-ui, sans-serif`
      const w = g.measureText('BLAKRA').width
      size *= (canvas.width * 0.94) / w
      g.font = `800 ${size}px Geist, system-ui, sans-serif`
      ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-size * 0.06}px`
      g.fillText('BLAKRA', canvas.width / 2, canvas.height * 0.54)
      texture.needsUpdate = true
    }
    document.fonts.load('800 100px Geist').then(draw, draw)
    return () => {
      live = false
    }
  }, [texture])
  return texture
}

const ahead = new Vector3()
const toHole = new Vector3()

/**
 * The wordmark on a plane behind the hole, bent by its lens: the letters curve around the
 * shadow and stretch into an arc as the hole passes over them. `hole` is the hole's world
 * position, `radius` its shadow radius in world units.
 */
export function Wordmark({ z, y, hole, radius, pull, phone, alpha, span = 0.92 }: { z: number; y: number; hole: { current: Vector3 }; radius: { current: number }; pull: { current: number }; phone: boolean; alpha?: { current: number }; span?: number }) {
  const mesh = useRef<Mesh>(null)
  const mat = useRef<ShaderMaterial>(null)
  const { camera, viewport } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, z])
  const width = v.width * span
  const height = width * 0.25
  const map = useWordmark(phone ? quality.wordmarkPx.phone : quality.wordmarkPx.desktop)
  const uniforms = useMemo(
    () => ({ uMap: { value: map }, uHole: { value: [0.5, 0.5] }, uEinstein: { value: 0 }, uAspect: { value: 4 }, uInk: { value: new Color(colors.ink) }, uPull: { value: 0 }, uAlpha: { value: 1 } }),
    [map],
  )
  useFrame(() => {
    const m = mat.current
    if (!m) return
    // Where the line of sight through the hole meets the word's plane, in its uv.
    ahead.copy(hole.current)
    toHole.copy(ahead).sub(camera.position)
    const t = (z - camera.position.z) / toHole.z
    const hx = camera.position.x + toHole.x * t
    const hy = camera.position.y + toHole.y * t
    m.uniforms.uHole.value = [(hx + width / 2) / width, (hy - y + height / 2) / height]
    m.uniforms.uAspect.value = width / height
    // The Einstein radius in the plane's uv (x units), grown by the distance behind the hole.
    const scale = (z - camera.position.z) / (hole.current.z - camera.position.z)
    m.uniforms.uEinstein.value = (radius.current * 1.7 * scale) / width
    m.uniforms.uPull.value = pull.current
    m.uniforms.uAlpha.value = alpha ? alpha.current : 1
    if (mesh.current) mesh.current.visible = m.uniforms.uAlpha.value > 0.001
  })
  return (
    <mesh ref={mesh} position={[0, y, z]} renderOrder={-1}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial ref={mat} vertexShader={lensVertex} fragmentShader={lensFragment} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  )
}

import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, DoubleSide, RingGeometry, type ShaderMaterial } from 'three'
import { diskFragment, diskVertex } from '../shaders/disk'
import { haloFragment, haloVertex } from '../shaders/halo'
import { blackHole, chakras } from '../tokens'
import { noiseTexture } from './noiseTexture'

const HALO_EXTENT = 2.2

/**
 * The black hole, in units of its shadow's radius: a perfectly black shadow, the lensed far
 * side of the disk and the photon ring around it (one camera-facing quad), and the disk itself
 * in the seven colours, close to edge-on. `tilt` adds to the disk's tilt (the cursor's lean).
 */
export function BlackHole({ tilt = 0, opacity }: { tilt?: number; opacity?: { current: number } }) {
  const disk = useRef<ShaderMaterial>(null)
  const halo = useRef<ShaderMaterial>(null)
  const colors = useMemo(() => chakras.map((c) => new Color(c.color)), [])
  const ring = useMemo(() => new RingGeometry(blackHole.diskInner, blackHole.diskOuter, 256, 8), [])
  const diskUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uInner: { value: blackHole.diskInner }, uOuter: { value: blackHole.diskOuter }, uSpin: { value: blackHole.spin }, uColors: { value: colors }, uOpacity: { value: 1 }, uNoise: { value: noiseTexture() } }),
    [colors],
  )
  const haloUniforms = useMemo(() => ({ uTime: { value: 0 }, uExtent: { value: HALO_EXTENT }, uTilt: { value: 0 }, uColors: { value: colors }, uOpacity: { value: 1 }, uNoise: { value: noiseTexture() } }), [colors])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const o = opacity ? opacity.current : 1
    if (disk.current) {
      disk.current.uniforms.uTime.value = t
      disk.current.uniforms.uOpacity.value = o
    }
    if (halo.current) {
      halo.current.uniforms.uTime.value = t
      halo.current.uniforms.uTilt.value = tilt * 1.5
      halo.current.uniforms.uOpacity.value = o
    }
  })

  return (
    <group>
      {/* The shadow: nothing escapes, so nothing is lit. */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <Billboard>
        <mesh renderOrder={1}>
          <planeGeometry args={[HALO_EXTENT * 2, HALO_EXTENT * 2]} />
          <shaderMaterial ref={halo} vertexShader={haloVertex} fragmentShader={haloFragment} uniforms={haloUniforms} transparent depthWrite={false} />
        </mesh>
      </Billboard>
      <mesh geometry={ring} rotation={[blackHole.diskTilt + tilt, 0, 0.12]} renderOrder={2}>
        <shaderMaterial ref={disk} vertexShader={diskVertex} fragmentShader={diskFragment} uniforms={diskUniforms} transparent depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  )
}

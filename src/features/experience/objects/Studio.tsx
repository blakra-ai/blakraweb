import { Environment, Lightformer } from '@react-three/drei'

/** Reflections for glossy surfaces, drawn from light panels in code: no HDR file is loaded. */
export function Studio({ warm = '#ff6a2a', cool = '#7fb0ff', base = '#ffffff' }: { warm?: string; cool?: string; base?: string }) {
  return (
    <Environment resolution={256} frames={1}>
      {/* Chrome needs dark around the bright panels to read as chrome. */}
      <color attach="background" args={[base]} />
      <Lightformer intensity={3} position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[14, 4, 1]} />
      <Lightformer intensity={2.2} color={warm} position={[-6, 0.5, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
      <Lightformer intensity={2.2} color={cool} position={[6, -0.5, 0]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
      <Lightformer intensity={1.2} position={[0, -5, 3]} rotation-x={-Math.PI / 2} scale={[14, 2, 1]} />
      <Lightformer form="ring" intensity={4} position={[2.5, 2.5, 6]} scale={1.6} />
    </Environment>
  )
}

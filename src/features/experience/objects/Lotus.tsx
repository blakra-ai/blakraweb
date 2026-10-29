import { useMemo } from 'react'
import { Euler, Matrix4, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { chakras } from '../tokens'

const petal = (() => {
  // A cupped, pointed petal: a sphere squeezed thin and long, with its base at the origin.
  const g = new SphereGeometry(1, 24, 12)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const along = (x + 1) / 2
    const width = Math.sin(Math.PI * Math.pow(along, 0.8))
    p.setXYZ(i, along * 1.0, y * 0.06 + along * along * 0.28, z * 0.34 * width)
  }
  g.computeVertexNormals()
  return g
})()

/**
 * All of a chakra's petals as one geometry (its rings, each petal turned and sized into place),
 * so a lotus is one draw call, not one per petal: the column stays light whatever the view.
 */
const flowers = new Map<number, BufferGeometry>()
function flower(index: number) {
  let g = flowers.get(index)
  if (g) return g
  const parts: BufferGeometry[] = []
  const m = new Matrix4()
  chakras[index].petals.forEach((n, ring) => {
    const len = 1 - ring * 0.22
    for (let i = 0; i < n; i++) {
      const turn = new Quaternion().setFromEuler(new Euler(0, (i / n) * Math.PI * 2 + ring * 0.2, 0))
      const size = new Vector3(len * (n === 2 ? 1.15 : 1), 1 + ring * 0.3, n === 2 ? 2.4 : n > 12 ? 0.5 : 1)
      parts.push(petal.clone().applyMatrix4(m.compose(new Vector3(), turn, size)))
    }
  })
  g = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  flowers.set(index, g)
  return g
}

/** One chakra as a glossy lotus: rings of petals around a gem. */
export function Lotus({ index }: { index: number }) {
  const c = chakras[index]
  const geometry = useMemo(() => flower(index), [index])
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={c.color} roughness={0.22} metalness={0} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.2, 48, 48]} />
        <meshStandardMaterial color="#ffffff" roughness={0.06} metalness={0} envMapIntensity={1.4} />
      </mesh>
    </group>
  )
}

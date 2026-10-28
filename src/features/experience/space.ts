import { Vector3 } from 'three'

/** The disk's tilt from the screen plane, and the spin axis it implies (the column, the jet). */
export const DISK_TILT = -1.32
export const AXIS = new Vector3(0, -Math.sin(DISK_TILT), Math.cos(DISK_TILT)).normalize()

const c = Math.cos(DISK_TILT)
const s = Math.sin(DISK_TILT)
/** From disk-local coordinates (x, y in the disk, z along the axis) to the world. */
export function fromDisk(x: number, y: number, z: number, out: Vector3) {
  return out.set(x, y * c - z * s, y * s + z * c)
}
/** A point on the spin axis at height h. */
export const onAxis = (h: number, out: Vector3) => out.copy(AXIS).multiplyScalar(h)

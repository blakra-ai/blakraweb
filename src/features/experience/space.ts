import { Vector3 } from 'three'
import { DISK_TILT } from './timeline'

/*
 * One physics for the whole film. Everything that orbits turns in the disk's own sense (from the
 * disk's x toward its y, round the spin axis) at the speed gravity gives its radius: faster near
 * the centre (Kepler). Nothing falls or rises in a straight line: falling is a spiral that keeps
 * turning forward, rising is a helix up the axis. The camera is a satellite that turns the same
 * way (timeline.ts). Nothing flickers or throbs.
 */
export { DISK_TILT }
/** Angular speed of an orbit of radius r (radians a second): the disk's inner edge, scaled by Kepler. */
export const kepler = (r: number) => 0.55 * Math.pow(1.4 / r, 1.5)
/** The spin axis the disk's tilt implies (the column, the jet). */
export const AXIS = new Vector3(0, -Math.sin(DISK_TILT), Math.cos(DISK_TILT)).normalize()

const c = Math.cos(DISK_TILT)
const s = Math.sin(DISK_TILT)
/** From disk-local coordinates (x, y in the disk, z along the axis) to the world. */
export function fromDisk(x: number, y: number, z: number, out: Vector3) {
  return out.set(x, y * c - z * s, y * s + z * c)
}
/** A point on the spin axis at height h. */
export const onAxis = (h: number, out: Vector3) => out.copy(AXIS).multiplyScalar(h)

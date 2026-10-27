import type { Pose } from './stage'

/** What the motion loop hands the 3D world every frame. */
export interface Frame {
  pose: Pose
  /** Per centre, 0 root … 6 crown: light, petal opening, extra light. */
  lit: readonly number[]
  open: readonly number[]
  boost: readonly number[]
  /** How high the light has actually risen (eased), in centres. */
  flow: number
  /** The centre the visitor picked, or -1. */
  focus: number
  /** Hero formation: 0 scattered orbits … 1 one disk. */
  form: number
  /** Pointer in view units and its mass (0 when idle). */
  pointer: readonly [number, number, number]
  time: number
}

export interface EngineRenderer {
  /** True once the shader is compiled and linked. */
  ready(): boolean
  /** Draws a frame; returns false while the shader is still compiling. */
  draw(f: Frame): boolean
  resize(): void
  /** Step render quality: -1 cheaper, +1 richer. Returns false at either end. */
  adjust(step: -1 | 1): boolean
  dispose(): void
}

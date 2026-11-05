import type { Bone, Group, MeshStandardMaterial, Object3D, ShaderMaterial } from 'three'
import glbUrl from '../../../assets/navigator/navigator.glb?url'

/*
 * The Navigator's asset contract: the glTF node names the code relies on, and nothing else.
 * A commissioned model replaces the file and must pass validateNames(); every measurement
 * (height, eye line, mouth) is taken from the loaded bones, never from a constant here.
 */

/** Where the figure's GLB lives (the only constant a model swap changes, with FIGURE_TEXTURES). */
export const GLB_URL: string = glbUrl

/** 'ktx2' once the asset ships compressed textures (the loader then adds KTX2Loader). */
export const FIGURE_TEXTURES: 'none' | 'ktx2' = 'none'

export { CONTRACT, HAIR_BONES, validateNames } from './names'
export type { ContractReport } from './names'

export type FigureBoneName = 'Hips' | 'Spine' | 'Spine1' | 'Spine2' | 'Neck' | 'Head'

/** The loaded figure, resolved by name: what Figure.tsx and the living modules drive. */
export interface Figure {
  root: Group
  bones: Record<FigureBoneName, Bone> & Partial<Record<'Jaw' | 'Ear_L' | 'Ear_R', Bone>>
  eyes: [Object3D, Object3D]
  eyeMats: [ShaderMaterial, ShaderMaterial]
  /** Drivers resolved from lids or morphs: 0 open … 1 closed, 0 shut … 1 open. */
  blink: (closed: number) => void
  jaw: (open: number) => void
  mouth: Object3D
  systems: Object3D[]
  sysMats: MeshStandardMaterial[]
  /** Chain bones; rest points in root space and in the Head bone's space (metres, root at rest); Spine2 in the Head's space. */
  hair: { bones: Bone[][]; rest: Float32Array; restHead: Float32Array; shoulder: [number, number, number] } | null
  /** Measured from the bones at load, in metres. */
  metrics: { height: number; headHeight: number; eyeY: number; mouthY: number; headZ: number }
}

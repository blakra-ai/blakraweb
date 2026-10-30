import type { Material, WebGLProgramParametersWithUniforms } from 'three'

/**
 * The X-ray cursor: a circle on the screen (centre and radius in device pixels). The finished
 * helmet is cut away inside it and its blueprint drawn there instead, so the cursor shows what
 * the Navigator is made of. One uniform object, shared by every material that takes part.
 */
export const lens = { value: [-9999, -9999, 0] as [number, number, number] }

/** Patch a material so its fragments inside (side "out" keeps outside) or outside the lens are dropped. */
export function withLens<M extends Material>(material: M, keep: 'outside' | 'inside'): M {
  const test = keep === 'outside' ? '<' : '>'
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uLens = lens
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uLens;\nvoid main() {')
      .replace('void main() {', `void main() {\n  if (length(gl_FragCoord.xy - uLens.xy) ${test} uLens.z) discard;`)
  }
  material.customProgramCacheKey = () => `lens-${keep}`
  return material
}

/** For a ShaderMaterial written here: the same test as a GLSL snippet. */
export const lensGlsl = (keep: 'outside' | 'inside') => `if (length(gl_FragCoord.xy - uLens.xy) ${keep === 'outside' ? '<' : '>'} uLens.z) discard;`

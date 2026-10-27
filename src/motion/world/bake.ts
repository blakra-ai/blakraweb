import { LinearFilter, LinearMipmapLinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, UnsignedByteType, WebGLRenderTarget, type Texture, type WebGLRenderer } from 'three'
import { HOLE, noise } from './glsl'

/**
 * Procedural detail is rendered once into textures at start, so per frame the disk and
 * the nebula cost a texture read instead of several layers of noise per pixel. This is
 * what keeps scrolling smooth on laptop GPUs.
 */
function bake(renderer: WebGLRenderer, width: number, height: number, fragment: string): WebGLRenderTarget {
  const target = new WebGLRenderTarget(width, height, {
    type: UnsignedByteType,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const material = new ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: fragment,
    depthTest: false,
    depthWrite: false,
  })
  scene.add(new Mesh(geometry, material))
  const previous = renderer.getRenderTarget()
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.setRenderTarget(previous)
  geometry.dispose()
  material.dispose()
  return target
}

export interface Bakes {
  /** Disk turbulence in disk space: R coarse lanes, G fine filaments. Sample at the rotated position. */
  disk: Texture
  /** The nebula, equirectangular. */
  nebula: Texture
  dispose(): void
}

export function createBakes(renderer: WebGLRenderer): Bakes {
  const out = HOLE.diskOut.toFixed(3)
  const disk = bake(
    renderer,
    1024,
    1024,
    /* glsl */ `
      varying vec2 vUv;
      ${noise}
      void main() {
        vec2 q = (vUv - 0.5) * 2.0 * ${out};
        float r = length(q);
        float n = fbm(q * 2.4 + vec2(r * 3.1, 0.0));
        float fine = fbm(q * 7.0 - vec2(0.0, r * 5.0));
        gl_FragColor = vec4(n, fine, 0.0, 1.0);
      }`,
  )
  const nebula = bake(
    renderer,
    1024,
    512,
    /* glsl */ `
      varying vec2 vUv;
      ${noise}
      void main() {
        float lon = (vUv.x - 0.5) * 6.2831853;
        float lat = (vUv.y - 0.5) * 3.1415927;
        vec3 d = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
        float n = fbm(d.xy * 2.2 + d.z * 1.3);
        float m = fbm(d.zy * 3.1 - 4.0);
        vec3 col = vec3(0.05, 0.035, 0.06) * smoothstep(0.45, 0.9, n) + vec3(0.02, 0.025, 0.05) * smoothstep(0.5, 0.95, m);
        gl_FragColor = vec4(col * 4.0, 1.0);
      }`,
  )
  return {
    disk: disk.texture,
    nebula: nebula.texture,
    dispose() {
      disk.dispose()
      nebula.dispose()
    },
  }
}

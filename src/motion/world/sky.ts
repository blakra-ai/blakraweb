import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Mesh, Points, ShaderMaterial, SphereGeometry, type Texture } from 'three'

/** A deterministic random sequence, so the sky is the same on every visit. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stars and a faint nebula, far away and behind everything: the lensed background. */
export function createSky(nebulaMap: Texture): { stars: Points; nebula: Mesh; setPixel(ratio: number): void; dispose(): void } {
  const rand = seeded(7)
  const count = 5200
  const pos = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const tint = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1
    const t = rand() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    pos.set([r * Math.cos(t) * 600, u * 600, r * Math.sin(t) * 600], i * 3)
    // Mostly faint stars, a few bright ones.
    size[i] = 0.7 + Math.pow(rand(), 9) * 3.4
    tint[i] = rand()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(pos, 3))
  geometry.setAttribute('aSize', new BufferAttribute(size, 1))
  geometry.setAttribute('aTint', new BufferAttribute(tint, 1))
  const material = new ShaderMaterial({
    uniforms: { uPixel: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aTint;
      uniform float uPixel;
      varying float vTint;
      varying float vSize;
      void main() {
        vTint = aTint;
        vSize = aSize;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * 2.2 * uPixel;
      }`,
    fragmentShader: /* glsl */ `
      varying float vTint;
      varying float vSize;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = exp(-dot(c, c) * 18.0);
        vec3 col = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.85, 0.7), vTint);
        gl_FragColor = vec4(col * a * (0.35 + vSize * 0.5), 1.0);
      }`,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  })
  const stars = new Points(geometry, material)
  stars.frustumCulled = false

  const nebulaGeometry = new SphereGeometry(800, 48, 24)
  const nebulaMaterial = new ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    uniforms: { uMap: { value: nebulaMap } },
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);
        gl_FragColor = vec4(texture2D(uMap, uv).rgb * 0.25, 1.0);
      }`,
    side: BackSide,
    depthWrite: false,
  })
  const nebula = new Mesh(nebulaGeometry, nebulaMaterial)
  nebula.frustumCulled = false
  return {
    stars,
    nebula,
    setPixel(ratio) {
      material.uniforms.uPixel.value = ratio
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      nebulaGeometry.dispose()
      nebulaMaterial.dispose()
    },
  }
}

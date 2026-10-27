import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, Vector3 } from 'three'
import { seeded } from './sky'

/**
 * Scattered work: fragments on tilted, crossing orbits. As the hero forms, the tilts fall
 * to zero and the fragments flatten into the disk's plane: one centre pulls everything
 * into order. Drawn twice, like the disk, so the fragments behind the hole are lensed.
 */
const ORBITS = 9
const PER_ORBIT = 520

export interface Debris {
  far: Points
  near: Points
  update(time: number, tilt: number, weight: number, cam: Vector3, pixel: number): void
  dispose(): void
}

export function createDebris(): Debris {
  const rand = seeded(23)
  const count = ORBITS * PER_ORBIT
  const radius = new Float32Array(count)
  const phase = new Float32Array(count)
  const orbit = new Float32Array(count * 3)
  const size = new Float32Array(count)
  for (let o = 0; o < ORBITS; o++) {
    const R = 2.8 + o * 0.62 + rand() * 0.25
    const inc = (0.35 + 0.85 * rand()) * (rand() > 0.5 ? 1 : -1)
    const node = rand() * Math.PI * 2
    // Fragments come in clumps along the orbit, like pieces of work that travel together.
    let clump = rand() * Math.PI * 2
    for (let i = 0; i < PER_ORBIT; i++) {
      const k = o * PER_ORBIT + i
      if (i % 26 === 0) clump = rand() * Math.PI * 2
      radius[k] = R + (rand() - 0.5) * 0.12
      phase[k] = clump + (rand() - 0.5) * 0.35
      orbit.set([inc, node, 0.6 + rand() * 0.8], k * 3)
      size[k] = 0.6 + Math.pow(rand(), 4) * 2.4
    }
  }
  const geometry = new BufferGeometry()
  // Positions are computed in the shader; the attribute only sizes the draw.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aRadius', new BufferAttribute(radius, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phase, 1))
  geometry.setAttribute('aOrbit', new BufferAttribute(orbit, 3))
  geometry.setAttribute('aSize', new BufferAttribute(size, 1))

  const make = (side: number) => {
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTilt: { value: 1 }, uWeight: { value: 1 }, uSide: { value: side }, uCam: { value: new Vector3() }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aRadius;
        attribute float aPhase;
        attribute vec3 aOrbit;
        attribute float aSize;
        uniform float uTime;
        uniform float uTilt;
        uniform float uSide;
        uniform vec3 uCam;
        uniform float uPixel;
        varying float vGlow;
        void main() {
          float inc = aOrbit.x * uTilt;
          float node = aOrbit.y;
          float th = aPhase + uTime * 2.2 * pow(aRadius, -1.5) * aOrbit.z;
          vec3 u = vec3(cos(node), 0.0, sin(node));
          vec3 n = vec3(-u.z * sin(inc), cos(inc), u.x * sin(inc));
          vec3 v = cross(n, u);
          vec3 p = aRadius * (cos(th) * u + sin(th) * v);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float behind = dot(p, -normalize(uCam));
          vGlow = aSize;
          gl_PointSize = (behind * uSide < 0.0) ? 0.0 : aSize * 22.0 * uPixel / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uWeight;
        varying float vGlow;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float a = exp(-dot(c, c) * 14.0);
          gl_FragColor = vec4(vec3(1.0, 0.86, 0.7) * a * (0.5 + vGlow) * 1.6 * uWeight, 1.0);
        }`,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
    const points = new Points(geometry, material)
    points.frustumCulled = false
    return points
  }
  const far = make(1)
  const near = make(-1)
  return {
    far,
    near,
    update(time, tilt, weight, cam, pixel) {
      for (const p of [far, near]) {
        const u = (p.material as ShaderMaterial).uniforms
        u.uTime.value = time
        u.uTilt.value = tilt
        u.uWeight.value = weight
        u.uCam.value.copy(cam)
        u.uPixel.value = pixel
        p.visible = weight > 0.003
      }
    },
    dispose() {
      geometry.dispose()
      ;(far.material as ShaderMaterial).dispose()
      ;(near.material as ShaderMaterial).dispose()
    },
  }
}

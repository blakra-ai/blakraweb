import { AdditiveBlending, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'

/**
 * The relativistic jet: the black hole's most powerful output, launched along its spin
 * axis, the same axis that carries the seven centres. Bright knots ride it outward (the
 * products); fainter emission streams between them. Drawn on a plane that turns to face
 * the camera, which reads as a volume of light at a fraction of the cost.
 */
const BASE = 1.4
const HEIGHT = 42
const WIDTH = 7

export function createJets() {
  const geometry = new PlaneGeometry(1, 1)
  const material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uShow: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uShow;
      varying vec2 vUv;
      const float HEIGHT = ${HEIGHT.toFixed(1)};
      const float WIDTH = ${WIDTH.toFixed(1)};
      void main() {
        float y = vUv.y * HEIGHT;
        float x = (vUv.x - 0.5) * WIDTH;
        // Collimated: narrow at the base, opening slowly with height.
        float w = 0.12 + y * 0.035;
        float core = exp(-x * x / (w * w));
        float halo = exp(-x * x / (w * w * 9.0)) * 0.25;
        // Emission streaming outward.
        float stream = 0.55 + 0.45 * sin(y * 1.6 - uTime * 3.2) * sin(y * 0.37 - uTime * 1.1);
        // Four knots: the products, carried by the same engine.
        float knots = 0.0;
        for (int i = 0; i < 4; i++) {
          float ky = 5.0 + float(i) * 6.5;
          knots += exp(-pow((y - ky) / (0.55 + float(i) * 0.1), 2.0)) * exp(-x * x / (w * w * 1.6)) * 2.6;
        }
        float fade = smoothstep(0.0, 1.2, y) * (1.0 - smoothstep(HEIGHT * 0.55, HEIGHT, y));
        vec3 col = mix(vec3(0.62, 0.74, 1.0), vec3(0.85, 0.8, 1.0), vUv.y) * ((core + halo) * stream * 0.9 + knots) * fade * uShow;
        gl_FragColor = vec4(col, 1.0);
      }`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
  const mesh = new Mesh(geometry, material)
  mesh.scale.set(WIDTH, HEIGHT, 1)
  mesh.position.y = BASE + HEIGHT / 2
  mesh.frustumCulled = false
  return {
    mesh,
    update(time: number, show: number, cam: Vector3) {
      mesh.visible = show > 0.003
      if (!mesh.visible) return
      // Turn around the axis to face the camera.
      mesh.rotation.y = Math.atan2(cam.x, cam.z)
      material.uniforms.uTime.value = time
      material.uniforms.uShow.value = show
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

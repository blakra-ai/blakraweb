import { AdditiveBlending, CatmullRomCurve3, Mesh, ShaderMaterial, TubeGeometry, Vector3 } from 'three'

/**
 * How a project runs: a request falls toward the core and is stretched, by tidal forces,
 * from something vague into one exact line. Three brighter segments are the three steps.
 * The scroll draws it in, from the outer end to the disk.
 */
export function createInfall() {
  const points: Vector3[] = []
  const turns = 1.6
  for (let i = 0; i <= 80; i++) {
    const t = i / 80
    const a = 0.9 + t * turns * Math.PI * 2
    const r = 15 - 12.2 * Math.pow(t, 0.8)
    points.push(new Vector3(Math.cos(a) * r, 1.6 * (1 - t) * (1 - t), Math.sin(a) * r))
  }
  const curve = new CatmullRomCurve3(points)
  const geometry = new TubeGeometry(curve, 480, 0.03, 6, false)
  const material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDraw: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDraw;
      varying vec2 vUv;
      float band(float u, float a, float b) { return smoothstep(a, a + 0.02, u) * (1.0 - smoothstep(b - 0.02, b, u)); }
      void main() {
        float u = vUv.x;
        if (u > uDraw) discard;
        // Vague at the outer end, exact toward the core: the line tightens and brightens.
        float steps = band(u, 0.18, 0.34) + band(u, 0.46, 0.62) + band(u, 0.74, 0.9);
        float flow = 0.6 + 0.4 * sin(u * 90.0 - uTime * 4.0);
        float head = exp(-pow((uDraw - u) * 40.0, 2.0)) * 3.0;
        vec3 col = mix(vec3(0.75, 0.62, 0.5), vec3(1.0, 0.92, 0.82), u) * (0.25 + 1.6 * steps) * flow + vec3(1.0, 0.95, 0.88) * head;
        gl_FragColor = vec4(col * smoothstep(0.0, 0.05, u), 1.0);
      }`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  return {
    mesh,
    update(time: number, draw: number) {
      mesh.visible = draw > 0.003
      material.uniforms.uTime.value = time
      material.uniforms.uDraw.value = draw
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

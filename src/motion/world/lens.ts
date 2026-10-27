import { ShaderMaterial, Vector2, Vector3 } from 'three'

/**
 * Gravitational lensing as a screen-space pass over the layer behind the hole.
 * A point lens maps the image at distance r from the hole to the source at
 * r − θE²/r: far away the sky barely moves; near the hole the region right behind it
 * is stretched into a ring, which is how the far side of the disk arches over and
 * under the shadow. Then the shadow itself, and the thin photon ring at its edge.
 * Much cheaper than integrating every ray, so it holds the frame rate on laptop GPUs.
 */
export function createLensMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      inputBuffer: { value: null },
      uCenter: { value: new Vector2(0.5, 0.5) },
      uAspect: { value: 1 },
      uShadow: { value: 0.05 },
      uEinstein: { value: 0.065 },
      uVisible: { value: 1 },
      uPointer: { value: new Vector3() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D inputBuffer;
      uniform vec2 uCenter;
      uniform float uAspect;
      uniform float uShadow;
      uniform float uEinstein;
      uniform float uVisible;
      uniform vec3 uPointer;
      varying vec2 vUv;
      void main() {
        // The visitor's pointer is a small mass too: the stars bend around it.
        vec2 dp = vUv - uPointer.xy;
        dp.x *= uAspect;
        float rp2 = max(dot(dp, dp), 1e-5);
        vec2 bend = dp / rp2 * 0.00018 * uPointer.z;
        bend.x /= uAspect;
        vec2 uv0 = vUv - bend;
        vec2 d = uv0 - uCenter;
        d.x *= uAspect;
        float r = length(d);
        vec2 dir = d / max(r, 1e-5);
        float source = r - uEinstein * uEinstein / max(r, 1e-4) * uVisible;
        vec2 s = dir * source;
        s.x /= uAspect;
        vec3 col = texture2D(inputBuffer, clamp(uCenter + s, 0.0, 1.0)).rgb;
        float edge = uShadow * 0.012 + 0.0008;
        col *= mix(1.0, smoothstep(uShadow - edge, uShadow + edge, r), uVisible);
        // The photon ring: a hair-thin line of light that has circled the hole.
        float ring = exp(-pow((r - uShadow * 1.02) / (uShadow * 0.006 + 0.0005), 2.0));
        col += vec3(1.0, 0.88, 0.74) * ring * 0.14 * uVisible;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  })
}

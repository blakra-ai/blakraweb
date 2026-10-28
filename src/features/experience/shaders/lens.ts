/**
 * Gravitational lensing of the wordmark behind the hole: each point of the image is drawn
 * from where the lens equation says its light started (beta = theta - thetaE^2 / theta), so
 * the letters bend around the shadow and close into an Einstein ring when they line up.
 */
export const lensVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const lensFragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uHole;
uniform float uEinstein;
uniform float uAspect;
uniform vec3 uInk;
uniform float uPull;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  vec2 d = vUv - uHole;
  d.x *= uAspect;
  float r2 = max(dot(d, d), 1e-6);
  vec2 src = d * (1.0 - uEinstein * uEinstein / r2);
  // Falling in: the letters are drawn toward the hole and wound around it, tighter near it
  // (stretched along the fall, squeezed across it), until they spiral into the disk.
  float r = sqrt(r2);
  float swirl = uPull * 2.6 / (r * 5.0 + 0.25);
  float c = cos(swirl), s = sin(swirl);
  src = mat2(c, -s, s, c) * src;
  src *= 1.0 + uPull * (1.2 + 0.35 / (r + 0.05));
  src.x /= uAspect;
  vec2 suv = uHole + src;
  float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
  float ink = texture2D(uMap, suv).a * inside;
  gl_FragColor = vec4(uInk, ink * uAlpha);
}
`

import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, Group, Mesh, RingGeometry, ShaderMaterial, Vector3 } from 'three'
import { chakraY } from '../engine3d/stage'
import { CENTRE_COLORS, createLotus, type Lotus } from './lotus'

/**
 * The seven centres on the black hole's spin axis, root to crown, with the channel of
 * light that rises through them and the seven bands that lift off the disk to become
 * their dials. Everything here is in front of the hole, so it is never lensed.
 */
export const LOTUS_SCALE = 1.15

/** The dial radius every band shrinks to, in world units. */
const DIAL = 0.7 * LOTUS_SCALE

export interface ColumnState {
  lit: readonly number[]
  open: readonly number[]
  boost: readonly number[]
  flow: number
  focus: number
  lift: number
  column: number
  time: number
  cam: Vector3
}

export function createColumn() {
  const group = new Group()
  const lotuses: Lotus[] = []
  for (let k = 0; k < 7; k++) {
    const lotus = createLotus(k, LOTUS_SCALE)
    lotus.group.position.y = chakraY(k)
    group.add(lotus.group)
    lotuses.push(lotus)
  }

  // The channel: light rising along the axis, as high as the flow has reached.
  const bottom = chakraY(0) - 0.3
  const top = -1.0
  const channelGeometry = new CylinderGeometry(0.022, 0.022, top - bottom, 10, 1, true)
  const channelMaterial = new ShaderMaterial({
    uniforms: { uFlow: { value: 0 }, uTime: { value: 0 }, uFade: { value: 1 }, uColors: { value: CENTRE_COLORS.map((c) => new Color().setRGB(c[0], c[1], c[2])) } },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() { vY = (modelMatrix * vec4(position, 1.0)).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uFlow;
      uniform float uTime;
      uniform float uFade;
      uniform vec3 uColors[7];
      varying float vY;
      void main() {
        float fi = (vY - (${chakraY(0).toFixed(3)})) / 2.0;
        int k = int(clamp(floor(fi + 0.5), 0.0, 6.0));
        float reach = smoothstep(uFlow + 0.12, uFlow - 0.12, fi);
        float head = exp(-pow((fi - uFlow) * 2.0, 2.0) * 5.0) * step(0.02, uFlow) * step(uFlow, 6.9);
        float pulse = 0.6 + 0.4 * sin(vY * 4.0 - uTime * 2.4);
        gl_FragColor = vec4(uColors[k] * (reach * pulse * 1.4 + 0.05 + head * 4.0) * uFade, 1.0);
      }`,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  })
  const channel = new Mesh(channelGeometry, channelMaterial)
  channel.position.y = (top + bottom) / 2
  group.add(channel)

  // Seven bands that rise out of the disk and slide down the axis. A soft glow across
  // the ring's width (not a hard line) keeps them smooth at any size; their far half is
  // dimmed, since it passes behind the axis and the hole.
  const bandGeometry = new RingGeometry(0.94, 1.06, 256)
  const bands = CENTRE_COLORS.map((c) => {
    const material = new ShaderMaterial({
      uniforms: { uColor: { value: new Color().setRGB(c[0], c[1], c[2]) }, uStrength: { value: 2.4 }, uWidth: { value: 0.012 }, uCam: { value: new Vector3() } },
      vertexShader: /* glsl */ `
        varying vec2 vLocal;
        varying vec3 vWorld;
        void main() {
          vLocal = position.xy;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uStrength;
        uniform float uWidth;
        uniform vec3 uCam;
        varying vec2 vLocal;
        varying vec3 vWorld;
        void main() {
          float d = (length(vLocal) - 1.0) / uWidth;
          float glow = exp(-d * d) + 0.25 * exp(-d * d * 0.08);
          vec3 toCam = normalize(vec3(uCam.x, 0.0, uCam.z));
          float near = 0.25 + 0.75 * smoothstep(-0.4, 0.4, dot(normalize(vec3(vWorld.x, 0.0, vWorld.z)), toCam));
          gl_FragColor = vec4(uColor * glow * uStrength * near, 1.0);
        }`,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })
    const mesh = new Mesh(bandGeometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.frustumCulled = false
    return { mesh, material }
  })
  const bandGroup = new Group()
  bands.forEach((b) => bandGroup.add(b.mesh))

  return {
    group,
    /** The bands travel from the disk (outside the column's group, so they can start at the hole). */
    bands: bandGroup,
    update(s: ColumnState) {
      group.visible = s.column > 0.01
      for (let k = 0; k < 7; k++) {
        const focus = Math.abs(k - s.focus) < 0.5 ? 1 : 0
        lotuses[k].update(s.open[k], s.lit[k], s.boost[k], s.column, focus, s.time)
      }
      channelMaterial.uniforms.uFlow.value = s.flow
      channelMaterial.uniforms.uTime.value = s.time
      channelMaterial.uniforms.uFade.value = s.column
      const moving = s.lift > 0.001 && s.lift < 0.999
      bandGroup.visible = moving
      if (!moving) return
      for (let k = 0; k < 7; k++) {
        const t = Math.min(1, Math.max(0, s.lift * 1.75 - (6 - k) * 0.125))
        const e = t * t * (3 - 2 * t)
        const from = 6.0 + (2.6 - 6.0) * (k / 6)
        const r = from + (DIAL - from) * e
        const b = bands[k]
        b.mesh.position.y = (chakraY(k) - 0.017 * LOTUS_SCALE) * e
        b.mesh.scale.setScalar(r)
        const u = b.material.uniforms
        u.uStrength.value = 2.4 * (1 - 0.6 * Math.max(0, (e - 0.85) / 0.15))
        // Keep the visible line about the same width on screen as the ring shrinks.
        u.uWidth.value = Math.min(0.045, 0.012 * (6 / Math.max(r, 0.5)) ** 0.5)
        u.uCam.value.copy(s.cam)
      }
    },
    dispose() {
      lotuses.forEach((l) => l.dispose())
      channelGeometry.dispose()
      channelMaterial.dispose()
      bandGeometry.dispose()
      bands.forEach((b) => b.material.dispose())
    },
  }
}

import { CanvasTexture, RepeatWrapping, SphereGeometry, SRGBColorSpace, Vector2, Vector3 } from 'three'
import { yantra, CHAKRAS } from './yantra'

/*
 * The Navigator's parts, as geometry and texture built once: his fins, the skins of his head and
 * collar, and the soft glow behind every light. Everything here is drawn in code; no asset.
 */

/**
 * A comms fin: swept back like an elf's ear. A sphere drawn out into a leaf, full at a third of
 * its height and drawn to a point at the tip, thin across, and bent back as it rises. Base at
 * the origin, tip at about y = 1.
 */
export function finGeometry(width = 0.5, height = 1.0, thickness = 0.12) {
  const g = new SphereGeometry(1, 48, 32)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const u = (y + 1) / 2 // 0 at the base, 1 at the tip
    const w = Math.sin(Math.PI * Math.pow(u, 0.62)) // full low, pointed at the tip
    p.setXYZ(i, x * (width / 2) * w, u * height, z * (thickness / 2) * (0.6 + 0.4 * w) - u * u * 0.42)
  }
  g.computeVertexNormals()
  return g
}

/** The collar's band: the seven yantras engraved between lines of guilloché, on brushed metal. */
export function collarTexture() {
  const W = 2048
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#cfccc5')
  grad.addColorStop(0.5, '#e7e4de')
  grad.addColorStop(1, '#c4c1ba')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 1400; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.02})`
    g.beginPath()
    const y = Math.random() * H
    g.moveTo(0, y)
    g.lineTo(W, y + (Math.random() - 0.5) * 2)
    g.stroke()
  }
  const band = { top: H * 0.3, bottom: H * 0.7 }
  g.strokeStyle = 'rgba(20,20,26,0.55)'
  g.lineWidth = 2
  for (let w = 0; w < 9; w++) {
    g.beginPath()
    for (let x = 0; x <= W; x += 4) {
      const y = (band.top + band.bottom) / 2 + Math.sin((x / W) * Math.PI * 2 * 21 + w * 0.7) * (band.bottom - band.top) * 0.42 * (0.4 + 0.6 * Math.abs(Math.sin(w + 1)))
      if (x === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.globalAlpha = 0.18
    g.stroke()
  }
  g.globalAlpha = 1
  g.lineWidth = 3
  g.strokeStyle = 'rgba(20,20,26,0.75)'
  g.beginPath()
  g.moveTo(0, band.top)
  g.lineTo(W, band.top)
  g.moveTo(0, band.bottom)
  g.lineTo(W, band.bottom)
  g.stroke()
  const R = (band.bottom - band.top) * 0.62
  for (let k = 0; k < 7; k++) {
    const cx = ((k + 0.5) / 7) * W
    const cy = (band.top + band.bottom) / 2
    g.fillStyle = '#ebe8e2'
    g.beginPath()
    g.arc(cx, cy, R * 1.12, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(20,20,26,0.85)'
    g.lineWidth = 2.2
    for (const line of yantra(k)) {
      g.beginPath()
      line.forEach(([x, y], i) => (i ? g.lineTo(cx + x * R, cy - y * R) : g.moveTo(cx + x * R, cy - y * R)))
      g.stroke()
    }
    g.fillStyle = CHAKRAS[k].color
    g.beginPath()
    g.arc(cx, cy, R * 0.09, 0, Math.PI * 2)
    g.fill()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = RepeatWrapping
  t.anisotropy = 8
  return t
}

/**
 * The head's skin: ceramic with its panel seams (two meridians either side, a ring under the
 * crown and one above the collar, fine dark lines with bolts along the lower one) and the mark
 * on the forehead. The front (u = 0.5) is seamless for the visor.
 */
export function shellTexture() {
  const W = 2048
  const H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#f3f1ec'
  g.fillRect(0, 0, W, H)
  // A faint micro-grain, so the ceramic is not plastic.
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = `rgba(20,20,26,${0.01 + Math.random() * 0.02})`
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2)
  }
  g.strokeStyle = 'rgba(30,30,38,0.3)'
  g.lineWidth = 3
  for (const u of [0.0, 0.22, 0.78]) {
    g.beginPath()
    g.moveTo(u * W, H * 0.08)
    g.lineTo(u * W, H * 0.88)
    g.stroke()
  }
  for (const v of [0.17, 0.82]) {
    g.beginPath()
    g.moveTo(0, v * H)
    g.lineTo(W, v * H)
    g.stroke()
  }
  for (let i = 0; i < 16; i++) {
    const x = ((i + 0.5) / 16) * W
    g.fillStyle = 'rgba(30,30,38,0.55)'
    g.beginPath()
    g.arc(x, H * 0.82, 7, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#f3f1ec'
    g.beginPath()
    g.arc(x, H * 0.82, 3, 0, Math.PI * 2)
    g.fill()
  }
  // The mark on the forehead.
  const cx = W * 0.5
  const cy = H * 0.22
  const s = 6.5
  g.strokeStyle = 'rgba(11,11,16,0.55)'
  g.lineWidth = 1.1 * s
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - 9.8 * s, cy + 1.2 * s)
  g.bezierCurveTo(cx - 7.4 * s, cy - 3.8 * s, cx + 7.4 * s, cy - 3.8 * s, cx + 9.8 * s, cy + 1.2 * s)
  g.stroke()
  g.fillStyle = '#0b0b10'
  g.beginPath()
  g.arc(cx, cy, 4.3 * s, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#f3f1ec'
  g.beginPath()
  g.arc(cx, cy, 2.9 * s, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#ff5a1f'
  g.lineWidth = 1.5 * s
  g.beginPath()
  g.moveTo(cx - 11 * s, cy + 1.6 * s)
  g.bezierCurveTo(cx - 8 * s, cy + 4.6 * s, cx + 8 * s, cy + 4.6 * s, cx + 11 * s, cy + 1.6 * s)
  g.stroke()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** A soft round glow, for the sprite behind each light. */
export function glowTexture() {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** The collar's profile (radius, height above its seat). */
export const COLLAR = [
  [0.6, 0.18],
  [0.8, 0.15],
  [0.885, 0.06],
  [0.9, -0.05],
  [0.875, -0.16],
  [0.78, -0.23],
  [0.6, -0.24],
].map(([r, y]) => new Vector2(r, y))

/** The torso's profile, base to shoulders: the waist drawn in, the chest full, the shoulders rounded. */
export const TORSO = [
  [0.0, -3.0],
  [0.36, -2.96],
  [0.64, -2.74],
  [0.84, -2.42],
  [0.98, -2.06],
  [1.05, -1.72],
  [0.97, -1.46],
  [0.64, -1.3],
  [0.0, -1.3],
].map(([r, y]) => new Vector2(r, y))

/** Where each subsystem sits on the figure (local coordinates): its light, and its callout. */
export const SUBSYSTEMS: Vector3[] = [
  new Vector3(-0.62, -2.3, -0.85), // root: the power tanks, on the back
  new Vector3(0.9, -2.45, 0.1), // sacral: the coolant ring, round the waist
  new Vector3(0.26, -2.14, 1.0), // solar plexus: the control unit, on the chest
  new Vector3(0, -1.72, 1.08), // heart: the core window
  new Vector3(1.78, 1.05, -0.45), // throat: a comms fin's tip
  new Vector3(-0.66, 0.6, 0.66), // third eye: a lamp
  new Vector3(-0.42, 1.62, -0.28), // crown: the antenna tip
]
/** How far each part travels in the exploded view (local units): the head's parts up, the body's down. */
export const EXPLODE: Vector3[] = [
  new Vector3(0, -1.3, -0.5),
  new Vector3(0, -1.0, 0.3),
  new Vector3(0, -0.5, 0.8),
  new Vector3(0, -0.1, 1.1),
  new Vector3(0, 0.6, 0),
  new Vector3(0, 1.05, 0.4),
  new Vector3(-0.2, 1.55, -0.15),
]
export const EXPLODE_SHELL = new Vector3(0, 0.35, 0)
export const EXPLODE_COLLAR = new Vector3(0, -0.3, 0)
export const EXPLODE_TORSO = new Vector3(0, -0.75, 0)
/** How far (px) each callout's label sits above (−) or below (+) its point, so neighbours never overlap. */
export const LABEL_DY = [0, 24, -22, -4, 0, 0, 0]
/** Each part's resting place (the group's origin), so the exploded offset adds to it. */
export const PART_BASE: Vector3[] = [
  new Vector3(0, -1.9, -0.92),
  new Vector3(0, -2.45, 0),
  new Vector3(0, -2.14, 0.9),
  new Vector3(0, -1.72, 0.96),
  new Vector3(0, 0.3, -0.1),
  new Vector3(0, 0.6, 0),
  new Vector3(-0.42, 0.95, -0.27),
]

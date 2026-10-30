import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { yantra, CHAKRAS } from './yantra'

/*
 * What the Navigator's figure still draws in code: the collar's band texture, the soft glow
 * behind every light, and the callouts' label offsets. The figure itself comes from her GLB
 * (figure/loadFigure.ts); the placeholder script carries its own geometry helpers.
 */

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

/** How far (px) each callout's label sits above (−) or below (+) its point, so neighbours never overlap. */
export const LABEL_DY = [0, 24, -22, -4, 0, 0, 0]

/*
 * The AI hologram, pure: how the avatar's picture is turned into light. Everything here is a
 * function of the clock and a random source, so the rules are testable; player.ts owns the video
 * and the canvas and only applies them.
 *
 * The layers, drawn over the avatar's own pixels (source-atop, so nothing is painted outside her):
 * a gold rim from the sides, 3 px scanlines, one slow gold band travelling down, now and then a
 * horizontal slice shifted sideways (a glitch), and below 62 % of her height she dissolves into
 * horizontal data lines (destination-out). Reduced motion: one still frame, no glitch, the band parked.
 */

export const AVATAR_W = 480
export const AVATAR_H = 860
/** Her pixel aspect (w / h). */
export const AVATAR_ASPECT = AVATAR_W / AVATAR_H
/** Eyes (sunglasses) in the picture, as fractions of its width and height: what the world places. */
export const AVATAR_EYES = { x: 0.506, y: 0.158 } as const
/** The body dissolves into data lines from this share of her height. */
export const DISSOLVE_FROM = 0.62
/** The glitch's chance per painted frame. */
export const GLITCH_RATE = 0.03
/** The travelling band: share of her height per second, its half height in px. */
export const BAND_SPEED = 0.25
export const BAND_HALF = 40
/** The still's band is parked off the picture (above it): a frozen band would read as a smear. */
export const BAND_STILL = -0.2

export interface HoloFrame {
  /** A slice shifted sideways: top y, height and x offset in px; null on most frames. */
  glitch: { y: number; h: number; dx: number } | null
  /** The band's centre y in px (it enters above the top and leaves below the bottom). */
  bandY: number
}

/** What this frame's effects are, for a clock `t` (s), her height `h` px and a random source in [0, 1). */
export function holoFrame(t: number, h: number, rnd: () => number, still: boolean): HoloFrame {
  if (still) return { glitch: null, bandY: BAND_STILL * h }
  const bandY = (((t * BAND_SPEED) % 1.3) - 0.15) * h
  if (rnd() >= GLITCH_RATE) return { glitch: null, bandY }
  const y = rnd() * h * 0.8
  return { glitch: { y, h: 8 + rnd() * 30, dx: (rnd() - 0.5) * 16 }, bandY }
}

/** Whether the data line at row `y` (of h) is cut by the dissolve: more rows go the lower it is. */
export function dissolveRow(y: number, h: number, r: number): boolean {
  return y > h * (DISSOLVE_FROM - 0.02) && r < (y / h - (DISSOLVE_FROM - 0.02)) * 2.5
}

/** A seeded source for the still (the same dissolve every time). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Safari and every iOS browser (WebKit) decode VP9 without its alpha channel: they get the stacked H.264. */
export function needsStackedVideo(ua: string): boolean {
  const webkit = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Android|OPR/.test(ua)
  return webkit || /iPhone|iPad|iPod/.test(ua)
}

type Ctx = CanvasRenderingContext2D

/** Draws `source` (the avatar, AVATAR_W × AVATAR_H, transparent around her) and her hologram layers onto `x`. */
export function paintHolo(x: Ctx, source: CanvasImageSource, f: HoloFrame, rnd: () => number): void {
  const w = AVATAR_W
  const h = AVATAR_H
  x.globalCompositeOperation = 'source-over'
  x.clearRect(0, 0, w, h)
  x.drawImage(source, 0, 0, w, h)
  if (f.glitch) x.drawImage(source, 0, f.glitch.y, w, f.glitch.h, f.glitch.dx, f.glitch.y, w, f.glitch.h)
  x.globalCompositeOperation = 'source-atop'
  // The gold rim from behind, at both sides.
  const rim = x.createLinearGradient(0, 0, w, 0)
  rim.addColorStop(0, '#f3d27a55')
  rim.addColorStop(0.25, '#f3d27a00')
  rim.addColorStop(0.75, '#f3d27a00')
  rim.addColorStop(1, '#f3d27a55')
  x.fillStyle = rim
  x.fillRect(0, 0, w, h)
  // Scanlines.
  x.fillStyle = '#00000030'
  for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1)
  // The band.
  const band = x.createLinearGradient(0, f.bandY - BAND_HALF, 0, f.bandY + BAND_HALF)
  band.addColorStop(0, '#f3d27a00')
  band.addColorStop(0.5, '#f3d27a40')
  band.addColorStop(1, '#f3d27a00')
  x.fillStyle = band
  x.fillRect(0, f.bandY - BAND_HALF, w, 2 * BAND_HALF)
  // The legs dissolve into data.
  x.globalCompositeOperation = 'destination-out'
  const fade = x.createLinearGradient(0, h * DISSOLVE_FROM, 0, h)
  fade.addColorStop(0, '#00000000')
  fade.addColorStop(1, '#000000ff')
  x.fillStyle = fade
  x.fillRect(0, h * DISSOLVE_FROM, w, h)
  for (let y = h * (DISSOLVE_FROM - 0.02); y < h; y += 4) if (dissolveRow(y, h, rnd())) x.fillRect(0, y, w, 2)
  x.globalCompositeOperation = 'source-over'
}

/**
 * The stacked video's two halves (colour over black on top, alpha as grey below; both AVATAR_H
 * tall) into straight RGBA, in place in `color` (its premultiplied rgb is divided by the alpha).
 */
export function restoreAlpha(color: Uint8ClampedArray, alpha: Uint8ClampedArray): void {
  for (let i = 0; i < color.length; i += 4) {
    // Limited-range grey (16 … 235) decoded by the browser arrives as 0 … 255 already.
    const a = alpha[i]
    if (a < 6) {
      color[i] = color[i + 1] = color[i + 2] = color[i + 3] = 0
      continue
    }
    const k = 255 / a
    color[i] = Math.min(255, color[i] * k)
    color[i + 1] = Math.min(255, color[i + 1] * k)
    color[i + 2] = Math.min(255, color[i + 2] * k)
    color[i + 3] = a
  }
}

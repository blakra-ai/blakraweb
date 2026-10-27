import { add, hex, luminance, mix, type RGB } from '../../lib/color'

/**
 * The light of one working day. Each section of the page holds one sky; the
 * hour interstitials blend between neighbours while they cover the viewport.
 * The same values drive the WebGL shader and the CSS fallback, so the page
 * looks the same with or without WebGL.
 */
export type SkyId = 'predawn' | 'dawn' | 'morning' | 'noon' | 'golden' | 'night' | 'ink'

export interface Sky {
  top: string
  bottom: string
  /** Light source colour, position in uv (0,0 bottom-left), falloff size and strength. */
  glow: string
  glowPos: readonly [number, number]
  glowSize: number
  glowStrength: number
  tone: 'dark' | 'light'
}

export const skies: Record<SkyId, Sky> = {
  predawn: { top: '#05060a', bottom: '#0d111c', glow: '#3a4f86', glowPos: [0.5, -0.35], glowSize: 0.3, glowStrength: 0.22, tone: 'dark' },
  dawn: { top: '#0c0b13', bottom: '#24161c', glow: '#ff7a45', glowPos: [0.78, -0.3], glowSize: 0.2, glowStrength: 0.24, tone: 'dark' },
  morning: { top: '#d6e0e4', bottom: '#f1eee7', glow: '#ffffff', glowPos: [0.82, 1.1], glowSize: 0.35, glowStrength: 0.3, tone: 'light' },
  noon: { top: '#ecefed', bottom: '#f7f6f2', glow: '#ffffff', glowPos: [0.5, 1.25], glowSize: 0.45, glowStrength: 0.25, tone: 'light' },
  golden: { top: '#e9cba6', bottom: '#f4e2cc', glow: '#ffae6b', glowPos: [0.18, 0.12], glowSize: 0.22, glowStrength: 0.22, tone: 'light' },
  night: { top: '#04050a', bottom: '#0c0f20', glow: '#4146a0', glowPos: [0.25, 1.2], glowSize: 0.25, glowStrength: 0.2, tone: 'dark' },
  ink: { top: '#08090d', bottom: '#0b0c11', glow: '#262b40', glowPos: [0.5, 1.3], glowSize: 0.4, glowStrength: 0.18, tone: 'dark' },
}

/** Text and signal colours for each tone. Checked against every sky in tests/contrast.test.ts. */
export const inks = {
  dark: { ink: '#eeece6', ink2: '#aeb1b8', line: 'rgba(238,236,230,0.16)', surface: 'rgba(238,236,230,0.045)', signal: '#ff6a2b' },
  light: { ink: '#111317', ink2: '#494d56', line: 'rgba(17,19,23,0.14)', surface: 'rgba(255,255,255,0.5)', signal: '#b83c0b' },
} as const

export type Tone = keyof typeof inks

/** Luminance above which dark ink beats light ink (where both reach ~4.5:1). */
export const INK_SWITCH = 0.174

export interface SkyRGB {
  top: RGB
  bottom: RGB
  glow: RGB
  glowPos: readonly [number, number]
  glowSize: number
  glowStrength: number
}

export function skyRGB(id: SkyId): SkyRGB {
  const s = skies[id]
  return { top: hex(s.top), bottom: hex(s.bottom), glow: hex(s.glow), glowPos: s.glowPos, glowSize: s.glowSize, glowStrength: s.glowStrength }
}

export function blendSky(a: SkyRGB, b: SkyRGB, t: number): SkyRGB {
  const n = (x: number, y: number) => x + (y - x) * t
  return {
    top: mix(a.top, b.top, t),
    bottom: mix(a.bottom, b.bottom, t),
    glow: mix(a.glow, b.glow, t),
    glowPos: [n(a.glowPos[0], b.glowPos[0]), n(a.glowPos[1], b.glowPos[1])],
    glowSize: n(a.glowSize, b.glowSize),
    glowStrength: n(a.glowStrength, b.glowStrength),
  }
}

/** Mid-screen luminance: the average of the gradient ends, which is what most text sits on. */
export function skyLuminance(s: SkyRGB): number {
  return luminance(mix(s.top, s.bottom, 0.5))
}

/** The brightest point text can meet: the bottom edge under the full glow (upper bound). */
export function skyPeak(s: SkyRGB): RGB {
  return add(s.bottom, s.glow, s.glowStrength)
}

export function toneFor(s: SkyRGB): Tone {
  return skyLuminance(s) > INK_SWITCH ? 'light' : 'dark'
}

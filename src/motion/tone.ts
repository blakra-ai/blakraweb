import type { CSSProperties } from 'react'
import { inks, skies, type SkyId, type Tone } from './sky/palettes'

export type { Tone }

type Vars = CSSProperties & Record<`--${string}`, string>

/** Inline CSS variables for a section: its fallback sky and its tone tokens. */
export function skyStyle(id: SkyId): Vars {
  const s = skies[id]
  return {
    '--sky-top': s.top,
    '--sky-bottom': s.bottom,
    '--sky-glow-color': `${s.glow}${alphaHex(s.glowStrength * 1.6)}`,
    '--sky-glow-x': `${s.glowPos[0] * 100}%`,
    '--sky-glow-y': `${(1 - s.glowPos[1]) * 100}%`,
    '--sky-glow-size': String(s.glowSize),
    ...toneStyle(s.tone),
  }
}

export function toneStyle(tone: Tone): Vars {
  const t = inks[tone]
  return {
    '--tone-ink': t.ink,
    '--tone-ink-2': t.ink2,
    '--tone-line': t.line,
    '--tone-surface': t.surface,
    '--tone-signal': t.signal,
  }
}

function alphaHex(a: number): string {
  return Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0')
}

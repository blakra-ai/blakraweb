import type { CSSProperties } from 'react'

/** Ink for each surface: paper (light) and ink (dark). Contrast is tested in tests/contrast.test.ts. */
export const inks = {
  dark: { ink: '#eeece6', ink2: '#aeb1b8', line: 'rgba(238,236,230,0.16)', surface: 'rgba(238,236,230,0.045)', signal: '#ff6a2b' },
  light: { ink: '#111317', ink2: '#494d56', line: 'rgba(17,19,23,0.14)', surface: 'rgba(255,255,255,0.5)', signal: '#b83c0b' },
} as const

export type Tone = keyof typeof inks

type Vars = CSSProperties & Record<`--${string}`, string>

/** Inline CSS variables for a section's tone. */
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

import type { HTMLAttributes, Ref } from 'react'
import { toneStyle, type Tone } from '../motion/tone'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div' | 'footer'
  ref?: Ref<HTMLElement>
  /** The act of the film this section plays (src/features/experience/timeline.ts). */
  beat?: string
  /** Paper (the default) or ink. */
  surface?: 'paper' | 'ink'
}

/** A stretch of the page: its surface and tone, and the act of the film it plays. */
export function Section({ as = 'section', beat, surface = 'paper', style, ...rest }: SectionProps) {
  // Every allowed tag is an HTMLElement; typing it as one tag keeps the ref simple.
  const Tag = as as 'section'
  const tone: Tone = surface === 'ink' ? 'dark' : 'light'
  return <Tag data-beat={beat} data-surface={surface} data-tone={tone} style={{ ...toneStyle(tone), ...style }} {...rest} />
}

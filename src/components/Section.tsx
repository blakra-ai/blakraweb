import type { HTMLAttributes, Ref } from 'react'
import { toneStyle, type Tone } from '../motion/tone'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div' | 'footer'
  ref?: Ref<HTMLElement>
  /** The act this section plays (the old film's timeline; the Observatory reads data-station). */
  beat?: string
  /**
   * The Observatory's surfaces: `body` (dark, transparent over the world) and `porcelain` (the
   * light screen, class `light`). `paper` and `ink` are the previous design's, kept until every
   * section is rebuilt (WP-D … WP-H).
   */
  surface?: 'body' | 'porcelain' | 'paper' | 'ink'
  /** The gauge's station this section is (1 … 9). */
  station?: number
}

/** A stretch of the page: its surface, and the station of the descent it is. */
export function Section({ as = 'section', beat, surface = 'paper', station, style, className, ...rest }: SectionProps) {
  // Every allowed tag is an HTMLElement; typing it as one tag keeps the ref simple.
  const Tag = as as 'section'
  const legacy = surface === 'paper' || surface === 'ink'
  const tone: Tone = surface === 'ink' ? 'dark' : 'light'
  const classes = [className, surface === 'porcelain' ? 'light' : undefined].filter(Boolean).join(' ') || undefined
  return (
    <Tag
      data-beat={beat}
      data-surface={surface}
      data-tone={legacy ? tone : undefined}
      data-station={station}
      className={classes}
      style={legacy ? { ...toneStyle(tone), ...style } : style}
      {...rest}
    />
  )
}

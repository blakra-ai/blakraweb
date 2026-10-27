import type { HTMLAttributes, Ref } from 'react'
import { skies, type SkyId } from '../motion/sky/palettes'
import { skyStyle } from '../motion/tone'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div' | 'footer'
  ref?: Ref<HTMLElement>
  /** The sky this section holds, or blends into when it is an interstitial. */
  sky: SkyId
  /** Interstitials blend from this sky into `sky`. */
  from?: SkyId
  /** Clock range in minutes while the section scrolls past. */
  time: readonly [number, number]
  chapter?: string
}

/** A stretch of the day: paints its own sky as a fallback and registers with the day engine. */
export function Section({ as = 'section', sky, from, time, chapter, style, ...rest }: SectionProps) {
  // Every allowed tag is an HTMLElement; typing it as one tag keeps the ref simple.
  const Tag = as as 'section'
  return (
    <Tag
      data-day={from ? 'mix' : 'hold'}
      data-sky={sky}
      data-sky-from={from}
      data-sky-to={from ? sky : undefined}
      data-tone={skies[sky].tone}
      data-time-from={time[0]}
      data-time-to={time[1]}
      data-chapter={chapter}
      style={{ ...skyStyle(sky), ...style }}
      {...rest}
    />
  )
}

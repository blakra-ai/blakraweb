import { useEffect, useRef } from 'react'
import { useMotion } from '../../motion/MotionProvider'
import { onLifted } from './ready'
import { obs } from './state'

/*
 * The guide's spoken line: the full text is always in the DOM (prerendered, read by assistive
 * tech as written); on screen it is revealed as if typed, at CPS characters per second, by moving
 * a split between a visible span and a hidden one (no character is ever inserted, nothing
 * reflows: both spans hold the text's own words). `obs.line` carries the progress so the world's
 * guide moves her jaw to it (speech.ts). Under reduced motion the line is printed whole and the
 * caret (CSS, data-caret) stands still.
 */

export const CPS = 34
/** The line begins this long after the loader starts to lift: as the curtain clears round the landed ring. */
const START_MS = 500

export function Voice({ text, delay = START_MS, className = 'voice' }: { text: string; delay?: number; className?: string }) {
  const { enabled } = useMotion()
  const shown = useRef<HTMLSpanElement>(null)
  const hidden = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const a = shown.current
    const b = hidden.current
    if (!a || !b) return
    const print = (n: number) => {
      a.textContent = text.slice(0, n)
      b.textContent = text.slice(n)
      obs.line.typed = n
    }
    // Typed only where nobody has read it yet: under the brand loader. A line already on screen (a repeat visit) never vanishes to be retyped.
    if (!enabled || !document.documentElement.classList.contains('loading')) {
      obs.line = { text, typed: text.length, from: 0 }
      print(text.length)
      return
    }
    print(0)
    let timer = 0
    let tick = 0
    const total = (text.length / CPS) * 1000
    const start = () => {
      const t0 = performance.now()
      obs.line = { text, typed: 0, from: obs.clock }
      print(0)
      const step = () => {
        const n = Math.min(text.length, Math.floor(((performance.now() - t0) / total) * text.length))
        print(n)
        if (n < text.length) tick = window.setTimeout(step, 1000 / CPS)
      }
      step()
    }
    const off = onLifted(() => {
      timer = window.setTimeout(start, delay)
    })
    return () => {
      off()
      clearTimeout(timer)
      clearTimeout(tick)
    }
  }, [text, enabled, delay])

  // The caret (CSS ::after on .voice[data-caret]) rides the revealed span; the rest keeps its place in
  // transparent ink, so the line's box and its reading never change.
  return (
    <p className={className}>
      <span ref={shown} className={className} data-caret>
        {text}
      </span>
      <span ref={hidden} className={`${className} voice-rest`} />
    </p>
  )
}

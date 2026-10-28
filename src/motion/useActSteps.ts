import { useCallback, useRef, useState, type RefObject } from 'react'
import { scrollAt, storyAt } from '../features/experience/scrollMap'
import { gsap, layouts } from './gsap'
import { reflow } from './reflow'
import { useMotionSetup } from './useMotionSetup'

/**
 * The steps of a held act: while its section holds the screen (wide screens with motion), how
 * many of the film's moments (t values) the scroll has passed, read from the same scroll map
 * as the film's director, so a line of text appears in the frame its picture does. React state changes
 * only at each step. Not held: null, and everything shows.
 *
 * The section holds only while its [data-pin] fits the screen (a short laptop screen, a long
 * translation or the reader's own text size may not): otherwise it gets data-flow="list" and
 * reads as an ordinary section, so nothing is ever cut off. Its CSS holds it only without that.
 */
export function useActSteps(ref: RefObject<HTMLElement | null>, moments: readonly number[]) {
  const [passed, setPassed] = useState<number | null>(null)
  const held = useRef(false)
  const momentsRef = useRef(moments)
  momentsRef.current = moments

  useMotionSetup(ref, (root) => {
    const mm = gsap.matchMedia()
    mm.add(layouts.pinned, () => {
      const pin = root.querySelector<HTMLElement>('[data-pin]')
      let step = -1
      const tick = () => {
        const t = storyAt(window.scrollY)
        const list = momentsRef.current
        let n = 0
        while (n < list.length && t >= list[n]) n++
        if (n === step) return
        step = n
        setPassed(n)
      }
      const hold = (on: boolean) => {
        held.current = on
        if (on) {
          step = -1
          tick()
          gsap.ticker.add(tick)
        } else {
          gsap.ticker.remove(tick)
          setPassed(null)
        }
      }
      const decide = () => {
        const wasList = root.dataset.flow === 'list'
        delete root.dataset.flow
        const fits = !pin || pin.scrollHeight <= pin.clientHeight + 1
        if (!fits) root.dataset.flow = 'list'
        if (fits !== held.current) hold(fits)
        // Held and flowing differ in height: when it switched, everything measured below it moves.
        if (fits === wasList) reflow()
      }
      decide()
      let frame = 0
      const recheck = () => {
        if (frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          decide()
        })
      }
      // Text that grows later (web fonts, text spacing) re-checks; so does a resize.
      const grow = new ResizeObserver(recheck)
      if (pin?.firstElementChild) grow.observe(pin.firstElementChild)
      window.addEventListener('resize', recheck)
      return () => {
        cancelAnimationFrame(frame)
        grow.disconnect()
        window.removeEventListener('resize', recheck)
        delete root.dataset.flow
        if (held.current) hold(false)
      }
    })
  })

  /** The scroll offset at which the film reaches t in this act, while held (for links). */
  const scrollFor = useCallback((t: number) => (held.current ? scrollAt(t) : null), [])

  return { passed, scrollFor }
}

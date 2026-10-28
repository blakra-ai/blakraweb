import { useCallback, useRef, useState, type RefObject } from 'react'
import { acts, actSpan } from '../features/experience/timeline'
import { gsap, layouts } from './gsap'
import { onReflow, reflow } from './reflow'
import { useMotionSetup } from './useMotionSetup'

/**
 * The steps of a held act: while its section holds the screen (wide screens with motion), how
 * many of the film's moments (t values) the scroll has passed, played exactly as the director
 * plays the act, so a line of text appears in the frame its picture does. React state changes
 * only at each step. Not held: null, and everything shows.
 *
 * The section holds only while its [data-pin] fits the screen (a short laptop screen, a long
 * translation or the reader's own text size may not): otherwise it gets data-flow="list" and
 * reads as an ordinary section, so nothing is ever cut off. Its CSS holds it only without that.
 */
export function useActSteps(ref: RefObject<HTMLElement | null>, beat: string, moments: readonly number[]) {
  const act = acts.find((a) => a.beat === beat)!
  const [passed, setPassed] = useState<number | null>(null)
  const geometry = useRef({ top: 0, height: 1 })
  const held = useRef(false)
  const momentsRef = useRef(moments)
  momentsRef.current = moments

  useMotionSetup(ref, (root) => {
    const mm = gsap.matchMedia()
    mm.add(layouts.pinned, () => {
      const pin = root.querySelector<HTMLElement>('[data-pin]')
      const measure = () => {
        geometry.current = { top: root.getBoundingClientRect().top + window.scrollY, height: Math.max(1, root.offsetHeight) }
      }
      let step = -1
      const tick = () => {
        const { top, height } = geometry.current
        const t = act.from + Math.min(1, Math.max(0, (window.scrollY - top) / actSpan(height, window.innerHeight))) * (act.to - act.from)
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
          measure()
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
      const offReflow = onReflow(measure)
      return () => {
        cancelAnimationFrame(frame)
        grow.disconnect()
        window.removeEventListener('resize', recheck)
        offReflow()
        delete root.dataset.flow
        if (held.current) hold(false)
      }
    })
  })

  /** The scroll offset at which the film reaches t in this act, while held (for links). */
  const scrollFor = useCallback(
    (t: number) => {
      if (!held.current) return null
      const { top, height } = geometry.current
      return top + ((t - act.from) / (act.to - act.from)) * actSpan(height, window.innerHeight)
    },
    [act],
  )

  return { passed, scrollFor }
}

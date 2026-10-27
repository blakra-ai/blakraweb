import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from './gsap'
import { useMotion } from './MotionProvider'
import { scheduleMotion } from './schedule'

/**
 * Like useGSAP, but queued: `setup` runs inside a gsap.context scoped to `scope`
 * when motion is enabled, and everything it created is reverted when motion turns
 * off or the component unmounts. A function returned by `setup` runs on revert.
 */
export function useMotionSetup(scope: RefObject<HTMLElement | null>, setup: (root: HTMLElement) => void | (() => void)) {
  const { enabled } = useMotion()
  const setupRef = useRef(setup)
  setupRef.current = setup

  useEffect(() => {
    const root = scope.current
    if (!enabled || !root) return
    let ctx: gsap.Context | undefined
    const cancel = scheduleMotion(() => {
      ctx = gsap.context(() => setupRef.current(root), root)
    })
    return () => {
      cancel()
      ctx?.revert()
    }
  }, [enabled, scope])
}

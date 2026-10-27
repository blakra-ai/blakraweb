import { useEffect, useRef, type RefObject } from 'react'
import { registerSection, type Pose } from './engine3d/stage'

interface StageOptions {
  pose: Pose
  narrow?: Partial<Pose>
  /** Pinned: hold the pose for the whole pin. */
  hold?: boolean
  /** Pose changes driven by the section itself while it holds the screen, at scroll position y. */
  live?: (y: number) => Partial<Pose> | null
}

/**
 * Register a section on the 3D stage: the camera pose and scene state it wants while it
 * holds the middle of the screen, and the hour it sets.
 */
export function useStage(ref: RefObject<HTMLElement | null>, stage: StageOptions, minutes?: number) {
  const stageRef = useRef(stage)
  stageRef.current = stage
  useEffect(() => {
    const el = ref.current
    if (!el) return
    return registerSection({ el, ...stageRef.current, minutes })
  }, [ref, minutes])
}

export const isNarrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches

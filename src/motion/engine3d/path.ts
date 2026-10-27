import { mixPose, poses, type Pose } from './stage'

/** A section as measured on the page, with the pose for the current breakpoint. */
export interface Metric {
  top: number
  height: number
  pose: Pose
  minutes?: number
  /** Hold the pose across the whole section (pinned), not only at its centre. */
  hold?: boolean
  /** Pose changes the section drives itself while it holds the screen, at scroll position y. */
  live?: (y: number) => Partial<Pose> | null
}

export interface StageFrame {
  pose: Pose
  /** Section holding the middle of the screen. */
  index: number
  minutes?: number
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** Smootherstep: the camera leaves and arrives with no jolt (zero speed and acceleration). */
const smooth = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)

/**
 * The camera travels between stations as the page scrolls, and rests at each one while
 * the reader reads: a section's pose holds across the middle of the section, a held
 * (sticky) section keeps it for the whole hold. With motion off the camera cuts.
 */
export function frameAt(ms: readonly Metric[], scrollY: number, viewport: number, continuous: boolean): StageFrame {
  if (ms.length === 0) return { pose: poses.hero as Pose, index: -1 }
  ms = ms.map((m) => {
    const own = m.live?.(scrollY)
    return own ? { ...m, pose: { ...m.pose, ...own } } : m
  })
  const centre = scrollY + viewport / 2
  // Where each section's pose starts and stops being exact.
  const spans = ms.map((m) => {
    const mid = m.top + m.height / 2
    if (m.hold && m.height > viewport) return [m.top + viewport / 2, m.top + m.height - viewport / 2]
    // A resting stretch around the middle: a fifth of a screen either side, at most.
    const rest = Math.min(m.height * 0.22, viewport * 0.2)
    return [mid - rest, mid + rest]
  })

  let index = ms.findIndex((m) => centre >= m.top && centre < m.top + m.height)
  if (index === -1) index = centre < ms[0].top ? 0 : ms.length - 1

  let pose: Pose
  const last = ms.length - 1
  if (centre <= spans[0][1]) pose = ms[0].pose
  else if (centre >= spans[last][0]) pose = ms[last].pose
  else {
    let i = 0
    while (i < last && centre > spans[i + 1][0]) i++
    if (centre <= spans[i][1]) pose = ms[i].pose
    else {
      const t = clamp01((centre - spans[i][1]) / Math.max(1, spans[i + 1][0] - spans[i][1]))
      pose = continuous ? mixPose(ms[i].pose, ms[i + 1].pose, smooth(t)) : t < 0.5 ? ms[i].pose : ms[i + 1].pose
    }
  }
  return { pose, index, minutes: ms[index].minutes }
}

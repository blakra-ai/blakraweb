import { describe, expect, it } from 'vitest'
import { frameAt, type Metric } from '../src/motion/engine3d/path'
import { poses, type Pose } from '../src/motion/engine3d/stage'

const vh = 1000
const a = poses.hero as Pose
const b = poses.close(1)
const c = poses.crown as Pose
const ms: Metric[] = [
  { top: 0, height: 1000, pose: a, minutes: 358 },
  { top: 1000, height: 3000, pose: b, minutes: 360 },
  { top: 4000, height: 1000, pose: c, minutes: 1800 },
]

describe('frameAt: the scroll-driven camera', () => {
  it('starts on the first pose', () => {
    expect(frameAt(ms, 0, vh, true).pose).toEqual(a)
  })

  it('travels on every scroll between stations', () => {
    // Between the first station's rest (centre ≤ 700) and the second's (centre ≥ 2300).
    const steps = [300, 600, 900, 1200, 1500, 1750].map((y) => frameAt(ms, y, vh, true).pose.dist)
    for (let i = 1; i < steps.length; i++) expect(steps[i]).not.toBe(steps[i - 1])
  })

  it('rests at each station while the reader reads', () => {
    // The middle of the second section: its pose holds a fifth of a screen either side.
    const resting = [2350, 2500, 2650].map((c) => frameAt(ms, c - vh / 2, vh, true).pose)
    for (const pose of resting) expect(pose).toEqual(b)
  })

  it('reaches each section pose at its centre', () => {
    expect(frameAt(ms, 2500 - vh / 2, vh, true).pose.dist).toBeCloseTo(b.dist)
    expect(frameAt(ms, 4500 - vh / 2, vh, true).pose.target).toEqual(c.target)
  })

  it('carries the scene state with the camera', () => {
    // Between the hero (no column) and the next section (column), the column fades in.
    const mid = frameAt(ms, 1000, vh, true).pose.column
    expect(mid).toBeGreaterThan(a.column)
    expect(mid).toBeLessThan(b.column)
  })

  it('holds a pinned section’s pose for the whole pin', () => {
    const held = ms.map((m, i) => (i === 1 ? { ...m, hold: true } : m))
    // The pin runs while the section's top is above the viewport top and its bottom below the bottom.
    for (const y of [1000, 2000, 3000]) expect(frameAt(held, y, vh, true).pose).toEqual(b)
  })

  it('lets a held section drive its own pose', () => {
    let progress = 0
    const live = () => ({ dist: 5 + progress * 10 })
    const held = ms.map((m, i) => (i === 1 ? { ...m, hold: true, live } : m))
    progress = 0.2
    expect(frameAt(held, 2000, vh, true).pose.dist).toBeCloseTo(7)
    progress = 0.8
    expect(frameAt(held, 2000, vh, true).pose.dist).toBeCloseTo(13)
  })

  it('cuts between poses with motion off', () => {
    const f = frameAt(ms, 1200, vh, false)
    expect([a, b]).toContainEqual(f.pose)
  })

  it('reports the hour of the section in the middle of the screen', () => {
    expect(frameAt(ms, 2000, vh, true).minutes).toBe(360)
  })
})

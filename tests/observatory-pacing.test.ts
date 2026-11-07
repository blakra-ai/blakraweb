import { describe, expect, it } from 'vitest'
import { createGovernor, dprLevels, DEEP_IDLE_FPS, DEEP_IDLE_S, IDLE_FPS, idlePeriodMs, stepGovernor } from '../src/features/observatory/pacing'

/** Feeds `frames` frames of `gap` ms; returns every scale the governor asked for. */
function run(g: ReturnType<typeof createGovernor>, frames: number, gap: number, period: number, clock: { t: number }) {
  const out: number[] = []
  for (let i = 0; i < frames; i++) {
    clock.t += gap
    const d = stepGovernor(g, gap, period, clock.t)
    if (d !== null) out.push(d)
  }
  return out
}

describe('the idle rate', () => {
  it('drops at rest and again after a long rest', () => {
    expect(idlePeriodMs(1)).toBeCloseTo(1000 / IDLE_FPS)
    expect(idlePeriodMs(DEEP_IDLE_S + 1)).toBeCloseTo(1000 / DEEP_IDLE_FPS)
  })
})

describe('the render-scale governor', () => {
  it('starts from the machine and never goes under 0.7', () => {
    expect(dprLevels(1.25)).toEqual([1.25, 1, 0.85, 0.7])
    expect(dprLevels(1)).toEqual([1, 0.85, 0.7])
  })

  it('ignores the warm-up and the gaps of a demand loop', () => {
    const c = { t: 0 }
    const g = createGovernor(1, c.t)
    expect(run(g, 40, 50, 0, c)).toEqual([])
    c.t = 10_000
    expect(run(g, 200, 400, 0, c)).toEqual([])
  })

  it('steps down while frames stay late, one level per window', () => {
    const c = { t: 10_000 }
    const g = createGovernor(1, 0)
    expect(run(g, 40, 33, 0, c)).toEqual([0.85])
    expect(run(g, 40, 33, 0, c)).toEqual([0.7])
    expect(run(g, 200, 33, 0, c)).toEqual([])
  })

  it('judges a paced frame against its own period', () => {
    const c = { t: 10_000 }
    const g = createGovernor(1, 0)
    expect(run(g, 80, 1000 / 24, 1000 / 24, c)).toEqual([])
    expect(run(g, 40, 70, 1000 / 24, c)).toEqual([0.85])
  })

  it('offers the scale back after a long run on time, and stops trying when that fails', () => {
    const c = { t: 10_000 }
    const g = createGovernor(1, 0)
    expect(run(g, 40, 33, 0, c)).toEqual([0.85])
    expect(run(g, 480, 16.7, 0, c)).toEqual([1])
    expect(run(g, 40, 33, 0, c)).toEqual([0.85])
    expect(run(g, 2000, 16.7, 0, c)).toEqual([])
    expect(g.level).toBe(1)
  })
})

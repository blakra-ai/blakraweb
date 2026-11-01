import { describe, expect, it } from 'vitest'
import { BLINK, createLivingState, createPerf, EAR, EYE_LIMIT, stepLiving, type LivingInput } from '../src/features/navigator/living'

const DT = 1 / 120

function input(over: Partial<LivingInput> = {}): LivingInput {
  return {
    pointer: { x: 700, y: 400, on: false },
    anchor: { eyes: { x: 700, y: 400 }, headPx: 200, on: true },
    viewport: { w: 1440, h: 900 },
    beat: 'hero',
    progress: 0,
    spokeAt: -10,
    typingUntil: -10,
    transmitAt: 0,
    missionAt: 0,
    missionLayers: null,
    hover: { layer: null },
    still: false,
    clock: 0,
    dt: DT,
    ...over,
  }
}

/** Run `seconds` of frames at DT; `tweak` may change the input per frame. Returns the last perf. */
function run(seconds: number, base: LivingInput, state = createLivingState(7), tweak?: (inp: LivingInput, t: number) => void, each?: (perf: ReturnType<typeof createPerf>, t: number) => void) {
  const perf = createPerf()
  const inp = { ...base, pointer: { ...base.pointer }, hover: { ...base.hover } }
  const n = Math.round(seconds / DT)
  for (let i = 0; i <= n; i++) {
    inp.clock = base.clock + i * DT
    inp.dt = DT
    tweak?.(inp, inp.clock)
    stepLiving(state, inp, perf)
    each?.(perf, inp.clock)
  }
  return { perf, state }
}

describe('gaze', () => {
  it('clamps the eyes at ±EYE_LIMIT (12°) however far the cursor is', () => {
    const { perf } = run(3, input({ pointer: { x: 9000, y: -9000, on: true } }))
    expect(perf.eyes.yaw).toBeLessThanOrEqual(EYE_LIMIT)
    expect(perf.eyes.yaw).toBeGreaterThan(EYE_LIMIT - 0.01)
    expect(perf.eyes.pitch).toBeLessThanOrEqual(EYE_LIMIT)
    expect(Math.abs(perf.eyes.pitch)).toBeGreaterThan(EYE_LIMIT - 0.01)
  })

  it('aims at the cursor through a focal length of 1.6 heads', () => {
    // dx = 320 px over f = 320 px → 45°, clamped to 12; dx = 60 → atan(60/320) = 10.62°
    const { perf } = run(4, input({ pointer: { x: 760, y: 400, on: true } }))
    expect(perf.eyes.yaw).toBeCloseTo((Math.atan2(60, 320) * 180) / Math.PI, 1)
    expect(perf.head.yaw).toBeCloseTo(perf.eyes.yaw / 3, 1)
    expect(perf.body.yaw).toBeCloseTo(perf.eyes.yaw / 10, 1)
  })

  it('eyes lead the head: after 100 ms the eyes are closer to their target', () => {
    const { perf } = run(0.1, input({ pointer: { x: 760, y: 400, on: true } }))
    const target = (Math.atan2(60, 320) * 180) / Math.PI
    const eyeFrac = perf.eyes.yaw / target
    const headFrac = perf.head.yaw / (target / 3)
    expect(eyeFrac).toBeGreaterThan(headFrac)
    expect(eyeFrac).toBeGreaterThan(0.8)
    expect(headFrac).toBeLessThan(0.5)
  })

  it('wanders deterministically from a seed when the cursor is off', () => {
    const a = run(12, input(), createLivingState(3)).perf
    const b = run(12, input(), createLivingState(3)).perf
    expect(a.eyes).toEqual(b.eyes)
    let moved = false
    run(12, input(), createLivingState(3), undefined, (p) => {
      if (Math.abs(p.eyes.yaw) > 0.5) moved = true
    })
    expect(moved).toBe(true)
  })
})

describe('blink', () => {
  it('closes in 70 ms and opens in 120 ms on a new line', () => {
    const state = createLivingState(1)
    run(0.5, input(), state) // settle; no random blink before 3 s
    const samples: { t: number; lids: number }[] = []
    run(0.4, input({ spokeAt: 0.5, typingUntil: 3, clock: 0.5 }), state, undefined, (p, t) => samples.push({ t: t - 0.5, lids: p.lids }))
    const closed = samples.find((s) => s.lids >= 0.95)!
    expect(closed).toBeDefined()
    expect(closed.t).toBeGreaterThan(BLINK.close - 0.02)
    expect(closed.t).toBeLessThan(BLINK.close + 0.02)
    const reopened = samples.find((s) => s.t > closed.t && s.lids === 0)!
    expect(reopened.t - closed.t).toBeGreaterThan(BLINK.open - 0.02)
    expect(reopened.t - closed.t).toBeLessThan(BLINK.open + 0.02)
    // Half-way through closing the lids are about half shut.
    const mid = samples.find((s) => s.t >= BLINK.close / 2)!
    expect(mid.lids).toBeGreaterThan(0.3)
    expect(mid.lids).toBeLessThan(0.8)
  })

  it('blinks once when the beat changes and randomly every 3–6 s', () => {
    let blinks = 0
    let prev = 0
    const count = (p: { lids: number }) => {
      if (p.lids > 0 && prev === 0) blinks++
      prev = p.lids
    }
    run(2, input(), createLivingState(5), (inp, t) => void (inp.beat = t >= 1 ? 'manifesto' : 'hero'), count)
    expect(blinks).toBe(1)
    blinks = 0
    run(20, input(), createLivingState(5), undefined, count)
    expect(blinks).toBeGreaterThanOrEqual(3)
    expect(blinks).toBeLessThanOrEqual(7)
  })

  it('is a slow 400 ms blink when the form is sent', () => {
    const state = createLivingState(1)
    run(0.5, input(), state)
    let first = -1
    let last = -1
    run(1, input({ clock: 0.5, transmitAt: 0.5 }), state, undefined, (p, t) => {
      if (p.lids > 0) {
        if (first < 0) first = t
        last = t
      }
    })
    expect(last - first).toBeGreaterThan(0.36)
    expect(last - first).toBeLessThan(0.42)
  })

  it('never blinks and rests everything when still', () => {
    run(20, input({ still: true, pointer: { x: 9000, y: 9000, on: true } }), createLivingState(2), (inp, t) => void (inp.spokeAt = Math.floor(t)), (p) => {
      expect(p.lids).toBe(0)
      expect(p.eyes.yaw).toBe(0)
      expect(p.head.pitch).toBe(0)
      expect(p.ears.prick).toBe(0)
      expect(p.jaw).toBe(0)
    })
  })
})

describe('ears', () => {
  it('prick 6° on a new line and settle with exactly one overshoot', () => {
    const state = createLivingState(1)
    run(0.5, input(), state)
    let peak = 0
    let below = 0
    let wasBelow = false
    let final = 0
    run(2.5, input({ clock: 0.5, spokeAt: 0.5, typingUntil: 2 }), state, undefined, (p, t) => {
      peak = Math.max(peak, p.ears.prick)
      if (t - 0.5 > EAR.flick) {
        const isBelow = p.ears.prick < -0.1
        if (isBelow && !wasBelow) below++
        wasBelow = isBelow
      }
      final = p.ears.prick
    })
    expect(peak).toBeGreaterThan(3)
    expect(peak).toBeLessThan(EAR.prick * 1.3)
    expect(below).toBe(1)
    expect(Math.abs(final)).toBeLessThan(0.05)
  })

  it('turn toward the cursor side and glow while typing and on send', () => {
    const { perf } = run(3, input({ pointer: { x: 400, y: 400, on: true } }))
    expect(perf.ears.turn).toBeCloseTo(-EAR.turn, 1)
    const typing = run(1, input({ spokeAt: 0, typingUntil: 5 })).perf
    expect(typing.ears.glow).toBeGreaterThan(0.6)
    const sent = run(0.5, input({ transmitAt: 0.01 })).perf
    expect(sent.ears.glow).toBeGreaterThan(0.95)
  })
})

describe('systems and the eyes', () => {
  it('ignite root to crown 110 ms apart', () => {
    const lit: number[] = new Array(7).fill(-1)
    run(1.5, input(), createLivingState(1, 0), undefined, (p, t) => {
      for (let i = 0; i < 7; i++) if (lit[i] < 0 && p.sys[i] > 0.5) lit[i] = t
    })
    for (let i = 1; i < 7; i++) expect(lit[i] - lit[i - 1]).toBeCloseTo(0.11, 1)
    expect(lit[0]).toBeGreaterThan(0)
  })

  it('a mission lights only its layers and dims the rest; hover flares one', () => {
    const { perf } = run(3, input({ missionAt: 0, missionLayers: [0, 3, 6], hover: { layer: 4 } }))
    expect(perf.sys[0]).toBeCloseTo(1, 1)
    expect(perf.sys[3]).toBeCloseTo(1, 1)
    expect(perf.sys[6]).toBeCloseTo(1, 1)
    expect(perf.sys[1]).toBeCloseTo(0.25, 1)
    expect(perf.sys[4]).toBeGreaterThan(1.2)
    expect(perf.band).toBe(4)
    expect(run(1, input()).perf.band).toBe(-1)
  })

  it('brightens while typing or with the cursor on the face; breathes on 5.2 s', () => {
    expect(run(1, input({ spokeAt: 0, typingUntil: 5 })).perf.bright).toBeGreaterThan(0.9)
    expect(run(1, input({ pointer: { x: 720, y: 410, on: true } })).perf.bright).toBeGreaterThan(0.9)
    expect(run(1, input({ pointer: { x: 1200, y: 410, on: true } })).perf.bright).toBeLessThan(0.05)
    expect(run(1.3, input()).perf.breath).toBeCloseTo(1, 1)
    expect(run(2.6, input()).perf.breath).toBeCloseTo(0, 1)
  })
})

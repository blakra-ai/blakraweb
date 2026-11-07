import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deskRing, exitTo, phoneRing } from '../src/boot'
import { frameWindow } from '../src/features/observatory/windows'
import { createPerf } from '../src/features/navigator/living'
import { createPose, POSE, stepPose, type PoseInput } from '../src/features/observatory/guidePose'

describe("the loader's landing", () => {
  const core = { x: 636, y: 366, w: 168, h: 168 }
  const view = { w: 1440, h: 900 }
  it('lands on the ring the world draws', () => {
    const win = { x: 24, y: 64, w: 1392, h: 812 }
    const ring = deskRing(win)
    const f = frameWindow('hero', win).ring
    expect(ring).toEqual({ x: 24 + f.x, y: 64 + f.y, r: f.r })
    const to = exitTo(core, ring, view)!
    expect(to.x).toBeCloseTo(ring.x - 720)
    expect(to.y).toBeCloseTo(ring.y - 450)
    // The ring's r 83 of its 168 box, scaled by k, is the hero's radius.
    expect((core.w * (83 / 168) * to.k)).toBeCloseTo(ring.r)
  })
  it('on a phone, lands on the ring in the still (780 × 900 at the band)', () => {
    const r = phoneRing({ x: 0, y: 56, w: 390, h: 450 })
    expect(r).toEqual({ x: 99, y: 56 + 201, r: 103 })
  })
  it('has nowhere to land when the ring is off screen (a restored scroll)', () => {
    expect(exitTo(core, deskRing({ x: 24, y: -2000, w: 1392, h: 812 }), view)).toBeNull()
  })
})

describe('the first frame is the still', () => {
  const input = (o: Partial<PoseInput>): PoseInput => ({ mode: 'hero', station: 1, depth: 0, clock: 100, dt: 1 / 60, still: false, pointer: { x: 0, y: 0, on: false }, eyes: { x: 900, y: 430 }, viewport: { w: 1440, h: 900 }, focus: null, read: { x: 1300, y: 200 }, nodAt: -10, sentAt: 0, tint: [1, 1, 1], tintMix: 0, ...o })
  it('holds the still pose through the crossfade, with the breath at zero, then wakes to the read point', () => {
    const s = createPose(7, 100, true)
    const out = createPerf()
    stepPose(s, input({ clock: 100 }), out)
    expect(out.breath).toBeCloseTo(0)
    for (let i = 1; i < 60 * POSE.holdS; i++) {
      stepPose(s, input({ clock: 100 + i / 60 }), out)
      expect(s.yaw).toBeCloseTo(POSE.restYaw, 6)
      expect(s.pitch).toBeCloseTo(0, 6)
    }
    for (let i = 60 * POSE.holdS; i < 60 * 4; i++) stepPose(s, input({ clock: 100 + i / 60 }), out)
    expect(s.yaw).toBeGreaterThan(8)
    expect(s.pitch).toBeGreaterThan(4)
  })
  it('the same pose as a reduced-motion frame in the hero', () => {
    const s = createPose(7, 100)
    stepPose(s, input({ still: true }), createPerf())
    expect(s.yaw).toBe(POSE.restYaw)
    expect(s.pitch).toBe(0)
  })
})

describe('the inline script', () => {
  it('is allowed by its hash in every CSP', () => {
    const html = readFileSync('index.html', 'utf8')
    const code = html.match(/<script>([\s\S]*?)<\/script>/)![1]
    const hash = createHash('sha256').update(code).digest('base64')
    for (const f of ['deploy/blakra-headers.conf', 'deploy/_headers', 'deploy/vercel.json']) expect(readFileSync(f, 'utf8')).toContain(`'sha256-${hash}'`)
  })
})

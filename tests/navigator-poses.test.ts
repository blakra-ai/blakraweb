import { describe, expect, it } from 'vitest'
import { glide, poseFor, type PoseKey } from '../src/features/navigator/poses'

const ctx = { portrait: false, headHeight: 0.25, vhUnits: 2.0 }
const BEATS = ['hero', 'manifesto', 'mission', 'systems', 'proof', 'checklist', 'payload', 'crew', 'contact']

describe('poseFor', () => {
  it('hero: eyes at (0.70, 0.36), head 0.30 vh, facing the visitor', () => {
    const p = poseFor('hero', ctx)
    expect(p.x).toBe(0.7)
    expect(p.y).toBe(0.36)
    expect(p.s).toBeCloseTo((0.3 * ctx.vhUnits) / ctx.headHeight, 9)
    expect(p.s * ctx.headHeight).toBeCloseTo(0.3 * ctx.vhUnits, 9)
    expect(p.yaw).toBe(0)
    expect(p.look).toBe('visitor')
    expect(p.docked).toBe(false)
  })

  it('follows the screenplay table for the other beats', () => {
    expect(poseFor('systems', ctx)).toMatchObject({ docked: false, look: 'layers' })
    expect(poseFor('systems', ctx).s * ctx.headHeight).toBeCloseTo(0.24 * ctx.vhUnits, 9)
    expect(poseFor('proof', ctx)).toMatchObject({ x: 0.76, y: 0.5, docked: false, look: 'patches' })
    expect(poseFor('proof', ctx).s * ctx.headHeight).toBeCloseTo(0.24 * ctx.vhUnits, 9)
    const payload = poseFor('payload', ctx)
    expect(payload.x).toBeGreaterThan(0.5)
    expect(Math.abs(payload.yaw)).toBeGreaterThanOrEqual(75)
    expect(payload.look).toBe('capsule')
    expect(payload.s * ctx.headHeight).toBeCloseTo(0.3 * ctx.vhUnits, 9)
    // Contact: she stands in the left column under the intro, facing right toward the form.
    const contact = poseFor('contact', ctx)
    expect(contact.x).toBeCloseTo(0.22, 9)
    expect(contact.y).toBeCloseTo(0.74, 9)
    expect(contact.yaw).toBeGreaterThan(0)
    expect(contact.look).toBe('form')
    expect(contact.s * ctx.headHeight).toBeCloseTo(0.24 * ctx.vhUnits, 9)
    for (const b of ['manifesto', 'mission', 'checklist', 'crew']) expect(poseFor(b, ctx).docked).toBe(true)
  })

  it('phones: hero head 0.24 vh at the centre (0.5, 0.30); docked elsewhere', () => {
    const pc = { ...ctx, portrait: true }
    const hero = poseFor('hero', pc)
    expect(hero).toMatchObject({ x: 0.5, y: 0.3, docked: false })
    expect(hero.s * ctx.headHeight).toBeCloseTo(0.24 * ctx.vhUnits, 9)
    for (const b of BEATS.slice(1)) expect(poseFor(b, pc).docked).toBe(true)
  })
})

describe('glide', () => {
  const a: PoseKey = { x: 0.7, y: 0.36, s: 2.4, yaw: 0, look: 'visitor', docked: false }
  const b: PoseKey = { x: 0.08, y: 0.06, s: 0.48, yaw: 80, look: 'layers', docked: true }

  it('is monotone in every numeric field and hits both ends', () => {
    expect(glide(a, b, 0)).toEqual(a)
    expect(glide(a, b, 1)).toEqual(b)
    let prev = glide(a, b, 0)
    for (let i = 1; i <= 100; i++) {
      const p = glide(a, b, i / 100)
      for (const k of ['x', 'y', 's', 'yaw'] as const) {
        const dir = Math.sign(b[k] - a[k])
        expect((p[k] - prev[k]) * dir).toBeGreaterThanOrEqual(0)
      }
      prev = p
    }
  })

  it('eases: slower at the ends than in the middle; look and docked flip at t ≥ 0.5', () => {
    const d = (t0: number, t1: number) => glide(a, b, t1).x - glide(a, b, t0).x
    expect(Math.abs(d(0.45, 0.55))).toBeGreaterThan(Math.abs(d(0, 0.1)))
    expect(glide(a, b, 0.49).docked).toBe(false)
    expect(glide(a, b, 0.49).look).toBe('visitor')
    expect(glide(a, b, 0.5).docked).toBe(true)
    expect(glide(a, b, 0.5).look).toBe('layers')
    expect(glide(a, b, -1)).toEqual(a)
    expect(glide(a, b, 2)).toEqual(b)
  })
})

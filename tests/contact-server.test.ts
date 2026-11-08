import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs without types
import { check, limiter } from '../server/contact/server.mjs'

const ok = { org: 'Acme', email: 'a@b.co', msg: 'Hello there, we need an app.', intent: 'partner', lang: 'de', website: '', elapsed: 5000 }

describe('contact server', () => {
  it('accepts a valid message and cleans it', () => {
    expect(check({ ...ok, org: ' Acme\r\nBcc: x ' }).message).toEqual({ intent: 'partner', lang: 'de', org: 'Acme Bcc: x', email: 'a@b.co', msg: ok.msg })
  })
  it('drops bots silently', () => {
    expect(check({ ...ok, website: 'x' })).toEqual({ drop: true })
    expect(check({ ...ok, elapsed: 100 })).toEqual({ drop: true })
  })
  it('rejects bad fields', () => {
    expect(check({ ...ok, org: '' }).error).toBe('org')
    expect(check({ ...ok, email: 'a b@c.d' }).error).toBe('email')
    expect(check({ ...ok, msg: 'short' }).error).toBe('msg')
    expect(check(null).error).toBe('error')
  })
  it('limits each IP per hour', () => {
    const allow = limiter(2, 1000)
    expect([allow('1', 0), allow('1', 1), allow('1', 2), allow('2', 2), allow('1', 1500)]).toEqual([true, true, false, true, true])
  })
})

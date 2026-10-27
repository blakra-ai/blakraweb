import { describe, expect, it, vi } from 'vitest'
import { limits, sendContact, validate } from '../src/lib/contact'

const good = { intent: 'commission' as const, org: 'Northwind Retail', email: 'ops@northwind.example', msg: 'We re-type every order from email into our ERP.' }
const meta = { website: '', elapsedMs: 12_000, page: '/', lang: 'en' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('validate (AC5)', () => {
  it('accepts a complete message', () => {
    expect(validate(good)).toEqual({})
  })
  it('requires every field, after trimming', () => {
    expect(validate({ intent: 'partner', org: '  ', email: '', msg: ' short ' })).toEqual({ org: 'org', email: 'email', msg: 'msg' })
  })
  it('rejects incomplete email addresses', () => {
    for (const email of ['ops', 'ops@', 'ops@northwind', 'ops @northwind.com', 'ops@northwind.c']) {
      expect(validate({ ...good, email }).email).toBe('emailFormat')
    }
  })
  it('caps the message length', () => {
    expect(validate({ ...good, msg: 'x'.repeat(limits.msg + 1) }).msg).toBe('msgLong')
  })
})

describe('intent', () => {
  it('falls back to commission for an unknown intent', async () => {
    const fetcher = vi.fn(async () => json({ ok: true }))
    await sendContact('u', { ...good, intent: 'hack' as never }, meta, fetcher)
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body)).intent).toBe('commission')
  })
})

describe('sendContact (AC5, O1, O2)', () => {
  it('posts the intent, trimmed fields, honeypot, timing and language as text/plain', async () => {
    const fetcher = vi.fn(async () => json({ ok: true }))
    await expect(sendContact('https://example.test/exec', { ...good, org: ` ${good.org} ` }, meta, fetcher)).resolves.toBe('sent')
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://example.test/exec')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toMatch(/^text\/plain/)
    expect(JSON.parse(String(init.body))).toEqual({ ...good, website: '', elapsed: 12000, page: '/', lang: 'en' })
  })

  it('reports success only when the server confirms it', async () => {
    await expect(sendContact('u', good, meta, async () => json({ ok: false }))).resolves.toBe('failed')
    await expect(sendContact('u', good, meta, async () => new Response('<html>script finished</html>'))).resolves.toBe('failed')
    await expect(sendContact('u', good, meta, async () => json({ ok: true }, 500))).resolves.toBe('failed')
    await expect(
      sendContact('u', good, meta, async () => {
        throw new TypeError('blocked by CSP')
      }),
    ).resolves.toBe('failed')
  })

  it('drops bot-like submissions without calling the server', async () => {
    const fetcher = vi.fn(async () => json({ ok: true }))
    await expect(sendContact('u', good, { ...meta, website: 'http://spam.example' }, fetcher)).resolves.toBe('dropped')
    await expect(sendContact('u', good, { ...meta, elapsedMs: 900 }, fetcher)).resolves.toBe('dropped')
    expect(fetcher).not.toHaveBeenCalled()
  })
})

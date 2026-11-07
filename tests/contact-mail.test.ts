import { describe, expect, it } from 'vitest'
import { composeMail, MAILTO_MAX } from '../src/components/contactMail'
import { en } from '../src/content/locales/en'

const fields = { intent: 'commission' as const, org: ' Northwind Retail ', email: 'ops@northwind.example', msg: 'We re-type every order from email into our ERP.' }
const labels = { door: 'Commission a project', org: 'Name or company', email: 'Email' }
const parse = (href: string) => {
  const url = new URL(href)
  return { to: url.pathname, subject: url.searchParams.get('subject'), body: url.searchParams.get('body') }
}

describe('the mail fallback (no form endpoint)', () => {
  it('addresses the company and composes subject and body from the fields', () => {
    const { to, subject, body } = parse(composeMail('hello@blakra.us', fields, labels))
    expect(to).toBe('hello@blakra.us')
    expect(subject).toBe('Commission a project: Northwind Retail')
    expect(body).toContain(fields.msg)
    expect(body).toContain('Name or company: Northwind Retail')
    expect(body).toContain('Email: ops@northwind.example')
  })

  it('encodes spaces as %20 (a + would show literally in mail apps) and line breaks as CRLF', () => {
    const href = composeMail('hello@blakra.us', fields, labels)
    expect(href).not.toContain('+')
    expect(href).toContain('Commission%20a%20project')
    expect(href).toContain('%0D%0A')
  })

  it('cannot add a header through a field', () => {
    const href = composeMail('hello@blakra.us', { ...fields, org: 'Acme\r\nBcc: x@evil.example&cc=y@evil.example' }, labels)
    const url = new URL(href)
    expect(url.searchParams.get('subject')).toBe('Commission a project: Acme Bcc: x@evil.example&cc=y@evil.example')
    expect(url.searchParams.has('cc')).toBe(false)
    expect(url.searchParams.has('bcc')).toBe(false)
  })

  it('keeps a long message inside what mail apps accept, without splitting a character', () => {
    const href = composeMail('hello@blakra.us', { ...fields, msg: 'äöü😀 '.repeat(400) }, labels)
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX)
    const { body } = parse(href)
    expect(body).not.toContain('�')
    expect(body).toContain('Email: ops@northwind.example')
  })
})

describe('the mail fallback status line', () => {
  it('points at the address above it', () => {
    expect(en.contact.mailFallback).toMatch(/address above/)
  })
})

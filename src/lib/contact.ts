/**
 * Contact form rules and delivery. The endpoint is a Google Apps Script web app
 * (server/contact.gs) that answers JSON { ok }. Success is shown only when the
 * server confirms it; the honeypot and timing are enforced again on the server.
 */
import type { Intent } from '../content/types'

export interface ContactFields {
  intent: Intent
  org: string
  email: string
  msg: string
}

/** Error codes; the words live in each locale (contact.errors). */
export type ErrorCode = 'org' | 'email' | 'emailFormat' | 'msg' | 'msgLong'
export type FieldErrors = Partial<Record<'org' | 'email' | 'msg', ErrorCode>>

export const intents: readonly Intent[] = ['commission', 'partner', 'invest']
export const limits = { org: 120, email: 254, msgMin: 10, msg: 2000, minMs: 3000 } as const

// One plain address: no spaces, quotes, brackets, commas, angle brackets or invisible characters
// (the server checks the same).
const EMAIL = /^[^\s@<>()[\]\\,;:"\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+@[^\s@<>()[\]\\,;:"\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+\.[^\s@<>()[\]\\,;:".\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]{2,}$/

export function normalize(f: ContactFields): ContactFields {
  return { intent: intents.includes(f.intent) ? f.intent : 'commission', org: f.org.trim(), email: f.email.trim(), msg: f.msg.trim() }
}

export function validate(input: ContactFields): FieldErrors {
  const f = normalize(input)
  const errors: FieldErrors = {}
  if (!f.org || f.org.length > limits.org) errors.org = 'org'
  if (!f.email) errors.email = 'email'
  else if (f.email.length > limits.email || !EMAIL.test(f.email)) errors.email = 'emailFormat'
  if (f.msg.length < limits.msgMin) errors.msg = 'msg'
  else if (f.msg.length > limits.msg) errors.msg = 'msgLong'
  return errors
}

export type SendResult = 'sent' | 'dropped' | 'failed'

export interface SendMeta {
  /** Honeypot value: real people never fill it. */
  website: string
  elapsedMs: number
  /** The page's language, so the reply can be in it. */
  lang: string
}

export async function sendContact(endpoint: string, fields: ContactFields, meta: SendMeta, fetcher: typeof fetch = fetch): Promise<SendResult> {
  // Likely a bot: pretend it worked and send nothing.
  if (meta.website || meta.elapsedMs < limits.minMs) return 'dropped'
  try {
    // text/plain keeps this a CORS "simple request" (no preflight), which Apps Script requires.
    const res = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...normalize(fields), website: meta.website, elapsed: Math.round(meta.elapsedMs), lang: meta.lang }),
      redirect: 'follow',
    })
    if (!res.ok) return 'failed'
    const data: unknown = await res.json().catch(() => null)
    return typeof data === 'object' && data !== null && (data as { ok?: unknown }).ok === true ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}

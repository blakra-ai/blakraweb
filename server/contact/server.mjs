/*
 * The contact form's endpoint on the droplet: POST /api/contact (nginx proxies it to 127.0.0.1:8787).
 * No dependencies; Node 20+.
 *
 * Every accepted message is first appended to messages.jsonl (so nothing is lost even when mail fails),
 * then mailed to CONTACT_TO through Resend's HTTP API with Reply-To set to the sender.
 * Same rules as the form (src/lib/contact.ts): honeypot + minimum time (bots get ok and nothing is kept),
 * field limits, one plain email address. A per-IP limit stops floods.
 *
 * Settings, from /etc/blakra-contact.env (systemd EnvironmentFile):
 *   RESEND_API_KEY   the Resend key (without it, messages are only stored)
 *   CONTACT_TO       where messages go (default hello@blakra.us)
 *   CONTACT_FROM     the sender (default "BLAKRA website <onboarding@resend.dev>" until blakra.us is verified in Resend)
 *   CONTACT_DATA     folder for messages.jsonl (default /var/lib/blakra-contact)
 *   PORT             default 8787
 */
import { createServer } from 'node:http'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const LIMITS = { org: 120, email: 254, msgMin: 10, msg: 2000, minMs: 3000, body: 16384 }
const INTENTS = ['commission', 'partner', 'invest']
// Invisible and control characters never count as part of an address (same set as src/lib/contact.ts).
const hex = (n) => String.fromCharCode(92) + 'u' + n.toString(16).padStart(4, '0')
const BAD = [[0x80, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]].map(([x, y]) => hex(x) + '-' + hex(y)).join('')
const PART = '[^' + String.raw`\s@<>()[\]\\,;:"` + BAD + ']'
const TLD = '[^' + String.raw`\s@<>()[\]\\,;:".` + BAD + ']'
const EMAIL = new RegExp('^' + PART + '+@' + PART + '+' + String.raw`\.` + TLD + '{2,}$')

/** Checks a parsed body. Returns { drop: true } for bots, { error } for bad input, or the clean message. */
export function check(data) {
  if (!data || typeof data !== 'object') return { error: 'error' }
  if (data.website || Number(data.elapsed || 0) < LIMITS.minMs) return { drop: true }
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const org = str(data.org)
  const email = str(data.email)
  const msg = str(data.msg)
  if (!org || org.length > LIMITS.org) return { error: 'org' }
  if (!email || email.length > LIMITS.email || !EMAIL.test(email)) return { error: 'email' }
  if (msg.length < LIMITS.msgMin || msg.length > LIMITS.msg) return { error: 'msg' }
  const intent = INTENTS.includes(data.intent) ? data.intent : 'commission'
  const lang = str(data.lang).slice(0, 5).replace(/[^a-zA-Z-]/g, '') || 'en'
  // No line breaks in header-bound fields.
  return { message: { intent, lang, org: org.replace(/[\r\n]+/g, ' '), email, msg } }
}

/** A sliding one-hour window per IP. */
export function limiter(max = 5, windowMs = 3600_000) {
  const hits = new Map()
  return (ip, now = Date.now()) => {
    const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
    if (list.length >= max) {
      hits.set(ip, list)
      return false
    }
    list.push(now)
    hits.set(ip, list)
    if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
    return true
  }
}

async function mail(m, env) {
  if (!env.RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'BLAKRA website <onboarding@resend.dev>',
      to: [env.CONTACT_TO || 'hello@blakra.us'],
      reply_to: m.email,
      subject: `[blakra.us] ${m.intent} enquiry — ${m.org}`,
      text: `From: ${m.org}\nEmail: ${m.email}\nIntent: ${m.intent}\nLanguage: ${m.lang}\nTime: ${m.time}\n\n${m.msg}\n`,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) console.error(`resend ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.ok
}

export function start(env = process.env) {
  const dir = env.CONTACT_DATA || '/var/lib/blakra-contact'
  const allow = limiter()
  const reply = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  const server = createServer((req, res) => {
    if (req.url !== '/api/contact') return reply(res, 404, { ok: false })
    if (req.method !== 'POST') return reply(res, 405, { ok: false })
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > LIMITS.body) req.destroy()
      else chunks.push(c)
    })
    req.on('end', async () => {
      let data = null
      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {}
      const r = check(data)
      if (r.drop) return reply(res, 200, { ok: true })
      if (r.error) return reply(res, 400, { ok: false, error: r.error })
      const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || '')
      if (!allow(ip)) return reply(res, 429, { ok: false, error: 'rate' })
      const m = { time: new Date().toISOString(), ...r.message }
      try {
        await mkdir(dir, { recursive: true })
        await appendFile(join(dir, 'messages.jsonl'), JSON.stringify({ ...m, ip }) + '\n', { mode: 0o600 })
      } catch (e) {
        console.error('store failed', e)
        return reply(res, 500, { ok: false, error: 'error' })
      }
      // Stored: the message is safe, so the visitor sees success even if mail is down.
      mail(m, env).catch((e) => console.error('mail failed', e))
      reply(res, 200, { ok: true })
    })
  })
  const port = Number(env.PORT || 8787)
  server.listen(port, '127.0.0.1', () => console.log(`contact on 127.0.0.1:${port}`))
  return server
}

if (import.meta.url === `file://${process.argv[1]}`) start()

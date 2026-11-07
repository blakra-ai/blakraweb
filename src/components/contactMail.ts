import { normalize, type ContactFields } from '../lib/contact'

/** Longer mailto links fail silently in common mail handlers (Windows caps a handler's URL near 2 kB). */
export const MAILTO_MAX = 1900

export interface MailLabels {
  /** The chosen door's name: the subject's start. */
  door: string
  org: string
  email: string
}

/**
 * The form without an endpoint: the same fields as a message ready to send from the visitor's own
 * mail app. Everything is percent-encoded (never `+`, which mail apps show literally), and a line
 * break in a field cannot start a header. A message too long for a mailto link is cut at a
 * character boundary and marked; the form keeps the whole text.
 */
export function composeMail(to: string, input: ContactFields, labels: MailLabels): string {
  const f = normalize(input)
  const subject = `${labels.door}: ${f.org}`.replace(/\s*[\r\n]+\s*/g, ' ')
  const foot = `${labels.org}: ${f.org}\r\n${labels.email}: ${f.email}`
  const build = (msg: string) => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${msg}\r\n\r\n${foot}`)}`
  const full = build(f.msg)
  if (full.length <= MAILTO_MAX) return full
  // Array.from walks code points, so an emoji is never split in two.
  const chars = Array.from(f.msg)
  let lo = 0
  let hi = chars.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (build(`${chars.slice(0, mid).join('')}…`).length <= MAILTO_MAX) lo = mid
    else hi = mid - 1
  }
  return build(`${chars.slice(0, lo).join('')}…`)
}

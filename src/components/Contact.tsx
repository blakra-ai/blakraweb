import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { company } from '../content/shared'
import type { Intent } from '../content/types'
import { Window } from '../features/observatory/Window'
import { obs } from '../features/observatory/state'
import { locales, useI18n } from '../i18n'
import { pathFor } from '../routes'
import { intents, limits, sendContact, validate, type ContactFields, type FieldErrors } from '../lib/contact'
import { onPulse } from '../motion/pulse'
import { composeMail } from './contactMail'
import { Section } from './Section'
import s from './Contact.module.css'

const endpoint: string = import.meta.env.VITE_CONTACT_ENDPOINT ?? ''
type Status = 'idle' | 'sending' | 'sent' | 'failed' | 'mailed'

interface FieldProps {
  name: 'org' | 'email' | 'msg'
  label: string
  error?: string
  textarea?: boolean
  type?: string
  autoComplete?: string
  placeholder?: string
  maxLength: number
}

/** One field: its label, the control (≥ 3 : 1 border), and its inline error, tied by aria-describedby. */
function Field({ name, label, error, textarea, maxLength, ...input }: FieldProps) {
  const id = `contact-${name}`
  const props = {
    id,
    name,
    maxLength,
    required: true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
    className: s.control,
    ...input,
  }
  return (
    <div className={s.field} data-invalid={error ? '' : undefined}>
      <label htmlFor={id} className={`mono ${s.label}`}>
        {label}
      </label>
      {textarea ? <textarea rows={3} {...props} /> : <input {...props} />}
      {error && (
        <p id={`${id}-error`} className={s.error}>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * 10 Contact, the closing stage (art pass v1): the window with the horizon, the disk grown to
 * fill its right half (painted by the world for kind "contact"); the form on a panel in columns
 * 1–5: eyebrow, H2, lede, three doors as radios (a check mark on the chosen one), three fields,
 * Send in gold (one of the frame's three gold elements), the privacy line; the panel hugs them, and
 * her line stands on the disk's ink, under her ear (under the panel below 1200 px). States: inline
 * errors with a focused summary, sending (aria-busy, fields disabled, text kept), success as a
 * static role="status" that takes focus, failure as an alert that keeps every field's text. A build
 * without an endpoint keeps the same form: Send validates, then opens the visitor's own mail app
 * with the message composed (no fetch), and a status line says so; the address stands above it. On
 * phones the window is a band with the ring at 70 vw and her line inside it, the form plain DOM below.
 */
export function Contact() {
  const { t, locale } = useI18n()
  const c = t.contact
  const ref = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  const mailedRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const [hydrated, setHydrated] = useState(false)
  const [intent, setIntent] = useState<Intent>('commission')
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<FieldErrors>({})
  const door = c.doors[intent]
  const errorKeys = Object.keys(errors) as (keyof FieldErrors)[]

  useEffect(() => {
    // A link such as /?intent=invest#contact (from the investors page) opens the right door.
    const asked = new URLSearchParams(location.search).get('intent') as Intent | null
    if (asked && intents.includes(asked)) setIntent(asked)
    setHydrated(true)
    // In-page links such as the menu's "partner" and "invest" open their door without a reload.
    const onIntent = (e: Event) => {
      const next = (e as CustomEvent<string>).detail as Intent
      if (intents.includes(next)) setIntent(next)
    }
    window.addEventListener('blakra:intent', onIntent)
    return () => window.removeEventListener('blakra:intent', onIntent)
  }, [])

  useEffect(() => {
    if (status === 'sent') doneRef.current?.focus()
    if (status === 'mailed') mailedRef.current?.focus()
  }, [status])

  // The picker's answer starts the message while the field is empty or still holds an earlier answer.
  useEffect(() => {
    let filled = ''
    return onPulse((choice) => {
      const field = formRef.current?.querySelector<HTMLTextAreaElement>('[name="msg"]')
      if (!field || (field.value && field.value !== filled)) return
      filled = choice === 'all' ? `${t.pulse.all} ` : choice ? `${t.pulse.needs[choice].label} ` : ''
      field.value = filled
    })
  }, [t])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'sending') return
    const data = new FormData(e.currentTarget)
    const fields: ContactFields = { intent, org: String(data.get('org') ?? ''), email: String(data.get('email') ?? ''), msg: String(data.get('msg') ?? '') }
    const found = validate(fields)
    setErrors(found)
    if (Object.keys(found).length) {
      // The summary is read first; its links lead to each field.
      if (status === 'mailed') setStatus('idle')
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    if (!endpoint) {
      // No endpoint in this build: the message goes out through the visitor's own mail app. A bot
      // (the honeypot, or an instant submit) gets the same words and opens nothing.
      if (!data.get('website') && performance.now() >= limits.minMs) {
        const link = document.createElement('a')
        link.href = composeMail(company.email, fields, { door: door.label, org: door.org, email: c.email })
        link.click()
        obs.transmitAt = obs.clock
      }
      setStatus('mailed')
      requestAnimationFrame(() => mailedRef.current?.focus())
      return
    }
    setStatus('sending')
    const result = await sendContact(endpoint, fields, {
      website: String(data.get('website') ?? ''),
      elapsedMs: performance.now(),
      lang: locales[locale].lang,
    })
    setStatus(result === 'failed' ? 'failed' : 'sent')
    // The reply signal goes out: the ring pulses from it (World.tsx) and she blinks once.
    if (result !== 'failed') obs.transmitAt = obs.clock
  }

  // The doors: a radio group of buttons; arrows move the choice and the focus.
  const onDoorKey = (e: KeyboardEvent<HTMLButtonElement>, k: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = intents[(k + step + intents.length) % intents.length]
    setIntent(next)
    formRef.current?.querySelector<HTMLElement>(`[role="radio"][value="${next}"]`)?.focus()
  }

  const mail = (
    <a href={`mailto:${company.email}`} className={s.mail}>
      {company.email}
    </a>
  )
  const err = (field: keyof FieldErrors) => (errors[field] ? c.errors[errors[field]!] : undefined)
  const sending = status === 'sending'

  return (
    <Section ref={ref} id="contact" beat="contact" surface="body" station={10} className={s.contact} aria-labelledby="contact-title">
      <Window id="contact" kind="contact" ring className={s.window}>
        <p className={`mono ${s.tag}`} aria-hidden="true">
          10 / 10
        </p>
      </Window>

      {/* The panel: over the window's left columns on desktop, plain DOM under the band on phones. */}
      <div className={`dark ${s.stack}`}>
        <div className={s.panel}>
          <p className="eyebrow mono">{c.eyebrow}</p>
          <h2 id="contact-title" className={`h2 ${s.title}`} data-focus tabIndex={-1}>
            {c.title}
          </h2>
          <p className={`lede ${s.lede}`}>{c.lede}</p>

          {status === 'sent' ? (
            <>
              <div ref={doneRef} className={s.done} role="status" tabIndex={-1}>
                <p>{c.success}</p>
              </div>
              <p className={s.after}>{c.horizon}</p>
              <p className={s.after}>
                {c.direct} {mail}
              </p>
            </>
          ) : (
            <form ref={formRef} className={s.form} method="post" noValidate onSubmit={onSubmit} aria-describedby="contact-privacy" aria-busy={sending || undefined}>
              {!endpoint && (
                <p className={s.direct}>
                  {c.direct} {mail}
                </p>
              )}
              {errorKeys.length > 0 && (
                <div ref={summaryRef} className={s.summary} role="alert" tabIndex={-1}>
                  <b>{c.errorsTitle}</b>
                  {errorKeys.map((k) => (
                    <a key={k} href={`#contact-${k}`} onClick={(e) => { e.preventDefault(); formRef.current?.querySelector<HTMLElement>(`[name="${k}"]`)?.focus() }}>
                      {c.errors[errors[k]!]}
                    </a>
                  ))}
                </div>
              )}
              <fieldset className={s.doors} disabled={sending}>
                <legend className={`mono ${s.label}`} id="contact-doors">
                  {c.doorsLabel}
                </legend>
                <div className={s.pills} role="radiogroup" aria-labelledby="contact-doors">
                  {intents.map((id, k) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      name="intent"
                      value={id}
                      aria-checked={intent === id}
                      tabIndex={intent === id ? 0 : -1}
                      className={`pill ${s.door}`}
                      onClick={() => setIntent(id)}
                      onKeyDown={(e) => onDoorKey(e, k)}
                    >
                      {c.doors[id].label}
                    </button>
                  ))}
                </div>
                <p className={s.hint}>{door.hint}</p>
              </fieldset>
              <fieldset className={s.fields} disabled={sending}>
                <Field name="org" label={door.org} autoComplete="organization" error={err('org')} maxLength={limits.org} />
                <Field name="email" label={c.email} type="email" autoComplete="email" error={err('email')} maxLength={limits.email} />
                <Field name="msg" label={door.msg} placeholder={door.placeholder} textarea error={err('msg')} maxLength={limits.msg} />
              </fieldset>
              {/* The honeypot: hidden from everyone and every reader; a bot that fills it sends nothing. */}
              <div className={s.trap} aria-hidden="true">
                <label>
                  Website
                  <input name="website" type="text" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <div role="alert" className={s.failure}>
                {status === 'failed' && (
                  <p>
                    {c.failure} {mail}
                  </p>
                )}
              </div>
              {status === 'mailed' && (
                <div ref={mailedRef} className={s.done} role="status" tabIndex={-1}>
                  <p>{c.mailFallback}</p>
                </div>
              )}
              <div className={s.send}>
                <button type="submit" className={`pill ${s.submit}`} data-solid disabled={!hydrated || sending} aria-disabled={sending || undefined}>
                  {sending && <i className={s.spin} aria-hidden="true" />}
                  {sending ? c.submitting : door.submit}
                </button>
                <p id="contact-privacy" className={s.privacy}>
                  {c.privacy} <a href={pathFor('privacy', locale)}>{c.privacyLink}</a>
                </p>
              </div>
              <p className={s.after}>{c.horizon}</p>
              <noscript>
                <p className={s.privacy}>
                  {c.noScript} {mail}
                </p>
              </noscript>
            </form>
          )}
        </div>
      {/* Her closing line: on the disk's ink from 1200 px, in the disk on phones, under the panel between (Contact.module.css). */}
      <div className={s.voice}>
        <p className="voice" data-caret>
          {t.navigator.lines.contact}
        </p>
      </div>
      </div>
    </Section>
  )
}

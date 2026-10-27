import { useEffect, useRef, useState, type FormEvent } from 'react'
import { company, times } from '../content/shared'
import type { Intent } from '../content/types'
import { locales, useI18n } from '../i18n'
import { intents, limits, sendContact, validate, type ContactFields, type FieldErrors } from '../lib/contact'
import { onPulse } from '../motion/pulse'
import { useReveals } from '../motion/useReveals'
import { useStage } from '../motion/useStage'
import { poses, type Pose } from '../motion/engine3d/stage'
import { Section } from './Section'
import s from './Contact.module.css'

const endpoint: string = import.meta.env.VITE_CONTACT_ENDPOINT ?? ''
type Status = 'idle' | 'sending' | 'sent' | 'failed'

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
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {textarea ? <textarea rows={4} {...props} /> : <input {...props} />}
      {error && (
        <p id={`${id}-error`} className={s.error}>
          {error}
        </p>
      )}
    </div>
  )
}

/** Tomorrow, 06:00: three doors, one short form that speaks to whoever walked through. */
export function Contact() {
  const { t, locale } = useI18n()
  const c = t.contact
  const ref = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  const [hydrated, setHydrated] = useState(false)
  const [intent, setIntent] = useState<Intent>('commission')
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<FieldErrors>({})
  const door = c.doors[intent]
  useReveals(ref)
  // The event horizon: the camera at the edge of the shadow. Past this line, the problem is ours.
  useStage(ref, { pose: poses.horizon as Pose }, times.tomorrow)

  useEffect(() => {
    // A link such as /?intent=invest#contact (from the investors page) opens the right door.
    const asked = new URLSearchParams(location.search).get('intent') as Intent | null
    if (asked && intents.includes(asked)) setIntent(asked)
    setHydrated(true)
    // In-page links such as the hero's "partner" and "invest" open their door without a reload.
    const onIntent = (e: Event) => {
      const next = (e as CustomEvent<string>).detail as Intent
      if (intents.includes(next)) setIntent(next)
    }
    window.addEventListener('blakra:intent', onIntent)
    return () => window.removeEventListener('blakra:intent', onIntent)
  }, [])

  useEffect(() => {
    if (status === 'sent') doneRef.current?.focus()
  }, [status])

  // The pulse answer starts the message while the field is empty or still holds an earlier answer.
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
    const first = (Object.keys(found) as (keyof FieldErrors)[])[0]
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setStatus('sending')
    const result = await sendContact(endpoint, fields, {
      website: String(data.get('website') ?? ''),
      elapsedMs: performance.now(),
      page: location.pathname,
      lang: locales[locale].lang,
    })
    setStatus(result === 'failed' ? 'failed' : 'sent')
  }

  const mail = (
    <a href={`mailto:${company.email}`} className={s.mail}>
      {company.email}
    </a>
  )
  const err = (field: keyof FieldErrors) => (errors[field] ? c.errors[errors[field]!] : undefined)

  return (
    <Section ref={ref} id="contact" sky="dawn" time={[times.tomorrow, times.tomorrow + 1]} className={s.contact} aria-labelledby="contact-title">
      <div className={s.intro}>
        <p className={s.eyebrow} data-reveal>
          {c.eyebrow}
        </p>
        <h2 id="contact-title" className={s.title} data-reveal data-focus tabIndex={-1}>
          {c.title}
        </h2>
        <p className={s.lede} data-reveal>
          {c.lede}
        </p>
        <p className={s.direct} data-reveal>
          {c.direct} {mail}
        </p>
      </div>

      {status === 'sent' ? (
        <div ref={doneRef} className={s.done} role="status" tabIndex={-1}>
          <p>{c.success}</p>
        </div>
      ) : !endpoint ? (
        <div className={s.done}>
          <p>
            {c.direct} {mail}
          </p>
        </div>
      ) : (
        <form ref={formRef} className={s.form} method="post" noValidate onSubmit={onSubmit} aria-describedby="contact-privacy" data-reveal>
          <fieldset className={s.doors}>
            <legend className={s.label}>{c.doorsLabel}</legend>
            {intents.map((id) => (
              <label key={id} className={s.door} data-checked={intent === id ? '' : undefined}>
                <input type="radio" name="intent" value={id} checked={intent === id} onChange={() => setIntent(id)} className={s.radio} />
                <span className={s.doorLabel}>{c.doors[id].label}</span>
                <span className={s.doorHint}>{c.doors[id].hint}</span>
              </label>
            ))}
          </fieldset>
          <Field name="org" label={door.org} autoComplete="organization" error={err('org')} maxLength={limits.org} />
          <Field name="email" label={c.email} type="email" autoComplete="email" error={err('email')} maxLength={limits.email} />
          <Field name="msg" label={door.msg} placeholder={door.placeholder} textarea error={err('msg')} maxLength={limits.msg} />
          <div className={s.trap} aria-hidden="true">
            <label>
              Website
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className={s.submitRow}>
            <button type="submit" className={s.submit} disabled={!hydrated || status === 'sending'}>
              {status === 'sending' ? c.submitting : door.submit}
              <span className={s.arrow} aria-hidden="true">
                →
              </span>
            </button>
            <p id="contact-privacy" className={s.privacy}>
              {c.privacy} <a href={`${locales[locale].prefix}/privacy/`}>{c.privacyLink}</a>
            </p>
          </div>
          <p className={s.horizon}>{c.horizon}</p>
          <div role="alert" className={s.failure}>
            {status === 'failed' && (
              <p>
                {c.failure} {mail}
              </p>
            )}
          </div>
          <noscript>
            <p className={s.privacy}>
              {c.noScript} {mail}
            </p>
          </noscript>
        </form>
      )}
    </Section>
  )
}

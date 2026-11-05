import { useEffect, useId, useRef, useState } from 'react'
import { availableLocales, locales, useI18n } from '../i18n'
import { translatePath, type Route } from '../routes'
import s from './LanguageSwitch.module.css'

/** A disclosure of plain links: each language is a real page, so it works without JS too. */
export function LanguageSwitch({ route, variant }: { route: Route; variant: 'header' | 'footer' }) {
  const { locale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('click', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('click', close)
    }
  }, [open])

  const links = availableLocales.map((l) => (
    <li key={l}>
      <a href={translatePath(route, l)} hrefLang={locales[l].lang} lang={locales[l].lang} aria-current={l === locale ? 'true' : undefined}>
        {variant === 'footer' ? locales[l].label : <><span className={s.code}>{locales[l].short}</span> {locales[l].label}</>}
      </a>
    </li>
  ))

  if (variant === 'footer') {
    return (
      <nav aria-label={t.ui.language} className={s.footer}>
        <ul>{links}</ul>
      </nav>
    )
  }

  return (
    <div ref={ref} className={s.header}>
      <button type="button" className={s.toggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className="sr-only">{t.ui.language}: </span>
        {locales[locale].short}
      </button>
      <ul id={id} className={s.menu} hidden={!open}>
        {links}
      </ul>
    </div>
  )
}

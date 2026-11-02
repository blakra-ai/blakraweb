import { useEffect, useId, useRef, useState } from 'react'
import { company } from '../content/shared'
import { GaugeChip, useStation } from '../features/observatory/Gauge'
import { availableLocales, locales, useI18n } from '../i18n'
import { useMotion } from '../motion/MotionProvider'
import { pathFor, translatePath, type Route } from '../routes'
import { LanguageSwitch } from './LanguageSwitch'
import s from './Header.module.css'

/** The mark: a black hole, its disk passing in front of the shadow. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 16" aria-hidden="true">
      <path d="M2.2 9.2C4.6 4.2 19.4 4.2 21.8 9.2" fill="none" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.55" />
      <circle cx="12" cy="8" r="4.3" fill="currentColor" />
      <circle cx="12" cy="8" r="2.9" fill="var(--body, #0b0b0d)" />
      <path d="M1 9.6C4 12.6 20 12.6 23 9.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** The motion switch: a toggle button (aria-pressed) with a constant name; the state word is visual. */
function MotionToggle({ className }: { className?: string }) {
  const { t } = useI18n()
  const { userOff, setUserOff } = useMotion()
  return (
    <button type="button" className={`pill ${s.toggle}${className ? ` ${className}` : ''}`} aria-pressed={!userOff} aria-label={t.ui.motion} onClick={() => setUserOff(!userOff)}>
      <i className={s.toggleDot} aria-hidden="true" />
      <span aria-hidden="true">
        {t.ui.motion} {userOff ? t.ui.off : t.ui.on}
      </span>
    </button>
  )
}

/**
 * The header (storyboard d-01 / m-01 / m-menu): the mark, five links, the four-language menu, the
 * motion switch and the call to action on desktop; below 1100 px a Menu panel holds the links,
 * the languages and the switch, and the bar keeps the station chip (home) and a compact call to
 * action from 360 px. The bar is solid body colour with the page's hairline, inset 24 px.
 */
export function Header({ route }: { route: Route }) {
  const { t, locale } = useI18n()
  const home = route.id === 'home'
  const { systemReduced } = useMotion()
  const [open, setOpen] = useState(false)
  const station = useStation()
  const light = home && (station === 7 || station === 8)
  const panelRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const homePath = pathFor('home', locale)
  // Each link carries the station it lands on (the gauge's numbers), see storyboard.md.
  const nav = [
    { label: t.ui.nav.work, href: `${homePath}#work`, station: '04' },
    { label: t.ui.nav.engine, href: `${homePath}#engine`, station: '03' },
    { label: t.ui.nav.products, href: `${homePath}#products`, station: '07' },
    { label: t.ui.nav.people, href: `${homePath}#people`, station: '08' },
  ]

  // The Menu panel: a modal dialog. Escape closes it (focus back on its button), a link closes it,
  // Tab wraps inside it, and the page behind it does not scroll.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    const focusables = () => [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        burgerRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('a[href]')) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    panel.addEventListener('click', onClick)
    return () => {
      root.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      panel.removeEventListener('click', onClick)
    }
  }, [open])

  return (
    <header className={s.header}>
      <div className={s.bar} data-surface={light ? 'light' : undefined}>
        <a href={homePath} className={s.brand} aria-label={`${company.name}, ${t.ui.home}`}>
          <Mark className={s.mark} />
          <span className={s.word}>{company.name}</span>
        </a>
        <nav className={`mono ${s.nav}`} aria-label="Primary">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} aria-current={!home && item.href === route.path ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={s.right}>
          {home && <GaugeChip className={s.chip} />}
          <div className={s.lang}>
            <LanguageSwitch route={route} variant="header" />
          </div>
          {!systemReduced && <MotionToggle className={s.motion} />}
          <a href={`${homePath}#contact`} className={`pill ${s.cta}`}>
            {t.ui.cta}
          </a>
          <button
            ref={burgerRef}
            type="button"
            className={s.burger}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={t.ui.menu}
            onClick={() => setOpen(!open)}
          >
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* The Menu panel (m-menu): links on hairlines with their station numbers, the four languages,
          the motion switch, and the call to action at the foot. */}
      <div ref={panelRef} id={panelId} className={s.panel} role="dialog" aria-modal="true" aria-label={t.ui.menu} hidden={!open}>
        <nav className={s.links} aria-label="Primary">
          {nav.map((item) => (
            <a key={item.href} href={item.href} aria-current={!home && item.href === route.path ? 'page' : undefined}>
              {item.label}
              <span className="mono" aria-hidden="true">
                {item.station}
              </span>
            </a>
          ))}
        </nav>
        <div className={s.group}>
          <p className={`mono ${s.groupTitle}`} id={`${panelId}-lang`}>
            {t.ui.language}
          </p>
          <ul className={s.langs} aria-labelledby={`${panelId}-lang`}>
            {availableLocales.map((l) => (
              <li key={l}>
                <a href={translatePath(route, l)} hrefLang={locales[l].lang} lang={locales[l].lang} aria-current={l === locale ? 'true' : undefined} className="mono">
                  {locales[l].short}
                </a>
              </li>
            ))}
          </ul>
        </div>
        {!systemReduced && (
          <div className={s.group}>
            <div className={s.toggleRow}>
              <span className={`mono ${s.groupTitle}`}>{t.ui.motion}</span>
              <MotionToggle />
            </div>
          </div>
        )}
        <div className={s.panelCta}>
          <a href={`${homePath}#contact`} className="pill" data-solid>
            {t.ui.cta}
          </a>
          <a href={`${homePath}#pulse`} className="pill">
            {t.prologue.cue}
          </a>
          <span className={`mono ${s.facts}`}>{t.prologue.facts}</span>
        </div>
      </div>
    </header>
  )
}

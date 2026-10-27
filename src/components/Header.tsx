import { useEffect, useRef } from 'react'
import { company } from '../content/shared'
import { useI18n } from '../i18n'
import { useMotion } from '../motion/MotionProvider'
import { pathFor, type Route } from '../routes'
import { LanguageSwitch } from './LanguageSwitch'
import s from './Header.module.css'

/** The mark: a black hole, its disk passing in front of the shadow. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 16" aria-hidden="true">
      <path d="M2.2 9.2C4.6 4.2 19.4 4.2 21.8 9.2" fill="none" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.55" />
      <circle cx="12" cy="8" r="4.3" fill="currentColor" />
      <circle cx="12" cy="8" r="2.9" fill="var(--page, #050507)" />
      <path d="M1 9.6C4 12.6 20 12.6 23 9.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Header({ route }: { route: Route }) {
  const { t, locale } = useI18n()
  const home = route.id === 'home'
  const { userOff, systemReduced, setUserOff } = useMotion()
  const menuRef = useRef<HTMLDetailsElement>(null)

  const homePath = pathFor('home', locale)
  const nav = [
    { label: t.ui.nav.work, href: `${homePath}#day` },
    { label: t.ui.nav.engine, href: `${homePath}#engine` },
    { label: t.ui.nav.products, href: `${homePath}#products` },
    { label: t.ui.nav.people, href: `${homePath}#people` },
    { label: t.ui.nav.investors, href: pathFor('investors', locale) },
  ]

  // Below 1100 px the links live in a menu: a <details>, so it opens without JS too. With JS it
  // closes on a link, on Escape (focus back on its button) and on a click outside.
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const close = (e: Event) => {
      if (!menu.open) return
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return
        menu.open = false
        menu.querySelector('summary')?.focus()
        return
      }
      const target = e.target as Element
      if (menu.contains(target) && !target.closest('a')) return
      menu.open = false
    }
    document.addEventListener('keydown', close)
    document.addEventListener('click', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('click', close)
    }
  }, [])

  const links = nav.map((item) => (
    <li key={item.href}>
      <a href={item.href} aria-current={!home && item.href === route.path ? 'page' : undefined}>
        {item.label}
      </a>
    </li>
  ))

  return (
    <header className={s.header}>
      {/* Two fixed layers: the bar blends with the sky (difference), the actions keep their own colours. */}
      <div className={s.bar}>
        <a href={homePath} className={s.brand} aria-label={`${company.name}, ${t.ui.home}`}>
          <Mark className={s.mark} />
          <span className={s.word}>{company.name}</span>
        </a>
        <nav className={s.nav} aria-label="Primary">
          <ul>{links}</ul>
        </nav>
        {!systemReduced && (
          <button type="button" className={s.motion} aria-pressed={userOff} aria-label={t.ui.pauseMotion} title={t.ui.pauseMotion} onClick={() => setUserOff(!userOff)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {userOff ? <path d="M5 3.5v9l7-4.5z" fill="currentColor" /> : <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
            </svg>
          </button>
        )}
      </div>
      <div className={s.actions}>
        <div className={s.lang}>
          <LanguageSwitch route={route} variant="header" />
        </div>
        <a href={`${homePath}#contact`} className={s.cta}>
          {t.ui.cta}
        </a>
          <details ref={menuRef} className={s.menu}>
            <summary className={s.menuButton}>
              <span className={s.menuIcon} aria-hidden="true" />
              <span className="sr-only">{t.ui.menu}</span>
            </summary>
            <div className={s.sheet}>
              <nav aria-label="Primary">
                <ul className={s.sheetLinks}>{links}</ul>
              </nav>
              {/* Phones: the languages and the motion switch, which have no room in the bar there. */}
              <div className={s.sheetLang}>
                <LanguageSwitch route={route} variant="footer" />
              </div>
              {!systemReduced && (
                <button type="button" className={s.sheetMotion} role="switch" aria-checked={!userOff} onClick={() => setUserOff(!userOff)}>
                  {t.ui.motion} <span aria-hidden="true">{userOff ? t.ui.off : t.ui.on}</span>
                </button>
              )}
            </div>
          </details>
      </div>
    </header>
  )
}

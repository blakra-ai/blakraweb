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

  const homePath = pathFor('home', locale)
  const nav = [
    { label: t.ui.nav.work, href: `${homePath}#day` },
    { label: t.ui.nav.engine, href: `${homePath}#engine` },
    { label: t.ui.nav.products, href: `${homePath}#products` },
    { label: t.ui.nav.people, href: `${homePath}#people` },
    { label: t.ui.nav.investors, href: pathFor('investors', locale) },
  ]

  return (
    <header className={s.header}>
      {/* Two fixed layers: the bar blends with the sky (difference), the actions keep their own colours. */}
      <div className={s.bar}>
        <a href={homePath} className={s.brand} aria-label={`${company.name}, ${t.ui.home}`}>
          <Mark className={s.mark} />
          <span className={s.word}>{company.name}</span>
        </a>
        <nav className={s.nav} aria-label="Primary">
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
        {!systemReduced && (
          <button type="button" className={s.motion} aria-pressed={userOff} aria-label={t.ui.pauseMotion} title={t.ui.pauseMotion} onClick={() => setUserOff(!userOff)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {userOff ? <path d="M5 3.5v9l7-4.5z" fill="currentColor" /> : <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
            </svg>
          </button>
        )}
      </div>
      <div className={s.actions}>
        <LanguageSwitch route={route} variant="header" />
        <a href={`${homePath}#contact`} className={s.cta}>
          {t.ui.cta}
        </a>
      </div>
    </header>
  )
}

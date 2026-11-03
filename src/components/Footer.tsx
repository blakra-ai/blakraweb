import { company } from '../content/shared'
import { useI18n } from '../i18n'
import { useMotion } from '../motion/MotionProvider'
import { pathFor, type Route } from '../routes'
import { Mark, Wordmark } from './Header'
import { LanguageSwitch } from './LanguageSwitch'
import { Section } from './Section'
import s from './Footer.module.css'

export function Footer({ route }: { route: Route }) {
  const { t, locale } = useI18n()
  const { userOff, systemReduced, setUserOff } = useMotion()
  return (
    // On the home page the footer is the film's end card: a screen of its own over the complete system.
    <Section as="footer" className={s.footer} data-end={route.id === 'home' ? '' : undefined}>
      <div className={s.top}>
        <p className={s.line}>{t.footer.line}</p>
        <a className={s.email} href={`mailto:${company.email}`}>
          {company.email}
        </a>
      </div>
      <p className={s.join}>
        {t.footer.join} <a href={`mailto:${company.email}`}>{company.email}</a>
      </p>
      <div className={s.bottom}>
        <p className={s.word} aria-hidden="true">
          <Mark className={s.wordMark} />
          <Wordmark className={s.wordType} />
        </p>
        <nav aria-label="Footer">
          <ul className={s.links}>
            <li>
              <a href={pathFor('about', locale)}>{t.ui.nav.about}</a>
            </li>
            <li>
              <a href={pathFor('investors', locale)}>{t.footer.investors}</a>
            </li>
            <li>
              <a href={pathFor('privacy', locale)}>{t.footer.privacy}</a>
            </li>
            <li>
              <a href={pathFor('legal', locale)}>{t.footer.legal}</a>
            </li>
            {company.social.map((l) => (
              <li key={l.href}>
                <a href={l.href} rel="me noopener" target="_blank">
                  {l.label}
                  <span className="sr-only"> ({t.ui.newTab})</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <LanguageSwitch route={route} variant="footer" />
        <div className={s.end}>
          {!systemReduced && (
            <button type="button" className={s.motion} role="switch" aria-checked={!userOff} onClick={() => setUserOff(!userOff)}>
              {t.ui.motion} <span aria-hidden="true">{userOff ? t.ui.off : t.ui.on}</span>
            </button>
          )}
          {/* The year is the build's; a visit after New Year before the next build keeps it quietly. */}
          <p className={s.legal} suppressHydrationWarning>
            © {company.founded}–{new Date().getFullYear()} {company.legalName}
          </p>
        </div>
      </div>
    </Section>
  )
}

import { useRef } from 'react'
import { useI18n } from '../i18n'
import { useHold } from '../motion/useHold'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Hero.module.css'

/**
 * Acts I–II of the film. The page opens on scattered pieces and the plain promise; as the
 * reader scrolls, the hero holds the screen while a black hole forms and gravity pulls the
 * pieces into a disk of seven colours. The words leave first (moved, never faded), then the
 * tagline holds over the formed disk.
 */
export function Hero() {
  const { t, locale } = useI18n()
  const p = t.prologue
  const ref = useRef<HTMLElement>(null)
  useHold(ref)

  return (
    <Section ref={ref} id="top" beat="hero" className={s.hero} aria-labelledby="title">
      <div className={s.frame} data-pin>
        {/* Without WebGL: the wordmark and the shadow, drawn by the page itself. */}
        <div className={s.still} aria-hidden="true">
          <span className={s.word}>BLAKRA</span>
          <span className={s.hole} />
        </div>
        <div className={s.copy}>
          <p className={s.eyebrow}>{p.eyebrow}</p>
          <h1 id="title" className={s.title}>
            <span className={s.line}>{p.title.before}</span>{' '}
            <span className={s.line}>
              <em>{p.title.human}</em>
              {p.title.after}
            </span>
          </h1>
          <p className={s.lede}>{p.lede}</p>
          <div className={s.actions}>
            <a className={s.primary} data-magnetic href={`${pathFor('home', locale)}#contact`}>
              {t.ui.cta}
            </a>
            <a className={s.secondary} href="#pulse">
              {p.cue}
            </a>
          </div>
          <p className={s.also}>
            {p.also} <a href={`${pathFor('home', locale)}?intent=partner#contact`}>{t.contact.doors.partner.label}</a>
            {' · '}
            <a href={pathFor('investors', locale)}>{t.contact.doors.invest.label}</a>
          </p>
          <p className={s.facts}>{p.facts}</p>
        </div>
        <p className={s.tagline} aria-hidden="true">
          <em>{t.footer.line}</em>
        </p>
      </div>
    </Section>
  )
}

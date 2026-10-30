import { useRef } from 'react'
import { yantraPath } from '../features/navigator/yantra'
import { useI18n } from '../i18n'
import { useReveal } from '../motion/useReveal'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Hero.module.css'

/**
 * The hero: the Navigator. The helmet assembles right of the words as the page opens; its visor
 * reflects the black hole he is looking at; the cursor is an X-ray lens that shows what he is
 * made of. The words: the promise, bottom left, at the scale of a poster. As the page scrolls
 * he walks to the dock in the header and stays with the reader.
 */
export function Hero() {
  const { t, locale } = useI18n()
  const p = t.prologue
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)

  return (
    <Section ref={ref} id="top" beat="hero" className={s.hero} aria-labelledby="title">
      {/* Without WebGL: the Navigator drawn by the page itself, the mark on his forehead. */}
      <div className={s.still} aria-hidden="true">
        <svg viewBox="0 0 200 230" className={s.stillHelmet} focusable="false">
          <ellipse cx="100" cy="206" rx="62" ry="12" className={s.stillCollar} />
          <circle cx="100" cy="110" r="88" className={s.stillShell} />
          <rect x="34" y="72" width="132" height="84" rx="26" className={s.stillVisor} />
          <circle cx="100" cy="114" r="18" className={s.stillHole} />
          <ellipse cx="100" cy="116" rx="40" ry="6" className={s.stillDisk} />
          <path d="M60 52c12-8 68-8 80 0" className={s.stillMark} />
        </svg>
      </div>

      <div className={s.lead}>
        <p className={s.eyebrow}>{p.eyebrow}</p>
        <p className={s.lede}>{p.lede}</p>
        <div className={s.actions}>
          <a className={s.primary} data-magnetic href={`${pathFor('home', locale)}#contact`}>
            {t.ui.cta}
          </a>
          <a className={s.secondary} href="#pulse">
            {p.cue} <span aria-hidden="true">↓</span>
          </a>
        </div>
        <p className={s.also}>
          {p.also} <a href={`${pathFor('home', locale)}?intent=partner#contact`}>{t.contact.doors.partner.label}</a>
          {' · '}
          <a href={pathFor('investors', locale)}>{t.contact.doors.invest.label}</a>
        </p>
      </div>

      <h1 id="title" className={s.title}>
        <span className={s.line}>{p.title.before}</span>
        <span className={s.line}>
          <em>{p.title.human}</em>
          {p.title.after}
        </span>
      </h1>

      <p className={s.card}>
        <svg viewBox="-1.1 -1.1 2.2 2.2" className={s.cardYantra} aria-hidden="true">
          <path d={yantraPath(6)} />
          <circle r="0.075" />
        </svg>
        <span>{p.facts}</span>
      </p>
    </Section>
  )
}

import { useRef } from 'react'
import { yantraPath } from '../features/navigator/yantra'
import { useI18n } from '../i18n'
import { useReveal } from '../motion/useReveal'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Hero.module.css'

/**
 * The hero: the Navigator. She stands right of the words as the page opens, her systems lighting
 * root to crown; the cursor is an X-ray lens that shows what she is made of. The words: the
 * promise, bottom left, at the scale of a poster. As the page scrolls she glides to the dock in
 * the header and stays with the reader. Before the world loads (and without a GPU) the page
 * draws her still in the same frame, so the hand-off to the figure does not jump.
 */
export function Hero() {
  const { t, locale } = useI18n()
  const p = t.prologue
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)

  return (
    <Section ref={ref} id="top" beat="hero" className={s.hero} aria-labelledby="title">
      {/* Before the world loads, and without WebGL: the Navigator drawn by the page itself, framed as
          the world frames her (head 30% of the screen, eyes at 70% across and 36% down). */}
      <div className={s.still} aria-hidden="true">
        <svg viewBox="0 0 200 230" className={s.stillFace} focusable="false">
          {/* Collar and neck. */}
          <path d="M72 158 L70 188 M128 158 L130 188" className={s.stillLine} />
          <path d="M28 196c18-12 126-12 144 0" className={s.stillCollar} />
          <path d="M40 200c14-6 106-6 120 0" className={s.stillLine} />
          {/* The ears, swept up and out. */}
          <path d="M58 98c-8-14-16-34-22-52c14 10 24 24 30 38" className={s.stillEar} />
          <path d="M142 98c8-14 16-34 22-52c-14 10-24 24-30 38" className={s.stillEar} />
          {/* The head. */}
          <ellipse cx="100" cy="100" rx="44" ry="60" className={s.stillHead} />
          {/* The eyes: a black pupil, a seven-band disk, a thin gold limb. */}
          {[78, 122].map((x) => (
            <g key={x} transform={`translate(${x} 90)`}>
              <ellipse rx="12" ry="7.5" className={s.stillWhite} />
              <circle r="8.6" className={s.stillLimb} />
              {[8, 7.2, 6.4, 5.6, 4.8, 4.2, 3.6].map((r, i) => (
                <circle key={r} r={r} className={i % 2 ? s.stillBandLight : s.stillBand} />
              ))}
              <circle r="3.2" className={s.stillPupil} />
              <circle cx="-2" cy="-2.4" r="1" className={s.stillGlint} />
            </g>
          ))}
          {/* The mouth, closed. */}
          <path d="M91 131c5 3 13 3 18 0" className={s.stillLine} />
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

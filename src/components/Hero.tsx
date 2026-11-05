import { Voice } from '../features/observatory/Line'
import heroStill from '../assets/observatory/hero-still.jpg'
import heroStillPhone from '../assets/observatory/hero-still-phone.webp'
import { Window } from '../features/observatory/Window'
import { chip } from '../features/observatory/gaugeMath'
import { useI18n } from '../i18n'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Hero.module.css'

/**
 * 01 Hero (storyboard d-01 / m-01): one framed window onto the world. Words in columns 1–6
 * (eyebrow, H1, lede, the call to action and the cue), the world in 7–12: the lensing ring at
 * columns 9–10 (painted by World.tsx), its line on the object's tangent, the facts in the foot.
 * The guide (the Mecha roe deer) rises through the ring's lower-right quadrant, painted by the world; on phones the
 * window's lower band shows her still (hero-still-phone.webp). All words are DOM; nothing but the world moves.
 */
export function Hero() {
  const { t, locale } = useI18n()
  const p = t.prologue

  return (
    <Section id="top" beat="hero" surface="body" station={1} className={s.hero} aria-labelledby="title" data-loop>
      <Window id="hero" kind="hero" ring still={heroStill} stillPhone={heroStillPhone} className={s.window}>
        {/* Phones: gold suction ripples contract into the still's ring (CSS only; paused off screen). */}
        <svg className={`m-only ${s.ripples}`} viewBox="0 0 780 900" aria-hidden="true">
          <circle cx="198" cy="402" r="206" />
          <circle cx="198" cy="402" r="206" />
          <circle cx="198" cy="402" r="206" />
        </svg>
        <div className={s.inner}>
          <p className={`mono ${s.tag}`} aria-hidden="true">
            {chip(1)}
          </p>


          <div className={s.words}>
            <p className={`eyebrow mono ${s.eyebrow}`}>{p.eyebrow}</p>
            <h1 id="title" className={`h1 ${s.title}`} data-focus tabIndex={-1}>
              {p.title.before} <span className={s.human}>{p.title.human}</span>
              {p.title.after}
            </h1>
            <p className={`lede ${s.lede}`}>
              <span className="d-only">{p.lede}</span>
              <span className="m-only">{p.ledeShort}</span>
            </p>
            <div className={s.actions}>
              <a className="pill" data-cta href={`${pathFor('home', locale)}#contact`}>
                {t.ui.cta}
              </a>
              <a className={`mono ${s.cue}`} href="#pulse">
                {p.cue} <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          {/* The hole is the guide: its line on the object's tangent, right of the ring, centred on it (Line.tsx). */}
          <div className={s.voice}>
            <Voice text={t.navigator.lines.hero} />
          </div>

          <p className={`mono ${s.foot}`}>{p.facts}</p>
        </div>
      </Window>
    </Section>
  )
}

import { Voice } from '../features/observatory/Line'
import heroStill from '../assets/observatory/hero-still.jpg'
import heroStillPhone from '../assets/observatory/hero-still-phone.jpg'
import { Window } from '../features/observatory/Window'
import { chip } from '../features/observatory/gauge'
import { useI18n } from '../i18n'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Hero.module.css'

/**
 * 01 Hero (storyboard d-01 / m-01): one framed window onto the world. Words in columns 1–6
 * (eyebrow, H1, lede, the call to action and the cue), the world in 7–12: the lensing ring at
 * columns 9–10 and the guide at the lower-right rim (both painted by World.tsx at the anchors
 * `data-world-anchor`; her place is also published as `--guide-x` / `--guide-y` on the window, read
 * by windows.ts), her line under the ring in columns 7–9, the facts in the foot. No layer readout here (revision 1, item 7): layers appear only where they are the subject. All words are DOM; nothing but the world moves.
 */
export function Hero() {
  const { t, locale } = useI18n()
  const p = t.prologue
  const title = `${p.title.before} ${p.title.human}${p.title.after}`

  return (
    <Section id="top" beat="hero" surface="body" station={1} className={s.hero} aria-labelledby="title">
      <Window id="hero" kind="hero" ring still={heroStill} stillPhone={heroStillPhone} className={s.window}>
        <div className={s.inner}>
          <p className={`mono ${s.tag}`} aria-hidden="true">
            {chip(1)}
          </p>


          <div className={s.words}>
            <p className={`eyebrow mono ${s.eyebrow}`}>{p.eyebrow}</p>
            <h1 id="title" className={`h1 ${s.title}`} data-focus tabIndex={-1}>
              {title}
            </h1>
            <p className={`lede ${s.lede}`}>{p.lede}</p>
            <div className={s.actions}>
              <a className="pill" data-cta href={`${pathFor('home', locale)}#contact`}>
                {t.ui.cta}
              </a>
              <a className={`mono ${s.cue}`} href="#pulse">
                {p.cue} <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          {/* The world's places: the ring at columns 9–10 and the guide at the lower-right rim, cut by the frame. */}
          <div className={s.world} aria-hidden="true">
            <div className={s.ring} data-world-anchor="hero-ring" />
            <div className={s.guide} data-world-anchor="hero-guide" />
          </div>

          {/* Her line: the full text in the DOM, revealed as typed (Line.tsx); labelled with her name. */}
          <div className={s.voice}>
            <p className={`mono ${s.voiceTag}`}>
              <b>{t.navigator.name}</b>
            </p>
            <Voice text={t.navigator.lines.hero} />
          </div>

          <p className={`mono ${s.foot}`}>{p.facts}</p>
        </div>
      </Window>
    </Section>
  )
}

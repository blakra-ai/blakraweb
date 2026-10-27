import { useRef } from 'react'
import { times } from '../content/shared'
import { useI18n } from '../i18n'
import { gsap } from '../motion/gsap'
import { useMotionSetup } from '../motion/useMotionSetup'
import { useStage } from '../motion/useStage'
import { poses, type Pose } from '../motion/engine3d/stage'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Hero.module.css'

/**
 * First screen: what BLAKRA builds, said plainly, then the work in one sentence and the
 * confirmed facts. Behind it, one centre holding everything in orbit: the tagline, shown.
 */
export function Hero() {
  const { t, locale } = useI18n()
  const p = t.prologue
  const ref = useRef<HTMLElement>(null)

  // On phones the hole sits above the headline, at full strength.
  useStage(ref, { pose: poses.hero as Pose, narrow: { fade: 1 } }, times.prologue)

  // Exit only: the prerendered H1 is the LCP element and must never start hidden.
  useMotionSetup(ref, (root) => {
    const trigger = { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.4 }
    gsap.to('[data-line]', { yPercent: (i) => -20 - i * 16, ease: 'none', scrollTrigger: trigger })
    gsap.to('[data-fade]', { y: -30, opacity: 0, ease: 'none', scrollTrigger: { ...trigger, end: '55% top' } })
  })

  return (
    <Section ref={ref} id="top" sky="predawn" time={[times.prologue, times.prologue]} className={s.hero} aria-labelledby="title">
      <div className={s.copy}>
        <p className={s.eyebrow}>
          <span className={s.dot} aria-hidden="true" />
          {p.eyebrow}
        </p>
        <h1 id="title" className={s.title}>
          <span className={s.line} data-line>
            {p.title.before}
          </span>{' '}
          <span className={s.line} data-line>
            <em>{p.title.human}</em>
            {p.title.after}
          </span>
        </h1>
        <p className={s.lede} data-fade>
          {p.lede}
        </p>
        <div className={s.actions} data-fade>
          <a className={s.primary} href={`${pathFor('home', locale)}#contact`}>
            {t.ui.cta}
            <span aria-hidden="true">→</span>
          </a>
          <a className={s.secondary} href="#pulse">
            {p.cue}
            <span aria-hidden="true">↓</span>
          </a>
        </div>
        <p className={s.also} data-fade>
          {p.also}{' '}
          <a href={`${pathFor('home', locale)}?intent=partner#contact`}>{t.contact.doors.partner.label}</a>
          {' · '}
          <a href={pathFor('investors', locale)}>{t.contact.doors.invest.label}</a>
        </p>
        <p className={s.facts} data-fade>
          {p.facts}
        </p>
      </div>
    </Section>
  )
}

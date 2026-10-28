import { useRef } from 'react'
import { times } from '../content/shared'
import { useI18n } from '../i18n'
import { useReveals } from '../motion/useReveals'
import { useStage } from '../motion/useStage'
import { poses, type Pose } from '../motion/engine3d/stage'
import { Section } from './Section'
import s from './Process.module.css'

/**
 * How we work: exact before expensive. Behind it, a request falls toward the core and is
 * stretched into one exact line, its three bright segments the three steps. Then the
 * commitments in a contract's plain words, and who we are not for.
 */
export function Process() {
  const { t } = useI18n()
  const p = t.process
  const ref = useRef<HTMLElement>(null)
  useReveals(ref)
  useStage(ref, { pose: poses.infall as Pose }, times.process)
  return (
    <Section ref={ref} id="approach" beat="process" sky="ink" time={[times.process, times.process]} className={s.process} aria-labelledby="process-title">
      <header className={s.head}>
        <p className={s.eyebrow} data-reveal>
          {p.eyebrow}
        </p>
        <h2 id="process-title" className={s.title} data-reveal data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.lede} data-reveal>
          {p.lede}
        </p>
      </header>
      <ol className={s.steps}>
        {p.steps.map((step, i) => (
          <li key={step.name} data-reveal>
            <span className={s.index} aria-hidden="true">
              0{i + 1}
            </span>
            <h3 className={s.name}>{step.name}</h3>
            <p className={s.text}>{step.text}</p>
          </li>
        ))}
      </ol>
      <ul className={s.terms} data-reveal>
        {p.terms.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ul>
      <div className={s.foot} data-reveal>
        <p className={s.shapes}>{p.shapes}</p>
        <p className={s.notFit}>{p.notFit}</p>
      </div>
    </Section>
  )
}

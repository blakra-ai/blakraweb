import { useRef } from 'react'
import { stationAt } from '../features/experience/timeline'
import { useI18n } from '../i18n'
import { useActSteps } from '../motion/useActSteps'
import { Section } from './Section'
import s from './Process.module.css'

const moments = Array.from({ length: 5 }, (_, k) => stationAt(k))

/**
 * Act VI of the film: how we work. The camera settles on one stable orbit around the core and
 * five stations come round it, lighting in turn: the commitments, read from the first one you
 * meet (an NDA) to the last, the key (you own the code and the data). Each term lights here at
 * the moment its station does. The three steps sit above them, and who we are not for below.
 */
export function Process() {
  const { t } = useI18n()
  const p = t.process
  const ref = useRef<HTMLElement>(null)
  const { passed } = useActSteps(ref, 'process', moments)
  // The terms in the order the orbit brings them: the NDA first, ownership last.
  const terms = [...p.terms].reverse()

  return (
    <Section ref={ref} id="approach" beat="process" className={s.process} aria-labelledby="process-title">
      <div className={s.pin} data-pin>
        <div className={s.text}>
          <p className={s.eyebrow}>{p.eyebrow}</p>
          <h2 id="process-title" className={s.title} data-focus tabIndex={-1}>
            {p.title}
          </h2>
          <p className={s.lede}>{p.lede}</p>
          <ol className={s.steps}>
            {p.steps.map((step, i) => (
              <li key={step.name}>
                <span className={s.index} aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className={s.name}>{step.name}</h3>
                <p className={s.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
          <ol className={s.terms}>
            {terms.map((term, k) => (
              <li key={term} data-lit={passed === null || k < passed ? '' : undefined} data-key={k === terms.length - 1 ? '' : undefined}>
                <span className={s.station} aria-hidden="true" />
                {term}
              </li>
            ))}
          </ol>
          <div className={s.foot}>
            <p className={s.shapes}>{p.shapes}</p>
            <p className={s.notFit}>{p.notFit}</p>
          </div>
        </div>
      </div>
    </Section>
  )
}

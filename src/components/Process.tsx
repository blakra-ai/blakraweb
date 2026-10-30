import { useRef, type CSSProperties } from 'react'
import { useI18n } from '../i18n'
import { useReveal } from '../motion/useReveal'
import { Section } from './Section'
import s from './Process.module.css'

/**
 * The pre-flight checklist: the terms, without fear. The three steps as the flight plan, then
 * the commitments as the checklist clipped to a suit's wrist, each ticked as the scroll reaches
 * it: NDA first, a fixed scope and price, a named engineer, a reply within 24 hours, and the
 * last, the key: you own the code and the data.
 */
export function Process() {
  const { t } = useI18n()
  const p = t.process
  const ref = useRef<HTMLElement>(null)
  useReveal(ref, 0.3)
  // In the order a project meets them: the NDA first, ownership last.
  const terms = [...p.terms].reverse()

  return (
    <Section ref={ref} id="approach" beat="checklist" surface="ink" className={s.process} aria-labelledby="process-title">
      <div className={s.text}>
        <p className={s.eyebrow}>{p.eyebrow}</p>
        <h2 id="process-title" className={s.title} data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.lede}>{p.lede}</p>
        <ol className={s.steps}>
          {p.steps.map((step, i) => (
            <li key={step.name} style={{ '--i': i } as CSSProperties}>
              <span className={s.index} aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className={s.name}>{step.name}</h3>
              <p className={s.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
        <div className={s.foot}>
          <p className={s.shapes}>{p.shapes}</p>
          <p className={s.notFit}>{p.notFit}</p>
        </div>
      </div>

      <aside className={s.card} aria-label={p.eyebrow}>
        <p className={s.cardHead}>
          <span>BLAKRA</span>
          <span>{p.eyebrow}</span>
        </p>
        <ol className={s.terms}>
          {terms.map((term, k) => (
            <li key={term} data-key={k === terms.length - 1 ? '' : undefined} style={{ '--i': k } as CSSProperties}>
              <span className={s.box} aria-hidden="true">
                <svg viewBox="0 0 16 16">
                  <path d="M3 8.5l3.2 3L13 4.5" pathLength="1" />
                </svg>
              </span>
              <span className={s.term}>{term}</span>
            </li>
          ))}
        </ol>
      </aside>
    </Section>
  )
}

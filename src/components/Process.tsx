import { useI18n } from '../i18n'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Work.module.css'

const two = (n: number) => String(n).padStart(2, '0')

/**
 * 07 How we work: the headline and lede at the left, the three steps as a full-width row under very
 * large numerals on hairlines, then the commitments in an ink band with the call to action as its
 * sixth cell. Phones: the steps as a timeline, the band under it.
 */
export function Process() {
  const { t, locale } = useI18n()
  return (
    <Section id="approach" beat="checklist" surface="body" station={7} className={`${s.work} ${s.processSection}`} aria-labelledby="process-title">
      <div className={s.processHead}>
        <p className="eyebrow mono">
          {two(7)} / 10 &nbsp;·&nbsp; {t.process.eyebrow}
        </p>
        <h2 id="process-title" className={`h2 ${s.title}`} data-focus tabIndex={-1}>
          {t.process.title}
        </h2>
        <p className={`lede ${s.processLede}`}>{t.process.lede}</p>
      </div>
      <ol className={s.steps}>
        {t.process.steps.map((st, i) => (
          <li key={st.name}>
            <i className={s.stepN} aria-hidden="true">
              {two(i + 1)}
            </i>
            <b>{st.name}</b>
            <span>{st.text}</span>
          </li>
        ))}
      </ol>
      <div className={`dark ${s.terms}`} data-m-surface="ink">
        <ul className={s.termList}>
          {t.process.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
        <a className={`pill ${s.termsCta}`} data-solid data-size="lg" href={`${pathFor('home', locale)}#contact`}>
          {t.ui.cta} <span aria-hidden="true">→</span>
        </a>
      </div>
    </Section>
  )
}

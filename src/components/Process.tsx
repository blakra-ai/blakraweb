import { useI18n } from '../i18n'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Work.module.css'

const two = (n: number) => String(n).padStart(2, '0')

/** 07 How we work: the method, three steps on hairlines, on the paper. */
export function Process() {
  const { t, locale } = useI18n()
  return (
    <Section id="approach" beat="checklist" surface="body" station={7} className={`${s.work} ${s.processSection}`} aria-labelledby="process-title">
      <div className={s.process}>
        <div>
          <p className="eyebrow mono">
            {two(7)} / 10 &nbsp;·&nbsp; {t.process.eyebrow}
          </p>
          <h2 id="process-title" className={`h3 ${s.processTitle}`} data-focus tabIndex={-1}>
            {t.process.title}
          </h2>
          <p className={`lede ${s.processLede}`}>{t.process.lede}</p>
        </div>
        <ol className={s.steps}>
          {t.process.steps.map((st) => (
            <li key={st.name}>
              <b>{st.name}</b>
              <span>{st.text}</span>
            </li>
          ))}
        </ol>
        <p className="sr-only">
          <a href={`${pathFor('home', locale)}#contact`}>{t.ui.cta}</a>
        </p>
      </div>
    </Section>
  )
}

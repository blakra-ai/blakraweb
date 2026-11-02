import { company } from '../content/shared'
import { useI18n } from '../i18n'
import { Section } from '../components/Section'
import { pathFor } from '../routes'
import s from './About.module.css'

const two = (n: number) => String(n).padStart(2, '0')

/**
 * /about (run 2026-11-02-company-content, draft.md §2–8): the plain reference page a careful buyer
 * scans and forwards. Paper, one reading column per block with its mono label on the left, the
 * orange thread on the story's first line, the FAQ as native disclosures (FAQPage JSON-LD in head.ts).
 */
export function About() {
  const { t, locale } = useI18n()
  const a = t.about
  const blocks = [
    { id: 'leadership', title: a.leadershipTitle },
    { id: 'trust', title: a.trustTitle },
    { id: 'engage', title: a.engageTitle },
    { id: 'industries', title: a.industriesTitle },
    { id: 'faq', title: a.faqTitle },
    { id: 'join', title: a.joinTitle },
  ]
  const head = (i: number) => (
    <div className={s.label}>
      <span className="mono">{two(i + 1)}</span>
      <h2 id={`about-${blocks[i].id}`} className={s.h2}>
        {blocks[i].title}
      </h2>
    </div>
  )
  return (
    <Section className={s.page} aria-labelledby="page-title">
      <header className={s.intro}>
        <p className="eyebrow mono">{a.eyebrow}</p>
        <h1 id="page-title" className={`h2 ${s.title}`}>
          {a.title}
        </h1>
        <div className={s.story}>
          {a.story.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </header>

      <section className={s.block} aria-labelledby="about-leadership">
        {head(0)}
        <div>
          <p className={s.lead}>{t.people.lede}</p>
          <ul className={s.rows}>
            {t.people.roles.map((r) => (
              <li key={r.role}>
                <b>{r.role}</b>
                <span>{r.owns}</span>
              </li>
            ))}
          </ul>
          <p className={s.note}>{t.people.bench}</p>
        </div>
      </section>

      <section className={s.block} aria-labelledby="about-trust">
        {head(1)}
        <ul className={s.trust}>
          {a.trust.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section className={s.block} aria-labelledby="about-engage">
        {head(2)}
        <ol className={s.rows}>
          {a.engage.map((st) => (
            <li key={st.name}>
              <b>{st.name}</b>
              <span>{st.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.block} aria-labelledby="about-industries">
        {head(3)}
        <div>
          <ul className={s.tags}>
            {a.industries.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={s.note}>{a.nda}</p>
        </div>
      </section>

      <section className={s.block} aria-labelledby="about-faq">
        {head(4)}
        <div className={s.faq}>
          {a.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
            <a className={`pill ${s.cta}`} href={pathFor('home', locale, '#contact')}>
              {a.cta} <span aria-hidden="true">→</span>
            </a>
        </div>
      </section>

      <section className={s.block} aria-labelledby="about-join">
        {head(5)}
        <div>
          <p className={s.lead}>
            {a.join} <a href={`mailto:${company.email}`}>{company.email}</a>
          </p>
        </div>
      </section>
    </Section>
  )
}

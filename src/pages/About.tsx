import { chakraColors, company } from '../content/shared'
import { useI18n } from '../i18n'
import { Section } from '../components/Section'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { pathFor } from '../routes'
import { Closing, Ring, two } from './Inner'
import i from './Inner.module.css'
import s from './About.module.css'

/** The name, drawn: the black hole with its gold rim and the seven layers round it, root inside, crown outside. */
function SevenRings() {
  return (
    <svg className={s.rings} viewBox="0 0 360 360" aria-hidden="true">
      <circle cx="180" cy="180" r="100" fill="#d9a441" fillOpacity="0.1" />
      {chakraColors.map((c, k) => (
        <circle key={c} cx="180" cy="180" r={84 + k * 15} fill="none" stroke={c} strokeWidth="1.6" />
      ))}
      <circle cx="180" cy="180" r="66" fill="#000" stroke="#f0c875" strokeWidth="1.6" />
    </svg>
  )
}

/**
 * /about, the reference page a careful buyer scans and forwards: an ink opening, the story beside the
 * name's own drawing, leadership and practices with weight on ink, the commitments, the way of working
 * on ink, the industries, the FAQ as native disclosures (FAQPage JSON-LD in head.ts; the answers are in
 * the HTML), and one call to action at the end.
 */
export function About() {
  const { t, locale } = useI18n()
  const a = t.about
  const total = two(6)
  // A section's id stays on the section, whose top space keeps the headline clear of the fixed bar when a link lands here.
  const head = (n: number, id: string, title: string) => (
    <div className={s.head}>
      <p className="mono" aria-hidden="true">
        {two(n)} / {total}
      </p>
      <h2 id={`${id}-title`} className="h2" data-focus tabIndex={-1}>
        {title}
      </h2>
    </div>
  )
  return (
    <Section className={i.page} surface="body" aria-labelledby="page-title">
      <header className={`dark ${i.window} ${s.hero}`}>
        <Ring className={s.heroRing} />
        <Breadcrumbs id="about" />
        <div className={s.heroWords}>
          <p className="eyebrow mono">{a.eyebrow}</p>
          <h1 id="page-title" className={`h1 ${s.title}`}>
            {a.title}
          </h1>
        </div>
        <p className={s.heroFoot}>{a.story[0]}</p>
      </header>

      <div className={`${i.paper} ${s.story}`}>
        <div className={s.storyText}>
          <p className={s.statement}>{a.story[1]}</p>
          <p>{a.story[2]}</p>
          <p>{a.story[3]}</p>
        </div>
        <div className={`dark ${s.plate}`}>
          <SevenRings />
        </div>
      </div>

      <section id="about-leadership" className={s.inkSection} aria-labelledby="about-leadership-title">
        <div className={`dark ${i.window} ${s.ink}`}>
          {head(1, 'about-leadership', a.leadershipTitle)}
          <p className={s.inkLede}>{t.people.lede}</p>
          <ul className={s.roles}>
            {t.people.roles.map((r, k) => (
              <li key={r.role}>
                <span className="mono" aria-hidden="true">
                  {two(k + 1)}
                </span>
                <h3 className="h3">{r.role}</h3>
                <p>{r.owns}</p>
                <p className={s.ask}>{r.ask}</p>
              </li>
            ))}
          </ul>
          <ul className={s.practices}>
            {t.people.practicesShort.map((x, k) => (
              <li key={x}>
                <span className="mono" aria-hidden="true">
                  {two(k + 1)}
                </span>
                {x}
              </li>
            ))}
          </ul>
          <p className={s.bench}>{t.people.bench}</p>
        </div>
      </section>

      <section id="about-trust" className={`${i.paper} ${s.section}`} aria-labelledby="about-trust-title">
        {head(2, 'about-trust', a.trustTitle)}
        <ol className={s.trust}>
          {a.trust.map((x, k) => (
            <li key={x}>
              <span className="mono" aria-hidden="true">
                {two(k + 1)}
              </span>
              {x}
            </li>
          ))}
        </ol>
      </section>

      <section id="about-engage" className={s.inkSection} aria-labelledby="about-engage-title">
        <div className={`dark ${i.window} ${s.ink}`}>
          {head(3, 'about-engage', a.engageTitle)}
          <ol className={s.steps}>
            {a.engage.map((st) => (
              <li key={st.name}>
                <h3 className="h3">{st.name}</h3>
                <p>{st.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="about-industries" className={`${i.paper} ${s.section} ${s.split}`} aria-labelledby="about-industries-title">
        {head(4, 'about-industries', a.industriesTitle)}
        <div className={s.right}>
          <ul className={s.industries}>
            {a.industries.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className={s.nda}>{a.nda}</p>
        </div>
      </section>

      <section id="about-faq" className={`${i.paper} ${s.section} ${s.split}`} aria-labelledby="about-faq-title">
        {head(5, 'about-faq', a.faqTitle)}
        <div className={`${s.right} ${s.faq}`}>
          {a.faq.map((f, k) => (
            <details key={f.q} open={k === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="about-join" className={`${i.paper} ${s.section} ${s.split}`} aria-labelledby="about-join-title">
        {head(6, 'about-join', a.joinTitle)}
        <p className={`${s.right} ${s.join}`}>
          {a.join} <a href={`mailto:${company.email}`}>{company.email}</a>
        </p>
      </section>

      <Closing
        eyebrow={t.contact.eyebrow}
        title={t.contact.title}
        text={t.contact.lede}
        cta={a.cta}
        href={pathFor('home', locale, '#contact')}
        aside={
          <a className={i.link} href={`mailto:${company.email}`}>
            {company.email}
          </a>
        }
      />
    </Section>
  )
}

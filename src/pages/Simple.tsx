import { company, products } from '../content/shared'
import { useI18n } from '../i18n'
import { Section } from '../components/Section'
import { pathFor } from '../routes'
import s from './Simple.module.css'

export function Investors() {
  const { t, locale } = useI18n()
  const v = t.investors
  return (
    <Section className={s.page} aria-labelledby="page-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{v.eyebrow}</p>
        <h1 id="page-title" className={s.title}>
          {v.title}
        </h1>
        <p className={s.lede}>{v.lede}</p>

        <section className={s.block} aria-labelledby="thesis">
          <h2 id="thesis" className={s.blockTitle}>
            {v.thesisTitle}
          </h2>
          <ol className={s.thesis}>
            {v.thesis.map((line, i) => (
              <li key={line}>
                <span>0{i + 1}</span>
                <p>{line}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.block} aria-labelledby="products">
          <h2 id="products" className={s.blockTitle}>
            {v.productsTitle}
          </h2>
          <table className={s.table}>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.name}</th>
                  <td>{t.products.items[p.id].line}</td>
                  <td className={s.stage}>{t.products.stage[p.stage]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={s.deck}>
            {t.products.more}
          </p>
        </section>

        <section className={s.block} aria-labelledby="offer">
          <h2 id="offer" className={s.blockTitle}>
            {v.askTitle}
          </h2>
          <p className={s.ask}>
            {v.ask}
          </p>
        </section>

        <section className={s.block} aria-labelledby="nda">
          <h2 id="nda" className={s.blockTitle}>
            {v.ndaTitle}
          </h2>
          <p className={s.deck}>
            {v.deck}
          </p>
          <div className={s.actions}>
            <a className={s.cta} href={`${pathFor('home', locale)}?intent=invest#contact`}>
              {v.cta}
            </a>
            <p className={s.note}>
              {v.note} <a href={`mailto:${company.email}`}>{company.email}</a>
            </p>
          </div>
        </section>
        <p className={s.fine}>{v.disclaimer}</p>
      </div>
    </Section>
  )
}

/** The company's postal address, one line per part. */
function Address({ country }: { country: string }) {
  const a = company.address
  return (
    <address className={s.address}>
      {company.legalName}
      <br />
      {a.street}
      <br />
      {a.city}, {a.region} {a.postalCode}
      <br />
      {country}
    </address>
  )
}


export function Privacy() {
  const { t } = useI18n()
  const p = t.privacy
  return (
    <Section className={s.page} aria-labelledby="page-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{p.eyebrow}</p>
        <h1 id="page-title" className={s.title}>
          {p.title}
        </h1>
        <dl className={s.list}>
          <div>
            <dt>{p.whoTitle}</dt>
            <dd>
              {p.who}
              <Address country={t.legal.country} />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </dd>
          </div>
          {p.sections.map((sec) => (
            <div key={sec.heading}>
              <dt>{sec.heading}</dt>
              <dd>{sec.text}</dd>
            </div>
          ))}
        </dl>
        <p className={s.fine}>
          {p.questions} <a href={`mailto:${company.email}`}>{company.email}</a>. {p.updated}
        </p>
      </div>
    </Section>
  )
}

/** Provider identification (Impressum, mentions légales, aviso legal). */
export function Legal() {
  const { t } = useI18n()
  const l = t.legal
  return (
    <Section className={s.page} aria-labelledby="page-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{l.eyebrow}</p>
        <h1 id="page-title" className={s.title}>
          {l.title}
        </h1>
        <dl className={s.list}>
          <div>
            <dt>{l.providerTitle}</dt>
            <dd>
              <Address country={l.country} />
            </dd>
          </div>
          <div>
            <dt>{l.contactTitle}</dt>
            <dd>
              {l.emailLabel}: <a href={`mailto:${company.email}`}>{company.email}</a>
            </dd>
          </div>
          <div>
            <dt>{l.creditsTitle}</dt>
            <dd>
              {/* The licence's own credit line (CC BY 4.0): the work, its author and the licence, each linked. */}
              {l.credits}{' '}
              <a href="https://sketchfab.com/3d-models/mecha-roe-deer-6c25867eda6a4dafb274eb9efd37ebfd" rel="noopener" target="_blank">
                Mecha roe deer
              </a>
              {' · '}
              <a href="https://sketchfab.com/Crysis007-94" rel="noopener" target="_blank">
                Osho
              </a>
              {' · '}
              <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener" target="_blank">
                CC BY 4.0
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  )
}

export function NotFound() {
  const { t, locale } = useI18n()
  const n = t.notFound
  return (
    <Section className={`${s.page} ${s.center}`} aria-labelledby="page-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{n.eyebrow}</p>
        <h1 id="page-title" className={s.title}>
          {n.title}
        </h1>
        <p className={s.lede}>{n.text}</p>
        <a className={s.cta} href={pathFor('home', locale)}>
          {n.back}
        </a>
      </div>
    </Section>
  )
}

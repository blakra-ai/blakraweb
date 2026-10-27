import { useRef } from 'react'
import { company, products } from '../content/shared'
import { useI18n } from '../i18n'
import { Section } from '../components/Section'
import { useReveals } from '../motion/useReveals'
import { useStage } from '../motion/useStage'
import { poses, type Pose } from '../motion/engine3d/stage'
import { pathFor } from '../routes'
import s from './Simple.module.css'

export function Investors() {
  const { t, locale } = useI18n()
  const v = t.investors
  const ref = useRef<HTMLElement>(null)
  useReveals(ref)
  // The products: the jet carrying them, the column beneath it.
  useStage(ref, { pose: { ...(poses.jets as Pose), shift: [0.45, -0.04], column: 0.6 } }, 120)
  return (
    <Section ref={ref} sky="night" time={[120, 120]} className={s.page} aria-labelledby="page-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{v.eyebrow}</p>
        <h1 id="page-title" className={s.title}>
          {v.title}
        </h1>
        <p className={s.lede}>{v.lede}</p>

        <section className={s.block} aria-labelledby="thesis">
          <h2 id="thesis" className={s.blockTitle} data-reveal>
            {v.thesisTitle}
          </h2>
          <ol className={s.thesis} data-reveal>
            {v.thesis.map((line, i) => (
              <li key={line}>
                <span>0{i + 1}</span>
                <p>{line}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.block} aria-labelledby="products">
          <h2 id="products" className={s.blockTitle} data-reveal>
            {v.productsTitle}
          </h2>
          <table className={s.table} data-reveal>
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
          <p className={s.deck} data-reveal>
            {t.products.more}
          </p>
        </section>

        <section className={s.block} aria-labelledby="offer">
          <h2 id="offer" className={s.blockTitle} data-reveal>
            {v.askTitle}
          </h2>
          <p className={s.ask} data-reveal>
            {v.ask}
          </p>
        </section>

        <section className={s.block} aria-labelledby="nda">
          <h2 id="nda" className={s.blockTitle} data-reveal>
            {v.ndaTitle}
          </h2>
          <p className={s.deck} data-reveal>
            {v.deck}
          </p>
          <div className={s.actions} data-reveal>
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

const tel = `tel:${company.phone.replace(/[^+\d]/g, '')}`

export function Privacy() {
  const { t } = useI18n()
  const p = t.privacy
  const ref = useRef<HTMLElement>(null)
  useReveals(ref)
  useStage(ref, { pose: { ...(poses.overview as Pose), fade: 0.45, shift: [0.6, 0] } }, 780)
  return (
    <Section ref={ref} sky="ink" time={[780, 780]} className={s.page} aria-labelledby="page-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{p.eyebrow}</p>
        <h1 id="page-title" className={s.title}>
          {p.title}
        </h1>
        <dl className={s.list}>
          <div data-reveal>
            <dt>{p.whoTitle}</dt>
            <dd>
              {p.who}
              <Address country={t.legal.country} />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </dd>
          </div>
          {p.sections.map((sec) => (
            <div key={sec.heading} data-reveal>
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
  const ref = useRef<HTMLElement>(null)
  useReveals(ref)
  useStage(ref, { pose: { ...(poses.overview as Pose), fade: 0.45, shift: [0.6, 0] } }, 780)
  return (
    <Section ref={ref} sky="ink" time={[780, 780]} className={s.page} aria-labelledby="page-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>{l.eyebrow}</p>
        <h1 id="page-title" className={s.title}>
          {l.title}
        </h1>
        <dl className={s.list}>
          <div data-reveal>
            <dt>{l.providerTitle}</dt>
            <dd>
              <Address country={l.country} />
            </dd>
          </div>
          <div data-reveal>
            <dt>{l.contactTitle}</dt>
            <dd>
              {l.emailLabel}: <a href={`mailto:${company.email}`}>{company.email}</a>
              <br />
              {l.phoneLabel}: <a href={tel}>{company.phone}</a>
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
  const ref = useRef<HTMLElement>(null)
  // A page that doesn't exist has fallen past the horizon.
  useStage(ref, { pose: { ...(poses.horizon as Pose), dist: 6.2, shift: [0.32, 0] } }, 0)
  return (
    <Section ref={ref} sky="night" time={[0, 0]} className={`${s.page} ${s.center}`} aria-labelledby="page-title">
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

import type { ReactNode } from 'react'
import { company, products } from '../content/shared'
import { useI18n } from '../i18n'
import { Section } from '../components/Section'
import { Breadcrumbs } from '../components/Breadcrumbs'
import type { PageId } from '../routes'
import { pathFor } from '../routes'
import { Closing, Ring, two } from './Inner'
import i from './Inner.module.css'
import z from './Sponsors.module.css'
import s from './Simple.module.css'

/** The app's own interface words (its UI is in English); drawn, not product data. */
const APP_UI = { cta: 'Read my skin', steps: ['Photo', 'Read', 'Routine'], reads: ['Tone', 'Texture', 'Redness', 'Pores'] }

/** LIOXSA's phone, drawn in CSS: the same neutral recreation of the app's public look as the home page's product stage. */
function LioxsaPhone({ name, alt }: { name: string; alt: string }) {
  return (
    <div className={z.phone} role="img" aria-label={alt}>
      <div className={z.screen} aria-hidden="true">
        <div className={z.bar}>
          <span>9:41</span>
          <b>{name}</b>
          <span>●●</span>
        </div>
        <div className={z.scan}>
          <svg viewBox="0 0 120 150" className={z.face}>
            <path d="M60 10c-24 0-40 20-40 50 0 34 18 70 40 80 22-10 40-46 40-80 0-30-16-50-40-50Z" />
            <path d="M42 64c5-3 11-3 16 0M62 64c5-3 11-3 16 0M60 70v20M50 106c6 4 14 4 20 0" />
          </svg>
          <i className={z.corners} />
        </div>
        <span className={z.button}>{APP_UI.cta}</span>
        <ol className={z.appSteps}>
          {APP_UI.steps.map((x, k) => (
            <li key={x} data-on={k === 1 || undefined}>
              <em>0{k + 1}</em>
              {x}
            </li>
          ))}
        </ol>
        <ul className={z.reads}>
          {APP_UI.reads.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * For sponsors and buyers: this page sells LIOXSA. One ink stage, as on the home page: the promise and
 * the button beside the ring and the phone, the product, then the offer as three words large enough to
 * read across a room, each a door to the contact form. On paper what a serious party receives and why
 * we build our own; the last window is the path to the founder, with the fine print under it.
 */
export function Investors() {
  const { t, locale } = useI18n()
  const v = t.investors
  const p = products[0]
  const tx = t.products.items[p.id]
  const contact = `${pathFor('home', locale)}?intent=invest#contact`
  return (
    <Section className={i.page} surface="body" aria-labelledby="page-title">
      <div className={`dark ${i.window} ${z.stage}`}>
        <div className={z.crumbs}>
          <Breadcrumbs id="investors" />
        </div>
        <header className={z.words}>
          <p className="eyebrow mono">{v.eyebrow}</p>
          <h1 id="page-title" className={`h1 ${z.title}`}>
            {v.title}
          </h1>
          <p className={z.lede}>{v.lede}</p>
          <a className={`pill ${i.cta}`} data-solid href={contact}>
            {v.cta} <span aria-hidden="true">→</span>
          </a>
        </header>

        <div className={z.object}>
          <Ring className={z.objectRing} />
          <LioxsaPhone name={p.name} alt={t.products.mockAlt} />
        </div>

        <section className={z.product} aria-labelledby="products">
          <h2 id="products" className={`mono ${z.label}`}>
            {v.productsTitle}
          </h2>
          <p className={`mono ${z.chip}`}>
            <i aria-hidden="true" />
            {t.products.stage[p.stage]} · {p.platforms.join(', ')}
          </p>
          <h3 className={z.name}>{p.name}</h3>
          <p className={z.line}>{tx.line}</p>
          <p className={z.detail}>{tx.detail}</p>
          <p className={z.detail}>{t.products.more}</p>
        </section>

        <section className={z.offer} aria-labelledby="offer">
          <h2 id="offer" className={`mono ${z.label}`}>
            {v.askTitle}
          </h2>
          <ul className={z.strip}>
            {t.products.offers.map((o) => (
              <li key={o}>
                <a href={contact}>
                  {o} <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
          <p className={z.ask}>{v.ask}</p>
        </section>
      </div>

      <section className={`${i.paper} ${z.section} ${z.split}`} aria-labelledby="nda">
        <h2 id="nda" className={`h2 ${z.h}`}>
          {v.ndaTitle}
        </h2>
        <p className={z.statement}>{v.deck}</p>
      </section>

      <section className={`${i.paper} ${z.section}`} aria-labelledby="thesis">
        <h2 id="thesis" className={`h2 ${z.h}`}>
          {v.thesisTitle}
        </h2>
        <ol className={z.thesis}>
          {v.thesis.map((line, k) => (
            <li key={line}>
              <span className="mono" aria-hidden="true">
                {two(k + 1)}
              </span>
              <p>{line}</p>
            </li>
          ))}
        </ol>
      </section>

      <Closing
        eyebrow={t.contact.eyebrow}
        title={v.cta}
        cta={t.contact.doors.invest.label}
        href={contact}
        foot={
          <>
            <p className={z.note}>
              {v.note} <a href={`mailto:${company.email}`}>{company.email}</a>
            </p>
            <p className={z.fine}>{v.disclaimer}</p>
          </>
        }
      />
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

/** A reading page: the trail, the title, then sections with their headline left and a 60–75 character measure right. */
function Doc({ id, eyebrow, title, children }: { id: PageId; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <Section className={i.page} surface="body" aria-labelledby="page-title">
      <div className={`${i.paper} ${s.doc}`}>
        <Breadcrumbs id={id} />
        <header className={s.head}>
          <p className="eyebrow mono">{eyebrow}</p>
          <h1 id="page-title" className={`h2 ${s.title}`}>
            {title}
          </h1>
        </header>
        {children}
      </div>
    </Section>
  )
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.item}>
      <h2 className={`h3 ${s.itemTitle}`}>{title}</h2>
      <div className={s.text}>{children}</div>
    </section>
  )
}

export function Privacy() {
  const { t } = useI18n()
  const p = t.privacy
  return (
    <Doc id="privacy" eyebrow={p.eyebrow} title={p.title}>
      <Item title={p.whoTitle}>
        <p>{p.who}</p>
        <Address country={t.legal.country} />
        <p>
          <a href={`mailto:${company.email}`}>{company.email}</a>
        </p>
      </Item>
      {p.sections.map((sec) => (
        <Item key={sec.heading} title={sec.heading}>
          <p>{sec.text}</p>
        </Item>
      ))}
      <p className={s.fine}>
        {p.questions} <a href={`mailto:${company.email}`}>{company.email}</a>. {p.updated}
      </p>
    </Doc>
  )
}

/** Provider identification (Impressum, mentions légales, aviso legal). */
export function Legal() {
  const { t, locale } = useI18n()
  const l = t.legal
  return (
    <Doc id="legal" eyebrow={l.eyebrow} title={l.title}>
      <Item title={l.providerTitle}>
        <Address country={l.country} />
      </Item>
      <Item title={l.contactTitle}>
        <p>
          {l.emailLabel}: <a href={`mailto:${company.email}`}>{company.email}</a>
          {/* The second direct, fast way to reach us (DDG § 5), only when the form can deliver. */}
          {import.meta.env.VITE_CONTACT_ENDPOINT && (
            <>
              <br />
              {l.formLabel}: <a href={pathFor('home', locale, '#contact')}>{l.formLink}</a>
            </>
          )}
        </p>
      </Item>
      <Item title={l.creditsTitle}>
        <p>
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
        </p>
      </Item>
    </Doc>
  )
}

export function NotFound() {
  const { t, locale } = useI18n()
  const n = t.notFound
  return (
    <Section className={i.page} surface="body" aria-labelledby="page-title">
      <div className={`dark ${i.window} ${s.lost}`}>
        <Ring className={s.lostRing} />
        <div className={s.lostWords}>
          <p className="eyebrow mono">{n.eyebrow}</p>
          <h1 id="page-title" className={`h1 ${s.lostTitle}`}>
            {n.title}
          </h1>
          <p className="lede">{n.text}</p>
          <a className={`pill ${i.cta}`} data-solid href={pathFor('home', locale)}>
            {n.back}
          </a>
        </div>
      </div>
    </Section>
  )
}

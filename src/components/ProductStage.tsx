import { products } from '../content/shared'
import { useI18n } from '../i18n'
import { pathFor } from '../routes'
import s from './ProductStage.module.css'

const ORDER = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai'] as const
/** The app's own interface words (its UI is in English); drawn, not product data. */
const APP_UI = { cta: 'Read my skin', steps: ['Photo', 'Read', 'Routine'], reads: ['Tone', 'Texture', 'Redness', 'Pores'] }

/**
 * 02 Our products, the product stage (owner brief 2026-11-02): one full-width ink window. Left:
 * the head, the status chip, the product's name and two value lines, the offer strip
 * (sponsor · license · acquire) and the call to action that opens the contact form on
 * "Sponsor or buy a product". Right: the gold ring and its black hole, with a phone drawn in
 * front of it in CSS (a neutral recreation of the app's public look, no user data). The scan
 * line moves only with motion allowed.
 */
export function ProductStage() {
  const { t, locale } = useI18n()
  const p = products[0]
  if (!p) return null
  const tx = t.products.items[p.id]
  const uses = p.layers.map((l) => ORDER.indexOf(l) + 1).sort((a, b) => a - b)
  return (
    <div className={`dark ${s.stage}`} data-loop>
      <div className={s.copy}>
        <p className="eyebrow mono">02 / 10 &nbsp;·&nbsp; {t.products.eyebrow}</p>
        <h2 id="products-title" className={`h3 ${s.h}`} data-focus tabIndex={-1}>
          {t.products.title}
        </h2>
        <p className={`d-only ${s.lede}`}>{t.products.lede}</p>

        <div className={s.product}>
          <p className={`mono ${s.chip}`}>
            <i aria-hidden="true" />
            {t.products.stage[p.stage]} · {p.platforms.join(', ')}
          </p>
          <h3 className={s.name}>{p.name}</h3>
          <p className={`d-only ${s.line}`}>{tx.line}</p>
          <p className={`m-only ${s.line}`}>{tx.lineShort}</p>
          <p className={`m-only ${s.note}`}>{tx.noteShort}</p>
          <p className={`d-only ${s.detail}`}>{tx.detail}</p>
          <p className={`d-only mono ${s.uses}`}>
            {t.pulse.uses} {uses.join(', ')}
          </p>
        </div>

        <div className={s.offer}>
          <p className={`mono ${s.offerLabel}`}>{t.products.offer}</p>
          <ul className={s.strip}>
            {t.products.offers.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <p className={`d-only ${s.offerText}`}>{tx.offer}</p>
        </div>

        <div className={s.actions}>
          <a className={`pill ${s.cta}`} href={`${pathFor('home', locale)}?intent=invest#contact`}>
            {t.contact.doors.invest.label} <span aria-hidden="true">→</span>
          </a>
          <a className={`d-only ${s.link}`} href={pathFor('investors', locale)}>
            {t.products.investorsLink}
          </a>
        </div>
        <p className={`d-only ${s.more}`}>{t.products.more}</p>

        {/* Phones: the rest of the story behind "Details +" (concept.md §3). */}
        <details className={`m-only m-details ${s.details}`}>
          <summary>{t.ui.detailsShort}</summary>
          <p>{t.products.lede}</p>
          <p>{tx.detail}</p>
          <p className="mono">
            {t.pulse.uses} {uses.join(', ')}
          </p>
          <p>{tx.offer}</p>
          <p>{t.products.more}</p>
          <p>
            <a className={s.link} href={pathFor('investors', locale)}>
              {t.products.investorsLink}
            </a>
          </p>
        </details>
      </div>

      {/* The object: the gold ring and its black hole, the phone standing in front of it. */}
      <div className={s.object}>
        <svg className={s.ring} viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="186" className={s.orbit} />
          <circle cx="200" cy="200" r="150" className={s.halo} />
          <circle cx="200" cy="200" r="118" className={s.hole} />
        </svg>
        <div className={s.phone} role="img" aria-label={t.products.mockAlt}>
          <div className={s.screen} aria-hidden="true">
            <div className={s.bar}>
              <span>9:41</span>
              <b>{p.name}</b>
              <span>●●</span>
            </div>
            <div className={s.scan}>
              <svg viewBox="0 0 120 150" className={s.face}>
                <path d="M60 10c-24 0-40 20-40 50 0 34 18 70 40 80 22-10 40-46 40-80 0-30-16-50-40-50Z" />
                <path d="M42 64c5-3 11-3 16 0M62 64c5-3 11-3 16 0M60 70v20M50 106c6 4 14 4 20 0" />
              </svg>
              <i className={s.corners} />
              <i className={s.sweep} />
            </div>
            <span className={s.button}>{APP_UI.cta}</span>
            <ol className={s.steps}>
              {APP_UI.steps.map((x, i) => (
                <li key={x} data-on={i === 1 || undefined}>
                  <em>0{i + 1}</em>
                  {x}
                </li>
              ))}
            </ol>
            <ul className={s.reads}>
              {APP_UI.reads.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

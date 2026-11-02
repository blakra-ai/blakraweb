import { useEffect, useState } from 'react'
import { needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { InkWell, WellGrid } from '../features/observatory/Well'
import { ProductStage } from './ProductStage'
import { Section } from './Section'
import { useSwipe } from '../mobile/swipe'
import s from './Porcelain.module.css'

const ORDER: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const num = (id: LayerId) => ORDER.indexOf(id) + 1
const two = (n: number) => String(n).padStart(2, '0')

/**
 * 02 Our products and 08 People, two porcelain screens (storyboard d-04-porcelain): the light surface,
 * ink text and grey-on-light secondary (5.50 : 1); gold never as text here. Columns 1–6: the
 * products as hairline rows (eyebrow, H3, lede, the skin-analysis product with "Uses layers",
 * the investors link), then the three people as hairline rows. Columns 8–12: the one large
 * object, the ring drawn in ink with the picked layers lit and "Your choice, remembered". No
 * guide here: the ring glyph is the object. No motion beyond hover.
 */
export function Products() {
  return (
    <Section id="products" beat="payload" surface="porcelain" station={2} className={`${s.porcelain} ${s.products}`} aria-labelledby="products-title">
      <ProductStage />
    </Section>
  )
}

/**
 * 08 Leadership and teams on the porcelain screen: the people as hairline rows in columns 1–6, the
 * ink well in columns 8–12 with the picker's remembered layers as ticks on its rim.
 */
export function People() {
  const { t } = useI18n()
  const [choice, setChoice] = useState<PulseChoice>(null)
  const { list, count } = useSwipe<HTMLUListElement>()
  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])
  const picked: readonly LayerId[] | null = choice ? (choice === 'all' ? ORDER : needs[choice].layers) : null
  const lit = picked ? picked.map(num).sort((a, b) => a - b) : []
  const tag = choice ? (choice === 'all' ? t.pulse.allTag : t.pulse.needs[choice].tag) : null

  return (
    <Section id="people" beat="crew" surface="porcelain" station={8} className={s.porcelain} aria-labelledby="people-title" data-m-surface="ink">
      {/* The page's grid bends into the well here too (static SVG under the content). */}
      <WellGrid cx={0.76} cy={0.1} sigma={300} pull={0.64} className={s.grid} />
      <div className={s.col}>
        <div className={s.block}>
          <p className="eyebrow mono">
            {two(8)} / 10 &nbsp;·&nbsp; {t.people.eyebrow}
          </p>
          <h2 id="people-title" className={`h3 ${s.h}`} data-focus tabIndex={-1}>
            {t.people.title}
          </h2>
          <p className={`d-only lede ${s.lede}`}>{t.people.lede}</p>
          <p className={`m-only lede ${s.lede}`}>{t.people.ledeShort}</p>
          <ul ref={list} className={`m-swipe ${s.rows}`} aria-label={t.people.title} aria-roledescription="carousel">
            {t.people.roles.map((r) => (
              <li key={r.role} className={s.r}>
                <b>{r.role}</b>
                <div>
                  <span>{r.owns}</span>
                  <em>{r.ask}</em>
                </div>
              </li>
            ))}
          </ul>
          <p ref={count} className="m-only m-count" aria-hidden="true" />
          <p className={`d-only ${s.bench}`}>{t.people.bench}</p>
          <ul className={`m-only ${s.practices}`}>
            {t.people.practicesShort.map((x) => (
              <li key={x} className="mono">
                {x}
              </li>
            ))}
          </ul>
          <details className="m-only m-details">
            <summary>{t.ui.detailsShort}</summary>
            <p>{t.people.bench}</p>
          </details>
        </div>
      </div>

      {/* The one large object: the ink well, the remembered choice's layers as orange ticks on its rim. */}
      <div className={`d-only ${s.object}`} data-hold>
        <InkWell r={56} ticks={lit} seal className={s.ring} />
        <p className={s.cap} aria-live="polite">
          <em>{t.pulse.remembered}</em>
          {tag ? (
            <span>
              {tag} · {t.pulse.uses} {lit.join(', ')}
            </span>
          ) : (
            <a href="#pulse">{t.pulse.ask}</a>
          )}
        </p>
      </div>
    </Section>
  )
}

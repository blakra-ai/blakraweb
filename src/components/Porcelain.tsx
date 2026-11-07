import { HoloAvatar } from '../features/avatar/HoloAvatar'
import { useEffect, useState } from 'react'
import { needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { InkWell, WellGrid } from '../features/observatory/Well'
import { pathFor } from '../routes'
import { ProductStage } from './ProductStage'
import { Section } from './Section'
import { useSwipe } from '../mobile/swipe'
import s from './Porcelain.module.css'

const ORDER: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const num = (id: LayerId) => ORDER.indexOf(id) + 1
const two = (n: number) => String(n).padStart(2, '0')

/** 02 Our products: the ink stage alone on the light surface. */
export function Products() {
  return (
    <Section id="products" beat="payload" surface="porcelain" station={2} className={`${s.porcelain} ${s.products}`} aria-labelledby="products-title">
      <ProductStage />
    </Section>
  )
}

/**
 * 08 Leadership and teams: the headline and the people as hairline rows in the left columns; the
 * founder's AI avatar on its dark plate, whole in one screen, in the right ones. Once the visitor
 * has answered the picker, the ink well under the plate remembers it (the chosen layers as ticks on
 * its rim); before that, the plate stands alone. The call to action closes the column either way.
 */
export function People() {
  const { t, locale } = useI18n()
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
      {/* The page's grid bends into the plate here too (static SVG under the content). */}
      <WellGrid cx={0.72} cy={0.3} sigma={300} pull={0.5} className={s.grid} />
      <div className={s.col}>
        <div className={s.block}>
          <p className="eyebrow mono">
            {two(8)} / 10 &nbsp;·&nbsp; {t.people.eyebrow}
          </p>
          <h2 id="people-title" className={`h2 ${s.h}`} data-focus tabIndex={-1}>
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

      <div className={s.side} data-hold>
        {/* The founder's AI avatar, a hologram on its own dark plate. */}
        <div className={s.holo}>
          <HoloAvatar className={s.holoFig} />
        </div>

        {/* The remembered choice: only once there is one. The live region stays, so the change is announced. */}
        <div className={`d-only ${s.remember}`} aria-live="polite">
          {tag && (
            <div className={s.object}>
              <InkWell r={56} ticks={lit} seal className={s.ring} />
              <p className={s.cap}>
                <em>{t.pulse.remembered}</em>
                <span>
                  {tag} · {t.pulse.uses} {picked!.length === ORDER.length ? ORDER.length : ORDER.filter((id) => picked!.includes(id)).map((id) => t.engine.layers[id].name).join(', ')}
                </span>
              </p>
            </div>
          )}
        </div>

        <a className={`pill ${s.cta}`} data-primary data-size="lg" href={`${pathFor('home', locale)}#contact`}>
          {t.ui.cta} <span aria-hidden="true">→</span>
        </a>
      </div>
    </Section>
  )
}

import { useEffect, useState } from 'react'
import { needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { InkWell, WellGrid } from '../features/observatory/Well'
import { ProductStage } from './ProductStage'
import { Section } from './Section'
import s from './Porcelain.module.css'

const ORDER: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const num = (id: LayerId) => ORDER.indexOf(id) + 1
const two = (n: number) => String(n).padStart(2, '0')

/**
 * 08 Products + 09 People, the porcelain screen (storyboard d-04-porcelain): the light surface,
 * ink text and grey-on-light secondary (5.50 : 1); gold never as text here. Columns 1–6: the
 * products as hairline rows (eyebrow, H3, lede, the skin-analysis product with "Uses layers",
 * the investors link), then the three people as hairline rows. Columns 8–12: the one large
 * object, the ring drawn in ink with the picked layers lit and "Your choice, remembered". No
 * guide here: the ring glyph is the object. No motion beyond hover.
 */
export function Porcelain() {
  const { t } = useI18n()
  const [choice, setChoice] = useState<PulseChoice>(null)
  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])
  const picked: readonly LayerId[] | null = choice ? (choice === 'all' ? ORDER : needs[choice].layers) : null
  const lit = picked ? picked.map(num).sort((a, b) => a - b) : []
  const tag = choice ? (choice === 'all' ? t.pulse.allTag : t.pulse.needs[choice].tag) : null

  return (
    <Section id="products" beat="payload" surface="porcelain" station={8} className={s.porcelain} aria-labelledby="products-title">
      {/* The page's grid bends into the well here too (static SVG under the content). */}
      <WellGrid cx={0.76} cy={0.1} sigma={300} pull={0.64} className={s.grid} />
      <ProductStage />
      <div className={s.col}>
        <div className={s.block} id="people" data-station={9}>
          <p className="eyebrow mono">
            {two(9)} / 10 &nbsp;·&nbsp; {t.people.eyebrow}
          </p>
          <h2 id="people-title" className={`h3 ${s.h}`} data-focus tabIndex={-1}>
            {t.people.title}
          </h2>
          <p className={`lede ${s.lede}`}>{t.people.lede}</p>
          <ul className={s.rows}>
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
          <p className={s.bench}>{t.people.bench}</p>
        </div>
      </div>

      {/* The one large object: the ink well, the remembered choice's layers as orange ticks on its rim. */}
      <div className={s.object} data-hold>
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

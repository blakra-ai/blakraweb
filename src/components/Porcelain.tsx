import { useEffect, useState } from 'react'
import { needs, products } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Porcelain.module.css'

const ORDER: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const num = (id: LayerId) => ORDER.indexOf(id) + 1
const two = (n: number) => String(n).padStart(2, '0')

/**
 * The seal: the disk inverted on porcelain, an ink disk with a porcelain ring inside its limb and
 * the chosen layers as gold ticks on its rim (root at the top, clockwise); 320 px.
 */
function Seal({ lit }: { lit: readonly number[] }) {
  const c = 160
  const R = 120
  return (
    <svg viewBox="0 0 320 320" className={s.ring} aria-hidden="true">
      <circle cx={c} cy={c} r={R + 24} fill="none" stroke="var(--hair-ink)" />
      <circle cx={c} cy={c} r={R} fill="var(--body)" />
      <circle cx={c} cy={c} r={R - 10} fill="none" stroke="var(--porcelain)" strokeWidth="1.5" />
      {ORDER.map((id, k) => {
        const a = -Math.PI / 2 + k * ((2 * Math.PI) / 7)
        const on = lit.includes(k + 1)
        const x1 = c + (R + 6) * Math.cos(a)
        const y1 = c + (R + 6) * Math.sin(a)
        const x2 = c + (R + (on ? 24 : 14)) * Math.cos(a)
        const y2 = c + (R + (on ? 24 : 14)) * Math.sin(a)
        return <line key={id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? 'var(--accent)' : 'var(--ctrl-light)'} strokeWidth={on ? 3 : 1.5} strokeLinecap="round" />
      })}
    </svg>
  )
}

/**
 * 07 Products + 08 People, the porcelain screen (storyboard d-04-porcelain): the light surface,
 * ink text and grey-on-light secondary (5.50 : 1); gold never as text here. Columns 1–6: the
 * products as hairline rows (eyebrow, H3, lede, the skin-analysis product with "Uses layers",
 * the investors link), then the three people as hairline rows. Columns 8–12: the one large
 * object, the ring drawn in ink with the picked layers lit and "Your choice, remembered". No
 * guide here: the ring glyph is the object. No motion beyond hover.
 */
export function Porcelain() {
  const { t, locale } = useI18n()
  const [choice, setChoice] = useState<PulseChoice>(null)
  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])
  const picked: readonly LayerId[] | null = choice ? (choice === 'all' ? ORDER : needs[choice].layers) : null
  const lit = picked ? picked.map(num).sort((a, b) => a - b) : []
  const tag = choice ? (choice === 'all' ? t.pulse.allTag : t.pulse.needs[choice].tag) : null

  return (
    <Section id="products" beat="payload" surface="porcelain" station={7} className={s.porcelain} aria-labelledby="products-title">
      <div className={s.col}>
        <div className={s.block}>
          <p className="eyebrow mono">
            {two(7)} / 09 &nbsp;·&nbsp; {t.products.eyebrow}
          </p>
          <h2 id="products-title" className={`h3 ${s.h}`} data-focus tabIndex={-1}>
            {t.products.title}
          </h2>
          <p className={`lede ${s.lede}`}>{t.products.lede}</p>
          <ul className={s.rows}>
            {products.map((p) => {
              const tx = t.products.items[p.id]
              const uses = p.layers.map(num).sort((a, b) => a - b)
              return (
                <li key={p.id} className={s.r}>
                  <div>
                    <b>{tx.line}</b>
                    <span className={`mono ${s.stage}`}>{t.products.stage[p.stage]}</span>
                  </div>
                  <div>
                    <span>{tx.detail}</span>
                    <em>
                      {t.products.offer}: {tx.offer}
                    </em>
                    <span className={`mono ${s.uses}`}>
                      {t.pulse.uses} {uses.join(', ')}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className={s.more}>{t.products.more}</p>
          <a className={s.link} href={pathFor('investors', locale)}>
            {t.products.investorsLink} <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className={s.block} id="people" data-station={8}>
          <p className="eyebrow mono">
            {two(8)} / 09 &nbsp;·&nbsp; {t.people.eyebrow}
          </p>
          <h2 id="people-title" className={`h3 ${s.h}`} data-focus tabIndex={-1}>
            {t.people.title}
          </h2>
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

      {/* The one large object: the seal, the remembered choice's layers as gold ticks; her line on its tangent. */}
      <div className={s.object} data-hold>
        <Seal lit={lit} />
        <p className="voice" data-caret>
          {t.navigator.lines.payload}
        </p>
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

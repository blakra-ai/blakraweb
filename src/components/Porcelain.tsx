import { useEffect, useState } from 'react'
import { needs, products } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Porcelain.module.css'

const ORDER: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const COLOURS = ['root', 'sacral', 'solar', 'heart', 'throat', 'third', 'crown'] as const
const num = (id: LayerId) => ORDER.indexOf(id) + 1
const two = (n: number) => String(n).padStart(2, '0')

/** The ring in ink: the grid-well as hairline circles, the disc, the seven layers on an orbit. */
function RingGlyph({ lit }: { lit: readonly number[] }) {
  const cx = 288
  const cy = 390
  const R = 170
  const wells = Array.from({ length: 12 }, (_, k) => k + 1)
  return (
    <svg viewBox="0 0 576 700" className={s.ring} aria-hidden="true">
      {wells.map((k) => (
        <circle key={k} cx={cx} cy={cy} r={R + k * 22} fill="none" stroke={`rgba(11,11,13,${(0.16 - k * 0.011).toFixed(3)})`} />
      ))}
      <circle cx={cx} cy={cy} r={R} fill="var(--body)" />
      <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="var(--body)" strokeWidth="1.5" />
      {ORDER.map((id, k) => {
        const a = -Math.PI / 2 + k * ((2 * Math.PI) / 7)
        const on = lit.includes(k + 1)
        const x = cx + (R + 30) * Math.cos(a)
        const y = cy + (R + 30) * Math.sin(a)
        const lx = cx + (R + 58) * Math.cos(a)
        const ly = cy + (R + 58) * Math.sin(a)
        return (
          <g key={id}>
            {on ? <circle cx={x} cy={y} r="7" fill={`var(--${COLOURS[k]})`} /> : <circle cx={x} cy={y} r="5" fill="none" stroke="var(--ctrl-light)" strokeWidth="1.5" />}
            <text x={lx} y={ly + 4} textAnchor="middle" className={s.ringLabel} fill={on ? 'var(--body)' : 'var(--grey-on-light)'} fontWeight={on ? 600 : 500}>
              {two(k + 1)}
            </text>
          </g>
        )
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

      {/* The one large object: the ring in ink, the remembered choice's layers lit. */}
      <div className={s.object} data-hold>
        <div className={s.voice}>
          <p className={`mono ${s.voiceTag}`}>
            <b>{t.navigator.name}</b>
          </p>
          <p className="voice" data-caret>
            {t.navigator.lines.payload}
          </p>
        </div>
        <RingGlyph lit={lit} />
        <p className={`mono ${s.cap}`} aria-live="polite">
          {tag ? (
            <>
              {t.pulse.remembered}: {tag}
              <b>
                {t.pulse.uses} {lit.join(', ')}
              </b>
            </>
          ) : (
            <a href="#pulse">{t.pulse.ask}</a>
          )}
        </p>
      </div>
    </Section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { chapters, needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { useMotion } from '../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { pathFor } from '../routes'
import { InkWell, WellGrid } from '../features/observatory/Well'
import { Section } from './Section'
import s from './Proof.module.css'

/** The seven layers, root to crown: a layer's number is its place here (1 … 7). */
const ORDER: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const num = (id: LayerId) => ORDER.indexOf(id) + 1
const two = (n: number) => String(n).padStart(2, '0')

/**
 * 05 Proof + 06 how we work (storyboard d-03-proof / m-03-proof): DOM only, no canvas. H2 and
 * lede in columns 1–5, the ring glyph with her line in 7–12, then five hairline rows (sector,
 * the one-line story, the system with its "Uses layers" twin, the outcome numeral with its dots).
 * The rows sit in a lensed arc (translateX 0/8/14/8/0 on the inner wrapper; hairlines straight);
 * as the gauge marker passes a row its inner grid lifts 4 px and its dots light. The row mapped
 * to the picked need wears the 2 px gold stitch and "Nearest your choice". "Exact before
 * expensive" and the three steps close the screen as station 06. Outcomes are shared.ts facts.
 */
export function Proof() {
  const { t, locale } = useI18n()
  const { enabled } = useMotion()
  const ref = useRef<HTMLElement>(null)
  const [choice, setChoice] = useState<PulseChoice>(null)
  const nearest = choice && choice !== 'all' ? needs[choice].proof : null
  const [litRows, setLitRows] = useState<boolean[]>(() => chapters.map(() => !enabled))

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  // The marker passes a row: once its top crosses the lower 45 % line of the screen it is lit and
  // stays lit. Without motion the stylesheet lights every row from the start.
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return
    setLitRows(chapters.map(() => false))
    const rows = [...el.querySelectorAll<HTMLElement>('[data-row]')]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.setAttribute('data-lit', '')
            const i = rows.indexOf(e.target as HTMLElement)
            setLitRows((prev) => (prev[i] ? prev : prev.map((v, k) => v || k === i)))
          }
      },
      { rootMargin: '0px 0px -40% 0px', threshold: 0 },
    )
    rows.forEach((r) => io.observe(r))
    return () => io.disconnect()
  }, [enabled])

  const arc = [0, 8, 14, 8, 0]

  return (
    <Section ref={ref} id="day" beat="proof" surface="body" station={5} className={s.proof} aria-labelledby="day-title">
      {/* The page's grid bends into the well here (static SVG over the section's paper). */}
      <WellGrid cx={0.585} cy={0.14} sigma={340} pull={0.7} className={s.grid} />
      <div className={s.head}>
        <p className="eyebrow mono">{two(5)} / 09 &nbsp;·&nbsp; {t.day.eyebrow}</p>
        <h2 id="day-title" className={`h2 ${s.title}`} data-focus tabIndex={-1}>
          {t.day.title}
        </h2>
        <p className={`lede ${s.lede}`}>{t.day.lede}</p>
      </div>

      {/* The object here: the ink well with the five cases as dots on one hairline orbit; each dot
          fills as its row lights. The line on the object's tangent. */}
      <div className={s.object}>
        <InkWell r={56} dots={litRows} />
        <p className="voice" data-caret>
          {t.navigator.lines.proof}
        </p>
      </div>

      <ol className={s.rows} aria-label={t.day.srTitle}>
        {chapters.map((c, i) => {
          const tx = t.chapters[c.id]
          const near = c.id === nearest
          const lit = c.layers.map(num).sort((a, b) => a - b)
          return (
            <li key={c.id} id={c.id} className={s.row} data-row data-near={near || undefined} tabIndex={-1}>
              <div className={s.g} style={{ '--arc': `${arc[i]}px` } as React.CSSProperties}>
                <p className={`mono ${s.ind}`}>
                  {tx.industry}
                  <small>{tx.sector}</small>
                  {near && <span className={s.near}>{t.pulse.nearest}</span>}
                </p>
                <p className={s.moment}>{tx.moment}</p>
                <p className={s.sys}>{tx.system}</p>
                <p className={s.out}>
                  {c.outcomes.map((v, k) => (
                    <b key={k}>
                      {v} <span>{tx.outcomes[k]}</span>
                    </b>
                  ))}
                </p>
                {/* The row's key: one mono line, the layers it used. */}
                <p className={`mono ${s.uses}`}>
                  {t.pulse.uses} {lit.join(', ')}
                </p>
              </div>
            </li>
          )
        })}
        {/* Client work we can describe but not show (the picker points here when a need has no shown case). */}
        <li id="delivered" className={`${s.row} ${s.delivered}`} tabIndex={-1}>
          <div className={s.g}>
            <p className={`mono ${s.ind}`}>{t.day.delivered.title}</p>
            <p className={s.deliveredList}>
              {t.day.delivered.items.map((item, k) => (
                <span key={k}>
                  {item}
                  {k < t.day.delivered.items.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
            <p className={s.sys}>{t.day.delivered.note}</p>
          </div>
        </li>
      </ol>

      {/* 06 How we work: the strip that closes the proof screen. */}
      <div className={s.process} id="approach" data-station={6}>
        <div>
          <p className="eyebrow mono">
            {two(6)} / 09 &nbsp;·&nbsp; {t.process.eyebrow}
          </p>
          <h3 id="process-title" className={`h3 ${s.processTitle}`} data-focus tabIndex={-1}>
            {t.process.title}
          </h3>
          <p className={`mono ${s.stepsShort}`} aria-hidden="true">
            {t.process.steps.map((st) => st.name).join(' · ')}
          </p>
        </div>
        <ol className={s.steps}>
          {t.process.steps.map((st) => (
            <li key={st.name}>
              <b>{st.name}</b>
              <span>{st.text}</span>
            </li>
          ))}
        </ol>
        <p className="sr-only">
          <a href={`${pathFor('home', locale)}#contact`}>{t.ui.cta}</a>
        </p>
      </div>
    </Section>
  )
}

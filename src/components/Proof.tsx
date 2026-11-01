import { useEffect, useRef, useState } from 'react'
import { chapters, needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { useMotion } from '../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Proof.module.css'

/** The seven layers, root to crown: a layer's number is its place here (1 … 7). */
const ORDER: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const num = (id: LayerId) => ORDER.indexOf(id) + 1
const two = (n: number) => String(n).padStart(2, '0')

/**
 * The object on the proof screen: the disk, and the five cases as five points of light on ONE
 * tilted orbit round it (a lensed arc). Each point carries its row's index; the stylesheet lights
 * it when that row is lit (`[data-lit]` on the row sets `--lit-<i>` on the section).
 */
function Orbit({ lit }: { lit: readonly string[] }) {
  const cx = 200
  const cy = 170
  const R = 92
  const rx = 184
  const ry = 56
  const tilt = -14
  return (
    <svg viewBox="0 0 400 340" className={s.orbitSvg} aria-hidden="true">
      <defs>
        <radialGradient id="proof-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0.86" stopColor="#f3e2b4" stopOpacity="0" />
          <stop offset="0.93" stopColor="#f3e2b4" stopOpacity="0.9" />
          <stop offset="0.95" stopColor="#d9a441" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d9a441" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R * 1.12} fill="url(#proof-glow)" />
      <circle cx={cx} cy={cy} r={R} fill="var(--body)" stroke="#f3e2b4" strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${tilt} ${cx} ${cy})`} fill="none" stroke="rgba(236,233,226,0.28)" />
      {lit.map((i, k) => {
        // Five points spread over the orbit's front and sides, the first just past the limb's right.
        const a = (-0.35 + k * 0.52) * Math.PI
        const t = (tilt * Math.PI) / 180
        const x = cx + rx * Math.cos(a) * Math.cos(t) - ry * Math.sin(a) * Math.sin(t)
        const y = cy + rx * Math.cos(a) * Math.sin(t) + ry * Math.sin(a) * Math.cos(t)
        return <circle key={i} className={s.point} data-i={i} cx={x} cy={y} r="4" />
      })}
    </svg>
  )
}

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

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  // The marker passes a row: once its top crosses the lower 45 % line of the screen it is lit and
  // stays lit. Without motion the stylesheet lights every row from the start.
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return
    const rows = [...el.querySelectorAll<HTMLElement>('[data-row]')]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.setAttribute('data-lit', '')
            el.setAttribute(`data-lit-${rows.indexOf(e.target as HTMLElement)}`, '')
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
      <div className={s.head}>
        <p className="eyebrow mono">{two(5)} / 09 &nbsp;·&nbsp; {t.day.eyebrow}</p>
        <h2 id="day-title" className={`h2 ${s.title}`} data-focus tabIndex={-1}>
          {t.day.title}
        </h2>
        <p className={`lede ${s.lede}`}>{t.day.lede}</p>
      </div>

      {/* The object here: the disk with the five cases as five points of light on one lensed orbit;
          each point lights as its row does. Her line on the object's tangent. */}
      <div className={s.object}>
        <Orbit lit={chapters.map((_, i) => `${i}`)} />
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

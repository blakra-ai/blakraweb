import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { chakraColors, chakraOf, chapters, needs } from '../content/shared'
import { useI18n } from '../i18n'
import { registerAnchor } from '../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { useReveal } from '../motion/useReveal'
import { Patch } from './Patch'
import { Section } from './Section'
import s from './DayTrack.module.css'

const caseNo = (i: number) => String(i + 1).padStart(2, '0')

/**
 * Missions flown: the proof. One patch per real project, woven from the project itself (its
 * layers' colours as the ring, its name as the seal), on a wall like a pilot's. The patch nearest
 * the reader's mission wears the accent stitch and opens first; any patch opens its case below:
 * what the business had, what we built, what changed.
 */
export function DayTrack() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)
  const [choice, setChoice] = useState<PulseChoice>(null)
  const [open, setOpen] = useState(0)
  const nearest = choice && choice !== 'all' ? chapters.findIndex((c) => c.id === needs[choice].proof) : -1
  useEffect(() => {
    const apply = (c: PulseChoice) => {
      setChoice(c)
      const k = c && c !== 'all' ? chapters.findIndex((x) => x.id === needs[c].proof) : -1
      if (k >= 0) setOpen(k)
    }
    apply(getPulse().choice)
    return onPulse(apply)
  }, [])

  // Links to a case (#h06 …) open it and land on the section.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const offs = chapters.map((c, k) =>
      registerAnchor(c.id, () => {
        setOpen(k)
        const card = el.querySelector<HTMLElement>('[data-case]')
        return { top: el.getBoundingClientRect().top + window.scrollY - 24, focus: card }
      }),
    )
    return () => offs.forEach((off) => off())
  }, [])

  return (
    <>
      <Section ref={ref} id="day" beat="proof" className={s.day} aria-labelledby="day-title">
        <div className={s.head}>
          <p className={s.eyebrow}>{t.day.eyebrow}</p>
          <h2 id="day-title" className={s.title} data-focus tabIndex={-1}>
            {t.day.title}
          </h2>
          <p className={s.lede}>{t.day.lede}</p>
        </div>

        <ul className={s.wall} role="tablist" aria-label={t.day.srTitle}>
          {chapters.map((ch, k) => {
            const tx = t.chapters[ch.id]
            return (
              <li role="presentation" key={ch.id} id={ch.id} data-patch={k} style={{ '--i': k } as CSSProperties}>
                <button type="button" role="tab" id={`${ch.id}-tab`} aria-selected={open === k} aria-controls="day-case" className={s.pick} data-magnetic onClick={() => setOpen(k)}>
                  <Patch name={tx.system} layers={ch.layers} motto={`${caseNo(k)} · ${tx.industry}`} highlight={nearest === k} size={150} className={s.patch} />
                  {nearest === k && <span className={s.near}>{t.pulse.proof}</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Every case is in the HTML (readers without JavaScript, and search, get them all); with JavaScript, the open one shows. */}
        {chapters.map((ch, k) => {
          const text = t.chapters[ch.id]
          return (
            <article key={ch.id} id={k === open ? 'day-case' : undefined} role="tabpanel" aria-labelledby={`${ch.id}-tab`} className={s.case} data-case={k === open ? '' : undefined} data-open={k === open ? '' : undefined} tabIndex={-1}>
              <p className={s.no}>
                <span>{caseNo(k)}</span>
                <em>{text.industry}</em>
                <span className={s.sector}>{text.sector}</span>
              </p>
              <h3 className={s.moment}>{text.moment}</h3>
              <dl className={s.story}>
                <div>
                  <dt>{t.ui.before}</dt>
                  <dd>{text.before}</dd>
                </div>
                <div>
                  <dt>
                    {t.ui.now} · {text.system}
                  </dt>
                  <dd>{text.now}</dd>
                </div>
              </dl>
              <ul className={s.outcomes}>
                {ch.outcomes.map((value, i) => (
                  <li key={value}>
                    <strong>{value}</strong> <span>{text.outcomes[i]}</span>
                  </li>
                ))}
              </ul>
              <p className={s.layers}>
                <span className={s.layersLabel}>{t.ui.usesEngine}</span>
                {ch.layers.map((l) => (
                  <a key={l} href={`#layer-${l}`} style={{ '--chakra': chakraColors[chakraOf[l]] } as CSSProperties}>
                    {t.engine.layers[l].name}
                  </a>
                ))}
                <span className={s.stack}>
                  <span className="sr-only">{t.ui.builtWith}: </span>
                  {ch.stack.join(' · ')}
                </span>
              </p>
            </article>
          )
        })}
      </Section>

      <Section id="delivered" className={s.delivered} aria-labelledby="delivered-title">
        <div className={s.deliveredText}>
          <h3 id="delivered-title" className={s.deliveredTitle}>
            {t.day.delivered.title}
          </h3>
          <p className={s.deliveredNote}>{t.day.delivered.note}</p>
          <ul className={s.deliveredList}>
            {t.day.delivered.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  )
}

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { chakraColors, chakraOf, chapters, needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { starAt } from '../features/experience/timeline'
import { useI18n } from '../i18n'
import { registerAnchor, useMotion } from '../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { useActSteps } from '../motion/useActSteps'
import { Section } from './Section'
import s from './DayTrack.module.css'

/** Case number on the card and the index: 01 … 05. */
const caseNo = (i: number) => String(i + 1).padStart(2, '0')
/** A system counts as launched from the moment its star begins to ignite in the film. */
const litAt = (k: number) => starAt(k) - 0.008
const moments = chapters.map((_, k) => litAt(k))

/** A system's colour: the mean of its layers' colours, as its star is tinted in the film. */
function tint(layers: readonly LayerId[]) {
  const sum = [0, 0, 0]
  layers.forEach((l) => {
    const hex = chakraColors[chakraOf[l]]
    for (let j = 0; j < 3; j++) sum[j] += parseInt(hex.slice(1 + j * 2, 3 + j * 2), 16)
  })
  return `rgb(${sum.map((v) => Math.round(v / layers.length)).join(' ')})`
}
const tints = chapters.map((c) => tint(c.layers))

/**
 * Act V of the film: launch, then five systems. The crown releases the jet; along it five stars
 * ignite one after another, and each case is printed on the left at the moment its star lights
 * (the same numbers drive both). The system the visitor's need named in Act III is marked.
 * Wide screens with motion: held, one case at a time. Otherwise, or if a case would not fit the
 * screen: a plain list.
 */
export function DayTrack() {
  const { t } = useI18n()
  const { scrollToHash } = useMotion()
  const ref = useRef<HTMLElement>(null)
  const [choice, setChoice] = useState<PulseChoice>(null)
  // How many systems have launched while held; not held, all of them.
  const { passed, scrollFor } = useActSteps(ref, moments)
  const held = passed !== null
  const lit = passed ?? chapters.length

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  // Links to a case (#h06 …): held, land just after its star ignites; in the list, the card itself.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const offs = chapters.map((c, k) =>
      registerAnchor(c.id, () => {
        const card = el.querySelector<HTMLElement>(`#${c.id}`)
        const focus = card?.querySelector<HTMLElement>('[data-focus]')
        const top = scrollFor(litAt(k) + 0.012)
        if (top !== null) return { top, focus }
        return card ? { top: card.getBoundingClientRect().top + window.scrollY - 96, focus } : null
      }),
    )
    return () => offs.forEach((off) => off())
  }, [scrollFor])

  const go = (e: MouseEvent<HTMLAnchorElement>, k: number) => {
    e.preventDefault()
    scrollToHash(`#${chapters[k].id}`)
  }

  const near = choice && choice !== 'all' ? needs[choice].proof : null
  const stateOf = (k: number) => (k === lit - 1 ? 'on' : k < lit - 1 ? 'past' : 'next')

  return (
    <>
      <Section ref={ref} id="day" beat="proof" className={s.day} aria-labelledby="day-title">
        <div className={s.pin} data-pin>
          <div className={s.text} data-text data-held={held ? '' : undefined}>
            <header className={s.head}>
              <p className={s.eyebrow}>{t.day.eyebrow}</p>
              <h2 id="day-title" className={s.title} data-focus tabIndex={-1}>
                {t.day.title}
              </h2>
            </header>

            <nav className={s.index} aria-label={t.day.srTitle}>
              <ol>
                {chapters.map((c, k) => (
                  <li key={c.id} style={{ '--tint': tints[k] } as CSSProperties}>
                    <a href={`#${c.id}`} aria-current={held && k === lit - 1 ? 'step' : undefined} data-lit={k < lit ? '' : undefined} onClick={(e) => go(e, k)}>
                      <span className={s.star} aria-hidden="true" />
                      <span className={s.indexNo}>{caseNo(k)}</span>
                      <span>{t.chapters[c.id].industry}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Held: one place. The lede while the jet launches, then each case as its star lights. */}
            <div className={s.slot}>
              <div className={s.intro} data-state={lit === 0 ? 'on' : 'past'}>
                <p className={s.lede}>{t.day.lede}</p>
                <p className={s.hint} aria-hidden="true">
                  {t.day.hint} <span>↓</span>
                </p>
              </div>
              <ol className={s.cases}>
                {chapters.map((c, k) => {
                  const text = t.chapters[c.id]
                  return (
                    <li key={c.id} id={c.id} className={s.case} data-state={stateOf(k)} data-near={near === c.id ? '' : undefined} style={{ '--tint': tints[k] } as CSSProperties} aria-labelledby={`${c.id}-moment`}>
                      <p className={s.no}>
                        <span className={s.star} aria-hidden="true" />
                        <span>{caseNo(k)}</span>
                        <em>{text.industry}</em>
                        <span className={s.sector}>{text.sector}</span>
                        {near === c.id && <span className={s.mark}>{t.pulse.proof}</span>}
                      </p>
                      <h3 id={`${c.id}-moment`} className={s.moment} data-focus tabIndex={-1}>
                        {text.moment}
                      </h3>
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
                        {c.outcomes.map((value, i) => (
                          <li key={value}>
                            <strong>{value}</strong> <span>{text.outcomes[i]}</span>
                          </li>
                        ))}
                      </ul>
                      <p className={s.layers}>
                        <span className={s.layersLabel}>{t.ui.usesEngine}</span>
                        {c.layers.map((l) => (
                          <a key={l} href={`#layer-${l}`} style={{ '--chakra': chakraColors[chakraOf[l]] } as CSSProperties}>
                            {t.engine.layers[l].name}
                          </a>
                        ))}
                        <span className={s.stack}>
                          <span className="sr-only">{t.ui.builtWith}: </span>
                          {c.stack.join(' · ')}
                        </span>
                      </p>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </Section>

      {/* After the held section: the rest of the work, described, under the five stars. */}
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

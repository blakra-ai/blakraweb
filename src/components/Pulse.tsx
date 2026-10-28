import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { chakraColors, chakraOf, chapters, layerOrder, needOrder, needs, needTop } from '../content/shared'
import { useI18n } from '../i18n'
import { getPulse, onPulse, setPulse, type PulseChoice } from '../motion/pulse'
import { Section } from './Section'
import s from './Pulse.module.css'

const rootFirst = [...layerOrder].reverse()

/**
 * Act III of the film: why one team, then one question. The answer becomes the film's
 * protagonist: it falls into the disk as a point of light, the layers it takes light up, it
 * points to the system that proves it, and it is carried into the form at the end.
 */
export function Pulse() {
  const { t } = useI18n()
  const p = t.pulse
  const ref = useRef<HTMLElement>(null)
  const [choice, setChoice] = useState<PulseChoice>(null)
  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  const takes = choice === 'all' ? rootFirst : choice ? rootFirst.filter((l) => needs[choice].layers.includes(l)) : []
  const proof = choice && choice !== 'all' ? needs[choice].proof : null
  const chapter = proof ? chapters.find((c) => c.id === proof)! : null

  const option = (value: Exclude<PulseChoice, null>, label: string, tag?: string, color?: string) => (
    <button
      key={value}
      type="button"
      className={s.option}
      data-magnetic
      aria-pressed={choice === value}
      onClick={() => setPulse(choice === value ? null : value)}
      style={color ? ({ '--chakra': color } as CSSProperties) : undefined}
    >
      <span className={s.need}>{label}</span>
      {tag && <span className={s.tag}>{tag}</span>}
    </button>
  )

  return (
    <Section ref={ref} id="pulse" beat="need" className={s.pulse} aria-labelledby="pulse-title">
      <div className={s.frame} data-pin>
      <div className={s.copy}>
        <p className={s.eyebrow}>{p.eyebrow}</p>
        <h2 id="pulse-title" className={s.title} data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.body}>{p.body}</p>
      </div>

      <div className={s.ask} role="group" aria-labelledby="pulse-ask">
        <h3 id="pulse-ask" className={s.askTitle}>
          {p.ask}
        </h3>
        <div className={s.options}>
          {needOrder.map((need) => option(need, p.needs[need].label, p.needs[need].tag, chakraColors[chakraOf[needTop(need)]]))}
          {option('all', p.all, p.allTag)}
        </div>
        <div className={s.result} aria-live="polite" hidden={!choice}>
          {choice && (
            <>
              <p className={s.verdict}>{choice === 'all' ? p.verdictAll : p.verdict}</p>
              <dl className={s.facts}>
                <div>
                  <dt>{p.takes}</dt>
                  <dd className={s.layers}>
                    {takes.map((l) => (
                      <span key={l} style={{ '--chakra': chakraColors[chakraOf[l]] } as CSSProperties}>
                        {t.engine.layers[l].name}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>{p.proof}</dt>
                  <dd>
                    {chapter ? (
                      <a href={`#${chapter.id}`}>
                        {t.chapters[chapter.id].sector}: {chapter.outcomes[0]} {t.chapters[chapter.id].outcomes[0]}
                      </a>
                    ) : (
                      <a href="#delivered">{p.everyProject}</a>
                    )}
                  </dd>
                </div>
              </dl>
              <a className={s.tell} href="#contact">
                {p.tell}
                <span aria-hidden="true">→</span>
              </a>
            </>
          )}
        </div>
      </div>
      </div>
    </Section>
  )
}

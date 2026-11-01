import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { chakraColors, chakraOf, chapters, layerOrder, needOrder, needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { getPulse, onPulse, setPulse, type PulseChoice } from '../motion/pulse'
import { useReveal } from '../motion/useReveal'
import { Patch } from './Patch'
import { Section } from './Section'
import s from './Pulse.module.css'

const rootFirst = [...layerOrder].reverse()
const ALL: readonly LayerId[] = rootFirst

/**
 * Mission select: the page's question. Seven missions as patches (the needs), each woven from
 * the layers it takes; the reader picks one, and the answer threads through the page: the
 * Navigator's lights, the proof nearest to it, and the form at the end.
 */
export function Pulse() {
  const { t } = useI18n()
  const p = t.pulse
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)
  const [choice, setChoice] = useState<PulseChoice>(null)
  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  const takes = choice === 'all' ? ALL : choice ? rootFirst.filter((l) => needs[choice].layers.includes(l)) : []
  const proof = choice && choice !== 'all' ? needs[choice].proof : null
  const chapter = proof ? chapters.find((c) => c.id === proof)! : null

  const mission = (value: Exclude<PulseChoice, null>, label: string, tag: string, layers: readonly LayerId[], i: number) => (
    <li role="presentation" key={value} style={{ '--i': i } as CSSProperties}>
      <button type="button" className={s.mission} data-magnetic aria-pressed={choice === value} onClick={() => setPulse(choice === value ? null : value)}>
        <Patch name={label} layers={layers} highlight={choice === value} size={150} className={s.patch} />
        <span className={s.tag}>{tag}</span>
        <span className="sr-only">: {label}</span>
      </button>
    </li>
  )

  return (
    <Section ref={ref} id="pulse" beat="mission" className={s.pulse} aria-labelledby="pulse-title">
      <div className={s.head}>
        <h2 id="pulse-title" className={s.title} data-focus tabIndex={-1}>
          {p.ask}
        </h2>
        <p className={s.lede}>{p.verdict}</p>
      </div>

      <ul className={s.missions} role="group" aria-labelledby="pulse-title">
        {needOrder.map((need, i) => mission(need, p.needs[need].label, p.needs[need].tag, needs[need].layers, i))}
        {mission('all', p.all, p.allTag, ALL, needOrder.length)}
      </ul>

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
    </Section>
  )
}

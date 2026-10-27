import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { chakraColors, chakraOf, chapters, layerOrder, needOrder, needs, needTop, times } from '../content/shared'
import { useI18n } from '../i18n'
import { poses, type Pose } from '../motion/engine3d/stage'
import { getPulse, onPulse, setPulse, type PulseChoice } from '../motion/pulse'
import { useReveals } from '../motion/useReveals'
import { useStage } from '../motion/useStage'
import { Section } from './Section'
import s from './Pulse.module.css'

const rootFirst = [...layerOrder].reverse()

/**
 * Why one team, then one question. The answer lights the layers that need takes, from
 * the root up to the visitor's own layer, points to the system that proves it, and is
 * carried into the form.
 */
export function Pulse() {
  const { t } = useI18n()
  const p = t.pulse
  const ref = useRef<HTMLElement>(null)
  const [choice, setChoice] = useState<PulseChoice>(null)
  useReveals(ref)
  useStage(ref, { pose: poses.pulse as Pose }, times.pulse)
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
      aria-pressed={choice === value}
      onClick={() => setPulse(choice === value ? null : value)}
      style={color ? ({ '--chakra': color } as CSSProperties) : undefined}
    >
      <span className={s.need}>{label}</span>
      {tag && <span className={s.tag}>{tag}</span>}
    </button>
  )

  return (
    <Section ref={ref} id="pulse" sky="predawn" time={[times.pulse, times.pulse]} className={s.pulse} aria-labelledby="pulse-title">
      <div className={s.copy}>
        <p className={s.eyebrow} data-reveal>
          {p.eyebrow}
        </p>
        <h2 id="pulse-title" className={s.title} data-reveal data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.body} data-reveal>
          {p.body}
        </p>
      </div>

      <div className={s.ask} role="group" aria-labelledby="pulse-ask" data-reveal>
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
    </Section>
  )
}

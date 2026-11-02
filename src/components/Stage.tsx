import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { chakraColors, chakraOf, needOrder, needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useStation } from '../features/observatory/Gauge'
import { chip } from '../features/observatory/gauge'
import { handoverAt, holdAt, inOrbit, LAYERS_N, ORBIT_END } from '../features/observatory/orbit'
import { obs } from '../features/observatory/state'
import { InkWell, WellGrid } from '../features/observatory/Well'
import { useI18n } from '../i18n'
import { useMotion } from '../motion/MotionProvider'
import { getPulse, onPulse, setPulse, type PulseChoice } from '../motion/pulse'
import { onReflow } from '../motion/reflow'
import { Section } from './Section'
import s from './Stage.module.css'

/** The seven layers root to crown (the chakra order), by id. */
const ROOT_TO_CROWN: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']

/**
 * 02 · 03 · 04 The seven-layer stage (art pass v2, on paper): the object held by `position: sticky`
 * inside a section whose CSS height is 2.4 screens, no pins. The page's grid bends into a small ink
 * well (Well.tsx, static SVG); as the hold scrubs, the seven layers draw themselves round it as
 * hairline rings, inner to outer, one every tenth of the hold; this file names each
 * layer ONCE in large type at the moment its band forms (Geist 300, 40 px, the layer's colour as
 * the 2 px line under the name, a 24 px transform on entry), keeps her line on the object's
 * tangent, and lets the words scroll over the window in the left columns: 02 why one team,
 * 03 seven layers, 04 the picker ("What do you need built?"), which keeps the chosen bands lit
 * and dims the rest (obs.picker → the world). The hold's progress is one number per scroll frame
 * (obs.hold); the ring hands over to the gauge's marker across the last tenth (obs.handover).
 * Reduced motion: every band formed and every name shown, the words in flow.
 */
export function Stage() {
  const { t } = useI18n()
  const { enabled } = useMotion()
  const station = useStation()
  const ref = useRef<HTMLElement>(null)
  // All seven formed is the final state (prerendered, reduced motion); the scroll scrubs it back.
  const [orbit, setOrbit] = useState(LAYERS_N)
  const [bandsNow, setBandsNow] = useState(LAYERS_N)
  const [choice, setChoice] = useState<PulseChoice>(null)

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  // The hold: the scroll becomes obs.hold / obs.inOrbit / obs.handover, once per frame; the section's
  // top and height are read on reflow only.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!enabled) {
      obs.hold = 1
      obs.inOrbit = LAYERS_N
      obs.handover = 1
      setOrbit(LAYERS_N)
      setBandsNow(LAYERS_N)
      el.style.removeProperty('--hold')
      return
    }
    let top = 0
    let height = 1
    let frame = 0
    let last = -1
    const update = () => {
      frame = 0
      const hold = holdAt(window.scrollY, top, height, window.innerHeight)
      obs.hold = hold
      obs.handover = handoverAt(hold)
      const n = inOrbit(hold)
      obs.inOrbit = n
      el.style.setProperty('--hold', hold.toFixed(3))
      // The rings draw round as the hold scrubs (one state update per 2 % of a band).
      const b = Math.min(LAYERS_N, (hold / ORBIT_END) * LAYERS_N)
      setBandsNow(Math.round(b * 50) / 50)
      if (n !== last) {
        last = n
        setOrbit(n)
      }
    }
    const measure = () => {
      const r = el.getBoundingClientRect()
      top = r.top + window.scrollY
      height = r.height
      update()
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    measure()
    const off = onReflow(measure)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      off()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [enabled])

  const pick = (next: PulseChoice) => {
    const value = choice === next ? null : next
    setPulse(value)
    obs.picker = value
    obs.glowAt = obs.clock
  }

  const picked: readonly LayerId[] | null = choice === 'all' ? ROOT_TO_CROWN : choice ? needs[choice].layers : null
  const pickedIdx = picked ? ROOT_TO_CROWN.map((l, i) => (picked.includes(l) ? i + 1 : 0)).filter(Boolean) : []
  const nearWork = choice && choice !== 'all' ? needs[choice].work : null
  const at = Math.min(4, Math.max(2, station))
  // The layer named now: the last band that formed (none before the first); all seven without motion.
  const current = orbit - 1

  return (
    <Section ref={ref} id="stage" beat="systems" surface="body" className={s.stage} aria-labelledby="stage-title">
      <div className={s.hold} data-hold>
        {/* The object on paper: the grid bends into the ink well; the seven bands form as hairline rings round it. */}
        <div className={s.object}>
          <WellGrid cx={0.58} cy={0.47} sigma={300} pull={0.62} />
          <div className={s.well}>
            <InkWell r={64} bands={enabled ? bandsNow : LAYERS_N} lit={picked ? ROOT_TO_CROWN.map((id) => picked.includes(id)) : null} />
          </div>
          <p className={`mono ${s.tag}`} aria-hidden="true">
            {chip(at)}
          </p>

          {/* The object's tangent: the layer forming now, named once, in large type. */}
          <div className={s.tangent}>
            <ul className={s.layers} aria-label={t.engine.title}>
              {ROOT_TO_CROWN.map((id, k) => {
                const on = k < orbit
                const isPicked = picked ? picked.includes(id) : on
                return (
                  <li
                    key={id}
                    id={`layer-${id}`}
                    className={s.layer}
                    data-on={on || undefined}
                    data-now={(enabled && k === current) || undefined}
                    data-picked={picked ? isPicked : undefined}
                    style={{ '--chakra': chakraColors[chakraOf[id]] } as CSSProperties}
                  >
                    <span className={s.name}>{t.engine.layers[id].name}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* The words scroll over the held window: one block per station, columns 1–5 (an opaque band on phones). */}
      <div className={s.words}>
        <div className={s.block} data-station={2}>
          <p className="eyebrow mono">{t.pulse.eyebrow}</p>
          <h2 className={`h2 ${s.h2}`}>{t.pulse.title}</h2>
          <p className={`lede ${s.lede}`}>{t.pulse.body}</p>
        </div>
        <div className={s.block} data-station={3}>
          <p className="eyebrow mono">{t.engine.eyebrow}</p>
          <h2 id="stage-title" className={`h2 ${s.h2}`} data-focus tabIndex={-1}>
            {t.engine.title}
          </h2>
          <p className={`lede ${s.lede}`}>{t.engine.lede}</p>
          <p className={`lede ${s.crown}`}>{t.engine.crownTitle}</p>
        </div>
        <div className={`${s.block} ${s.picker}`} data-station={4} id="pulse">
          <h2 id="pulse-title" className={`h2 ${s.ask}`} data-focus tabIndex={-1}>
            {t.pulse.ask}
          </h2>
          <div className={s.pills} role="radiogroup" aria-labelledby="pulse-title">
            {[...needOrder, 'all' as const].map((need) => (
              <button key={need} type="button" role="radio" aria-checked={choice === need} className={`pill ${s.pill}`} onClick={() => pick(need)}>
                {need === 'all' ? t.pulse.allTag : t.pulse.needs[need].tag}
                <span className="sr-only">: {need === 'all' ? t.pulse.all : t.pulse.needs[need].label}</span>
              </button>
            ))}
          </div>
          <div className={s.takes} aria-live="polite">
            {choice && <p className={`lede ${s.verdict}`}>{choice === 'all' ? t.pulse.verdictAll : t.pulse.verdict}</p>}
            {choice && (
              <p className={s.usesLine}>
                {t.pulse.uses} {pickedIdx.join(', ')} ·{' '}
                <a className={s.proof} href={nearWork ? `#work-${nearWork}` : '#work'}>
                  {t.pulse.proof} <span aria-hidden="true">↓</span>
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

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

/** The vendor grid's four areas (design, the app, backend, AI) as their layers' chakra indices. */
const VENDOR_CHAKRA = [3, 4, 0, 6] as const

/**
 * Phones: the seven layers as rings round the black disc with its gold rim (root inside, crown
 * outside). `lit` dims the rings not chosen (opacity on strokes only); `settle` lets the rings
 * settle into orbit with the scroll (CSS view timeline; the final state without it).
 */
function Orbit({ lit, settle, className }: { lit: readonly LayerId[] | null; settle?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 360" aria-hidden="true" data-settle={settle || undefined}>
      <defs>
        <radialGradient id={settle ? 'm-glow' : 'm-glow-mini'}>
          <stop offset="0.55" stopColor="#d9a441" stopOpacity="0.28" />
          <stop offset="1" stopColor="#d9a441" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="180" cy="180" r="96" fill={`url(#${settle ? 'm-glow' : 'm-glow-mini'})`} />
      {ROOT_TO_CROWN.map((id, i) => (
        <circle key={id} cx="180" cy="180" r={84 + i * 15} fill="none" stroke={chakraColors[chakraOf[id]]} strokeWidth="1.6" data-ring={i} data-dim={(lit && !lit.includes(id)) || undefined} />
      ))}
      <circle cx="180" cy="180" r="66" fill="#000" stroke="#d9a441" strokeWidth="1.6" />
    </svg>
  )
}

/** The seven layers root to crown (the chakra order), by id. */
const ROOT_TO_CROWN: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']

/**
 * 03 · 04 · 05 The seven-layer stage (art pass v2, on paper): the object held by `position: sticky`
 * inside a section whose CSS height is 2.4 screens, no pins. The page's grid bends into a small ink
 * well (Well.tsx, static SVG); as the hold scrubs, the seven layers draw themselves round it as
 * hairline rings, inner to outer, one every tenth of the hold; this file names each
 * layer ONCE in large type at the moment its band forms (Geist 300, 40 px, the layer's colour as
 * the 2 px line under the name, a 24 px transform on entry), keeps her line on the object's
 * tangent, and lets the words scroll over the window in the left columns: 03 why one team,
 * 04 seven layers, 05 the picker ("What do you need built?"), which keeps the chosen bands lit
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
  const at = Math.min(5, Math.max(3, station))
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
        <div className={s.block} data-station={3}>
          <p className="eyebrow mono">{t.pulse.eyebrow}</p>
          <h2 className={`h2 ${s.h2}`}>{t.pulse.title}</h2>
          <p className={`d-only lede ${s.lede}`}>{t.pulse.body}</p>
          {/* Phones: the argument drawn: four vendors drift apart, one gold wire joins the four layers. */}
          <div className={`m-only ${s.why}`}>
            <p className={`mono ${s.whyLabel}`}>{t.pulse.usualShort}</p>
            <ul className={s.vendors}>
              {t.pulse.vendorsShort.map((v, i) => (
                <li key={v.area} style={{ '--chakra': chakraColors[VENDOR_CHAKRA[i]!] } as CSSProperties} data-m-drift={i}>
                  <b>{v.area}</b>
                  <span className="mono">{v.who}</span>
                </li>
              ))}
            </ul>
            <div className={s.withUs} data-m-surface="ink">
              <p className={`mono ${s.whyLabel}`}>{t.pulse.withUsLabelShort}</p>
              <div className={s.wire} aria-hidden="true">
                <i className={s.wireLine} />
                {VENDOR_CHAKRA.map((c) => (
                  <i key={c} className={s.wireDot} style={{ '--chakra': chakraColors[c] } as CSSProperties} />
                ))}
              </div>
              <p className={s.withText}>{t.pulse.withUsShort}</p>
            </div>
            <p className={`lede ${s.lede}`}>{t.pulse.bodyShort}</p>
          </div>
        </div>
        <div className={s.block} data-station={4} data-m-surface="ink">
          <p className="eyebrow mono">{t.engine.eyebrow}</p>
          <h2 id="stage-title" className={`h2 ${s.h2}`} data-focus tabIndex={-1}>
            {t.engine.title}
          </h2>
          <p className={`d-only lede ${s.lede}`}>{t.engine.lede}</p>
          <p className={`m-only lede ${s.lede}`}>{t.engine.ledeShort}</p>
          {/* Phones: the seven rings settle into orbit round the disc, then one row per layer, crown to root. */}
          <Orbit className={`m-only ${s.orbit}`} lit={null} settle />
          <div className={`m-only ${s.rows}`}>
            {[...ROOT_TO_CROWN].reverse().map((id) => (
              <details key={id} name="m-layers" open={id === 'ai'} className={s.row} style={{ '--chakra': chakraColors[chakraOf[id]] } as CSSProperties}>
                <summary>
                  <i aria-hidden="true" />
                  <span className={s.rowName}>{t.engine.layers[id].name}</span>
                  <span className={`mono ${s.rowN}`} aria-hidden="true">
                    0{chakraOf[id] + 1}
                  </span>
                </summary>
                <p>{t.engine.layers[id].text}</p>
              </details>
            ))}
          </div>
          <p className={`lede ${s.crown}`}>{t.engine.crownTitle}</p>
        </div>
        <div className={`${s.block} ${s.picker}`} data-station={5} id="pulse">
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
          <Orbit className={`m-only ${s.mini}`} lit={picked} />
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

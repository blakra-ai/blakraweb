import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { chakraColors, chakraOf, needOrder, needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { handoverAt, holdAt, inOrbit, LAYERS_N, ORBIT_END } from '../features/observatory/orbit'
import { obs } from '../features/observatory/state'
import { InkWell, WellGrid } from '../features/observatory/Well'
import { useI18n } from '../i18n'
import { PHONE } from '../mobile/swipe'
import { useMotion } from '../motion/MotionProvider'
import { getPulse, onPulse, setPulse, type PulseChoice } from '../motion/pulse'
import { onReflow } from '../motion/reflow'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Stage.module.css'

/** The vendor grid's four areas (design, the app, backend, AI) as their layers' chakra indices. */
const VENDOR_CHAKRA = [3, 4, 0, 6] as const
/** The held disc's radius in the well's own units; its seven rings reach 97 further (Well.tsx). */
const DISC_R = 300
const REACH = DISC_R + 97
/** The rings' radii, for the empty orbits drawn under the ones that have formed. */
const RING_R = Array.from({ length: LAYERS_N }, (_, k) => DISC_R + 16 + k * 11)

const two = (n: number) => String(n).padStart(2, '0')
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

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

/** Which words are on screen beside the disc: its rings wait, form, then answer the picker. */
type Phase = 'why' | 'layers' | 'picker'

/**
 * The held object (desktop): the grid bends into a disc of about 40 % of the screen's height, its
 * seven orbits drawn empty. As "Seven layers" is read the scroll forms them one by one, root to
 * crown, each in its layer's colour, and the disc names the layer forming now and says what it
 * does; at the picker the chosen rings stay lit. This component alone re-renders with the scroll
 * (one SVG and one list), and it writes nothing to the section's style; phones hold nothing, so
 * they neither listen nor render on scroll.
 */
function Held({ section, picked, pickedTag }: { section: RefObject<HTMLElement | null>; picked: readonly LayerId[] | null; pickedTag: string | null }) {
  const { t } = useI18n()
  const { enabled } = useMotion()
  // All seven formed is the final state (prerendered, reduced motion); the scroll scrubs it back.
  const [bands, setBands] = useState<number>(LAYERS_N)
  const [phase, setPhase] = useState<Phase>('picker')
  const [bend, setBend] = useState({ cx: 0.64, cy: 0.5, sigma: 380 })
  const well = useRef<HTMLDivElement>(null)

  // The page's grid bends toward wherever the disc stands at this size (read on reflow only).
  useEffect(() => {
    const measure = () => {
      const el = well.current
      const box = el?.parentElement
      if (!el || !box || !box.clientWidth) return
      const a = el.getBoundingClientRect()
      const b = box.getBoundingClientRect()
      setBend({ cx: (a.left + a.width / 2 - b.left) / b.width, cy: (a.top + a.height / 2 - b.top) / b.height, sigma: Math.round(a.width * 0.75) })
    }
    measure()
    return onReflow(measure)
  }, [])

  // The scroll, once per frame: where the reader is against the section's blocks, read on reflow only.
  useEffect(() => {
    const el = section.current
    if (!el) return
    if (!enabled || window.matchMedia(PHONE).matches) {
      obs.hold = 1
      obs.inOrbit = LAYERS_N
      obs.handover = 1
      setBands(LAYERS_N)
      setPhase('picker')
      return
    }
    let top = 0
    let height = 1
    let layersTop = 0
    let pickerTop = 1
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const vh = window.innerHeight
      // The rings form while "Seven layers" is being read: from its entrance until the picker's words are well in.
      const from = layersTop - 0.6 * vh
      const to = pickerTop - 0.3 * vh
      const b = LAYERS_N * clamp01((y - from) / Math.max(1, to - from))
      // What the world reads: its strips take the colour of the band forming now (World.tsx: hold / ORBIT_END).
      const formed = (b / LAYERS_N) * ORBIT_END
      obs.hold = formed
      obs.inOrbit = inOrbit(formed)
      obs.handover = handoverAt(holdAt(y, top, height, vh))
      // One state update per 2 % of a band; React skips the same value.
      setBands(Math.round(b * 50) / 50)
      setPhase(y < from ? 'why' : y < pickerTop - 0.25 * vh ? 'layers' : 'picker')
    }
    const measure = () => {
      const r = el.getBoundingClientRect()
      top = r.top + window.scrollY
      height = r.height
      const at = (station: number) => (el.querySelector(`[data-station="${station}"]`)?.getBoundingClientRect().top ?? 0) + window.scrollY
      layersTop = at(4)
      pickerTop = at(5)
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
  }, [enabled, section])

  const orbit = bands <= 0 ? 0 : Math.min(LAYERS_N, Math.floor(bands) + 1)
  const atPicker = phase === 'picker'
  // The layer named now: the last band that formed, while its words are on screen.
  const current = enabled && phase === 'layers' ? orbit - 1 : -1
  const lit = picked ? ROOT_TO_CROWN.map((id) => picked.includes(id)) : null

  return (
    <div className={s.hold} data-hold>
      {/* The object on paper: the grid bends into the disc; the seven bands form round it. */}
      <div className={s.object} data-phase={phase}>
        <WellGrid cx={bend.cx} cy={bend.cy} sigma={bend.sigma} pull={0.62} />
        <div ref={well} className={s.well}>
          <svg className={s.ghost} viewBox={`0 0 ${REACH * 2} ${REACH * 2}`} aria-hidden="true">
            {RING_R.map((r) => (
              <circle key={r} cx={REACH} cy={REACH} r={r} />
            ))}
          </svg>
          <InkWell r={DISC_R} bands={enabled ? bands : LAYERS_N} lit={lit} />
        </div>

        {/* Inside the disc: the instrument's readout, then the layer forming now, named once, and what it does. */}
        <div className={s.tangent}>
          <p className={`mono ${s.readout}`} aria-hidden="true">
            {atPicker && picked ? (
              <>
                {t.engine.itTakes} {two(picked.length)} / {two(LAYERS_N)}
              </>
            ) : (
              <>
                {t.engine.inOrbit} {two(orbit)} / {two(LAYERS_N)}
              </>
            )}
          </p>
          {atPicker && pickedTag && (
            <p className={s.pick} aria-hidden="true">
              {pickedTag}
            </p>
          )}
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
                  data-now={k === current || undefined}
                  data-picked={picked ? isPicked : undefined}
                  style={{ '--chakra': chakraColors[chakraOf[id]] } as CSSProperties}
                >
                  <span className={s.name}>{t.engine.layers[id].name}</span>
                  <span className={s.layerText}>{t.engine.layers[id].text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * 03 · 04 · 05 The seven-layer stage (on paper): the object held by `position: sticky` inside a
 * section whose height comes from its three word blocks in CSS, no pins. The words scroll over the
 * left columns: 03 why one team, with the usual hand-offs drawn as a diagram; 04 the seven layers,
 * which the disc names as they form; 05 the picker ("What do you need built?"), which keeps the
 * chosen bands lit and dims the rest. Reduced motion: every band formed and every layer listed
 * with its text beside the disc, the words in flow.
 */
export function Stage() {
  const { t, locale } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const [choice, setChoice] = useState<PulseChoice>(null)

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  const pick = (next: PulseChoice) => {
    const value = choice === next ? null : next
    setPulse(value)
    obs.picker = value
    obs.glowAt = obs.clock
  }

  const picked: readonly LayerId[] | null = choice === 'all' ? ROOT_TO_CROWN : choice ? needs[choice].layers : null
  const pickedRoot = picked ? ROOT_TO_CROWN.filter((id) => picked.includes(id)) : []
  const pickedTag = choice === 'all' ? t.pulse.allTag : choice ? t.pulse.needs[choice].tag : null
  const nearWork = choice && choice !== 'all' ? needs[choice].work : null

  return (
    <Section ref={ref} id="stage" beat="systems" surface="body" className={s.stage} aria-labelledby="stage-title">
      <Held section={ref} picked={picked} pickedTag={pickedTag} />

      {/* The words scroll over the held window: one block per station in the left columns (plain blocks on phones). */}
      <div className={s.words}>
        <div className={s.block} data-station={3}>
          <p className="eyebrow mono">
            {two(3)} / 10 &nbsp;·&nbsp; {t.pulse.eyebrow}
          </p>
          <h2 className={`h2 ${s.h2}`}>{t.pulse.title}</h2>
          <p className={`d-only lede ${s.lede}`}>{t.pulse.body}</p>
          {/* The argument drawn: four vendors drift apart, one gold wire joins the four layers. */}
          <div className={s.why}>
            <p className={`mono ${s.whyLabel}`}>{t.pulse.usualShort}</p>
            <ul className={s.vendors}>
              {t.pulse.vendorsShort.map((v, i) => (
                <li key={v.area} style={{ '--chakra': chakraColors[VENDOR_CHAKRA[i]!] } as CSSProperties} data-m-drift={i}>
                  <b>{v.area}</b>
                  <span className="mono">{v.who}</span>
                </li>
              ))}
            </ul>
            <div className={`dark ${s.withUs}`} data-m-surface="ink">
              <p className={`mono ${s.whyLabel}`}>{t.pulse.withUsLabelShort}</p>
              <div className={s.wire} aria-hidden="true">
                <i className={s.wireLine} />
                {VENDOR_CHAKRA.map((c) => (
                  <i key={c} className={s.wireDot} style={{ '--chakra': chakraColors[c] } as CSSProperties} />
                ))}
              </div>
              <p className={s.withText}>{t.pulse.withUsShort}</p>
            </div>
            <p className={`m-only lede ${s.lede}`}>{t.pulse.bodyShort}</p>
          </div>
        </div>
        <div className={`${s.block} ${s.layersBlock}`} data-station={4} data-m-surface="ink">
          <p className="eyebrow mono">
            {two(4)} / 10 &nbsp;·&nbsp; {t.engine.eyebrow}
          </p>
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
          <p className="eyebrow mono">{two(5)} / 10</p>
          <h2 id="pulse-title" className={`h2 ${s.h2}`} data-focus tabIndex={-1}>
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
            {choice && (
              <>
                <p className={`lede ${s.verdict}`}>{choice === 'all' ? t.pulse.verdictAll : t.pulse.verdict}</p>
                <div className={s.uses}>
                  <p className={`mono ${s.usesLabel}`}>{t.pulse.uses}</p>
                  <ul className={s.usesList}>
                    {pickedRoot.map((id) => (
                      <li key={id} style={{ '--chakra': chakraColors[chakraOf[id]] } as CSSProperties}>
                        {t.engine.layers[id].name}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className={s.next}>
                  <a className="pill" data-primary data-size="lg" href={`${pathFor('home', locale)}#contact`}>
                    {t.pulse.tell} <span aria-hidden="true">→</span>
                  </a>
                  <a className={s.proof} href={nearWork ? `#work-${nearWork}` : '#work'}>
                    {t.pulse.proof} <span aria-hidden="true">↓</span>
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

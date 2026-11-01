import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { chakraColors, chakraOf, chapters, needOrder, needs } from '../content/shared'
import type { LayerId } from '../content/types'
import { useStation } from '../features/observatory/Gauge'
import { chip } from '../features/observatory/gauge'
import { Voice } from '../features/observatory/Line'
import { handoverAt, holdAt, inOrbit, LAYERS_N, orbitsFor, TILT, type Orbit } from '../features/observatory/orbit'
import { obs } from '../features/observatory/state'
import { Window } from '../features/observatory/Window'
import { frameWindow } from '../features/observatory/windows'
import { useI18n } from '../i18n'
import { useMotion } from '../motion/MotionProvider'
import { getPulse, onPulse, setPulse, type PulseChoice } from '../motion/pulse'
import { onReflow } from '../motion/reflow'
import { Section } from './Section'
import s from './Stage.module.css'

/** The seven layers root to crown (the chakra order), by id. */
const ROOT_TO_CROWN: readonly LayerId[] = ['cloud', 'data', 'automation', 'design', 'apps', 'growth', 'ai']
const two = (n: number) => String(n).padStart(2, '0')

/**
 * 02 · 03 · 04 The seven-layer stage (storyboard d-02, d-02b, d-03b; m-02 on phones): one
 * window held by `position: sticky` inside a section whose CSS height is three screens (two on
 * phones), no pins, the page height fixed from the start. The world paints the bent grid, the
 * ring and the guide through it; this file draws what the storyboard puts in the DOM: the
 * orbits and leaders (one static SVG, laid out by orbit.ts and re-measured on reflow only), the
 * seven labels with their dots (real text, lit by weight and dot), the counter, her line, and the
 * words that scroll over the window in the left columns: 02 why one team, 03 seven layers, 04 the
 * picker ("What do you need built?"), which lights the layers it takes on the orbits and in her
 * irises (obs.picker → the world) and points down to the proof. The hold's progress is one
 * number per scroll frame (obs.hold); the ring hands over to the gauge's marker across its last
 * tenth (obs.handover, scrubbed by the world). Reduced motion: everything in its final state, the
 * words in flow.
 */
export function Stage() {
  const { t } = useI18n()
  const { enabled } = useMotion()
  const station = useStation()
  const ref = useRef<HTMLElement>(null)
  const [geom, setGeom] = useState<{ w: number; h: number; cx: number; cy: number; orbits: Orbit[] } | null>(null)
  // All seven in orbit is the final state (prerendered, reduced motion); the scroll scrubs it back.
  const [orbit, setOrbit] = useState(LAYERS_N)
  const [choice, setChoice] = useState<PulseChoice>(null)

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  // Geometry: the window's size and the orbits round the ring, measured on reflow only.
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-window="stage"]')
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const f = frameWindow('stage', { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height })
      const phone = r.width < 600
      setGeom({ w: r.width, h: r.height, cx: f.ring.x, cy: f.ring.y, orbits: orbitsFor(f.ring.x, f.ring.y, f.ring.r, phone ? 'left' : 'right') })
    }
    measure()
    return onReflow(measure)
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
  const proof = choice && choice !== 'all' ? needs[choice].proof : null
  const chapter = proof ? chapters.find((c) => c.id === proof) : null
  const at = Math.min(4, Math.max(2, station))
  const line = at === 2 ? t.navigator.lines.manifesto : at === 3 ? t.navigator.lines.systems : t.navigator.lines.mission
  const counterN = picked ? pickedIdx.length : orbit

  return (
    <Section ref={ref} id="stage" beat="systems" surface="body" className={s.stage} aria-labelledby="stage-title">
      <div className={s.hold}>
        <Window id="stage" kind="stage" ring className={s.window}>
          <p className={`mono ${s.tag}`} aria-hidden="true">
            {chip(at)}
          </p>
          <p className={`mono ${s.counter}`} aria-live="off">
            {picked ? t.engine.itTakes : t.engine.inOrbit} <b>{two(counterN)} / {two(LAYERS_N)}</b>
          </p>

          {/* The orbits: static SVG, one ellipse and leader per layer in orbit; a dashed grid line waits for the rest. */}
          {geom && (
            <svg className={s.orbits} viewBox={`0 0 ${geom.w} ${geom.h}`} width={geom.w} height={geom.h} aria-hidden="true">
              {geom.orbits.map((o, k) => {
                const on = k < orbit
                const left = o.label.x < geom.w / 2
                return (
                  <g key={k} data-on={on || undefined}>
                    {on ? (
                      <>
                        <ellipse className={s.orbit} cx={geom.cx} cy={geom.cy} rx={o.rx} ry={o.ry} transform={`rotate(${TILT} ${geom.cx} ${geom.cy})`} />
                        <path className={s.leader} d={left ? `M${o.label.x + 80} ${o.label.y} L${o.dot.x} ${o.dot.y}` : `M${o.dot.x} ${o.dot.y} L${o.label.x - 8} ${o.label.y}`} />
                      </>
                    ) : (
                      <path className={s.waiting} d={left ? `M0 ${o.label.y} L${o.label.x + 80} ${o.label.y}` : `M${o.label.x - 8} ${o.label.y} L${geom.w} ${o.label.y}`} />
                    )}
                  </g>
                )
              })}
            </svg>
          )}

          {/* The seven layers: real text, each lit by its dot and weight once in orbit; the picker dims the rest. */}
          <ul className={s.layers} aria-label={t.engine.title}>
            {ROOT_TO_CROWN.map((id, k) => {
              const o = geom?.orbits[k]
              const on = k < orbit
              const isPicked = picked ? picked.includes(id) : on
              const dot = on && o ? { dx: o.dot.x - o.label.x, dy: o.dot.y - o.label.y } : null
              return (
                <li
                  key={id}
                  id={`layer-${id}`}
                  tabIndex={-1}
                  className={s.layer}
                  data-on={on || undefined}
                  data-picked={picked ? isPicked : undefined}
                  style={{ '--chakra': chakraColors[chakraOf[id]], left: o ? `${o.label.x}px` : undefined, top: o ? `${o.label.y}px` : undefined } as CSSProperties}
                >
                  <i className={s.dot} aria-hidden="true" style={dot ? ({ '--dx': `${dot.dx}px`, '--dy': `${dot.dy}px` } as CSSProperties) : undefined} />
                  <span className={s.name}>
                    {two(k + 1)} {t.engine.layers[id].name}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className={s.voice}>
            <p className={`mono ${s.voiceTag}`}>
              <b>{t.navigator.name}</b>
            </p>
            <Voice text={line} delay={0} />
          </div>
        </Window>
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
            <span className="mono">{t.pulse.takes}</span>
            <span className={s.dots} aria-hidden="true">
              {ROOT_TO_CROWN.map((id, k) => (
                <i key={id} data-on={picked ? picked.includes(id) || undefined : undefined} style={{ '--chakra': chakraColors[k] } as CSSProperties} />
              ))}
            </span>
            <span className={`mono ${s.uses}`}>{picked ? `${t.pulse.uses} ${pickedIdx.join(', ')}` : ''}</span>
            {choice && (
              <p className={`lede ${s.verdict}`}>{choice === 'all' ? t.pulse.verdictAll : t.pulse.verdict}</p>
            )}
            {choice && (
              <a className={`mono ${s.proof}`} href={chapter ? `#${chapter.id}` : '#delivered'}>
                {t.pulse.proof} <span aria-hidden="true">↓</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}

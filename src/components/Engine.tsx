import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { chakraColors, chakraOf, chapters, layerOrder, layerTech, needTop, times } from '../content/shared'
import type { LayerId } from '../content/types'
import { useI18n } from '../i18n'
import { chakraY, mixPose, poses, setBoost, type Pose } from '../motion/engine3d/stage'
import { gsap, layouts, ScrollTrigger } from '../motion/gsap'
import { stickyScrollTop, stickyTracker } from '../motion/sticky'
import { registerAnchor } from '../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { useMotionSetup } from '../motion/useMotionSetup'
import { useStage } from '../motion/useStage'
import { Section } from './Section'
import s from './Engine.module.css'

// The pin, in three acts: the disk turns edge-on and its bands lift off; the camera
// travels down to the root; then the scroll climbs the column, one layer per step.
const REVEAL = 0.16
const TRAVEL = 0.26
/** Root first: the list reads top to bottom in the order the scroll climbs it. */
const byIndex = [...layerOrder].reverse()

const climbPose = (k: number): Pose => ({ ...poses.close(0), target: [0, chakraY(k), 0], dist: 7.8, el: 0.3, shift: [0.36, 0] })
const smooth = (x: number) => x * x * (3 - 2 * x)

/** The scene for a point in the pin (0 … 1). */
function poseAt(p: number): Partial<Pose> {
  const reveal = poses.reveal as Pose
  if (p < REVEAL) {
    const t = p / REVEAL
    return { ...reveal, lift: t, column: 0.6 + 0.4 * t }
  }
  if (p < TRAVEL) {
    const t = smooth((p - REVEAL) / (TRAVEL - REVEAL))
    return { ...mixPose({ ...reveal, lift: 1, column: 1 }, climbPose(0), t), lift: 1, flow: 0, bloom: 0 }
  }
  const c = ((p - TRAVEL) / (1 - TRAVEL)) * 7
  return { ...climbPose(Math.min(6, Math.max(0, c - 0.5))), flow: c, bloom: c }
}

/** How far up the column a point in the pin has climbed, in layers (0 … 7). */
const climbAt = (p: number) => Math.max(0, ((p - TRAVEL) / (1 - TRAVEL)) * 7)

/**
 * The reveal: from above, the five systems of the day look like one flow; turned on its
 * side, the flow is seven layers, the seven layers of a complete product, and BLAKRA builds
 * every one. On desktop the scroll climbs them, root to crown; hover or focus picks one.
 */
export function Engine() {
  const { t } = useI18n()
  const e = t.engine
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState<LayerId | null>(null)
  const [climbed, setClimbed] = useState(7)
  const [pinned, setPinned] = useState(false)
  const [choice, setChoice] = useState<PulseChoice>(null)
  const activeRef = useRef<LayerId | null>(null)
  activeRef.current = active
  const inView = useRef(false)
  const pinnedRef = useRef(false)
  const tracker = useRef<ReturnType<typeof stickyTracker> | null>(null)

  // The camera follows a smoothed scroll position, so the reveal and the climb glide.
  const live = useCallback((y: number) => (tracker.current ? poseAt(tracker.current.at(y)) : null), [])
  // Phones: the engine flows, and the camera rests on the crown above the list.
  useStage(ref, { pose: poses.overview as Pose, narrow: { target: [0, chakraY(6), 0], dist: 9.5, el: 0.3, shift: [0, 0.26], fade: 0.85 }, hold: true, live }, times.engine)

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  useEffect(() => {
    if (inView.current) setBoost(active ? [active] : null, 'engine')
  }, [active])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => {
        inView.current = self.isActive
        setBoost(self.isActive && activeRef.current ? [activeRef.current] : null, 'engine')
      },
    })
    return () => st.kill()
  }, [])

  // Links to a layer (#layer-data …): pinned, each layer owns a seventh of the climb; land in its middle.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const offs = layerOrder.map((layer) =>
      registerAnchor(`layer-${layer}`, () => {
        const row = el.querySelector<HTMLElement>(`#layer-${layer}`)
        const focus = row?.querySelector<HTMLElement>('button')
        const k = chakraOf[layer]
        if (pinnedRef.current) return { top: stickyScrollTop(el, TRAVEL + ((k + 0.5) / 7) * (1 - TRAVEL)), focus }
        setActive(layer)
        return row ? { top: row.getBoundingClientRect().top + window.scrollY - 120, focus } : null
      }),
    )
    return () => offs.forEach((off) => off())
  }, [])

  // Desktop with motion: the section is tall and its content sticky; the scroll position
  // through it drives the reveal and the climb. React state changes only at each step.
  useMotionSetup(ref, (root) => {
    const mm = gsap.matchMedia()
    mm.add(layouts.pinned, () => {
      pinnedRef.current = true
      setPinned(true)
      let step = -2
      const own = stickyTracker(root)
      tracker.current = own
      ScrollTrigger.addEventListener('refresh', own.measure)
      const tick = () => {
        const p = own.progress()
        const c = climbAt(p)
        const next = p < TRAVEL ? -1 : Math.min(6, Math.floor(c))
        if (next === step) return
        step = next
        setClimbed(p < TRAVEL ? 0 : next + 1)
        setActive(next < 0 ? null : byIndex[next])
      }
      tick()
      gsap.ticker.add(tick)
      return () => {
        gsap.ticker.remove(tick)
        ScrollTrigger.removeEventListener('refresh', own.measure)
        pinnedRef.current = false
        tracker.current = null
        setPinned(false)
        setClimbed(7)
      }
    })
  })

  // Hover and focus pick a layer only when the scroll is not already choosing one.
  const pick = (layer: LayerId) => {
    if (!pinnedRef.current) setActive(layer)
  }

  // A row that scrolls under a resting cursor (after a link lands here) is not a choice:
  // only a pointer that moved onto it picks it. Enter events come before move events, so
  // the last move still holds the old position when a real hover arrives.
  const lastMove = useRef<[number, number]>([-1, -1])
  useEffect(() => {
    const onMove = (e: MouseEvent) => (lastMove.current = [e.clientX, e.clientY])
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  const hover = (layer: LayerId, e: ReactMouseEvent<HTMLButtonElement>) => {
    const [x, y] = lastMove.current
    if (x === e.clientX && y === e.clientY) return
    pick(layer)
  }

  const usedAt = (layer: LayerId) => (layer === 'cloud' ? null : chapters.filter((c) => c.layers.includes(layer)))
  const atCrown = pinned && climbed >= 7
  // The visitor's answer in the pulse marks the highest layer it takes.
  const marked = choice && choice !== 'all' ? needTop(choice) : null

  return (
    <Section ref={ref} id="engine" beat="layers" sky="ink" time={[times.engine, times.engine]} className={s.engine} aria-labelledby="engine-title">
      <div className={s.pin} data-pin>
        <div className={s.text} data-pinned={pinned ? '' : undefined} data-crown={atCrown ? '' : undefined}>
          <p className={s.eyebrow}>{e.eyebrow}</p>
          <h2 id="engine-title" className={s.title} data-focus tabIndex={-1}>
            {e.title}
          </h2>
          <div className={s.swap}>
            <p className={s.lede}>{e.lede}</p>
            <div className={s.crown}>
              <p className={s.crownTitle}>{e.crownTitle}</p>
              <p className={s.crownText}>
                {e.crownText} <span className={s.source}>{e.crownSource}</span>
              </p>
            </div>
          </div>
          <ol className={s.layers}>
            {byIndex.map((layer) => {
              const k = chakraOf[layer]
              const used = usedAt(layer)
              return (
                <li
                  key={layer}
                  id={`layer-${layer}`}
                  data-active={active === layer ? '' : undefined}
                  data-climbed={climbed > k ? '' : undefined}
                  style={{ '--chakra': chakraColors[k] } as CSSProperties}
                >
                  <button type="button" className={s.layer} aria-pressed={active === layer} aria-describedby={`layer-${layer}-text`} onMouseEnter={(e) => hover(layer, e)} onFocus={() => pick(layer)} onClick={() => pick(layer)}>
                    <span className={s.index} aria-hidden="true">
                      0{k + 1}
                    </span>
                    <span className={s.layerName}>
                      {e.layers[layer].name}
                      {marked === layer && <span className={s.focus}>{e.focus}</span>}
                    </span>
                    <span className={s.chakra} aria-hidden="true" />
                  </button>
                  <div id={`layer-${layer}-text`} className={s.detail}>
                    <p className={s.layerText}>{e.layers[layer].text}</p>
                    <p className={s.meta}>
                      {layerTech[layer].join(' · ')}
                      {(!used || used.length > 0) && (
                        <span className={s.used}>
                          {' · '}
                          {e.usedAt} {used ? used.map((c) => t.chapters[c.id].system).join(' · ') : e.everywhere}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className={s.symbol}>{e.symbol}</p>
        </div>
      </div>
    </Section>
  )
}

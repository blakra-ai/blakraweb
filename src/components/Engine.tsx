import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { chakraColors, chakraOf, chapters, layerOrder, layerTech, needTop } from '../content/shared'
import type { LayerId } from '../content/types'
import { scrollAt, storyAt } from '../features/experience/scrollMap'
import { bloomAt } from '../features/experience/timeline'
import { useI18n } from '../i18n'
import { gsap, layouts } from '../motion/gsap'
import { registerAnchor } from '../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { useMotionSetup } from '../motion/useMotionSetup'
import { Section } from './Section'
import s from './Engine.module.css'

/** Root first: the list reads top to bottom in the order the centres bloom. */
const byIndex = [...layerOrder].reverse()

/**
 * Act IV of the film: seven layers, one team. The camera turns to watch the spin axis while
 * the disk's seven bands rise one by one, root first, and bloom into their centres; each row
 * of the list lights at the moment its centre blooms (the same numbers drive both). Then light
 * charges the column from root to crown, and the crown line explains why AI sits on top.
 */
export function Engine() {
  const { t } = useI18n()
  const e = t.engine
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState<LayerId | null>(null)
  const [bloomed, setBloomed] = useState(7)
  const [held, setHeld] = useState(false)
  const [choice, setChoice] = useState<PulseChoice>(null)
  const heldRef = useRef(false)

  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])

  // Links to a layer (#layer-data …): held, land at the moment its centre blooms.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const offs = layerOrder.map((layer) =>
      registerAnchor(`layer-${layer}`, () => {
        const row = el.querySelector<HTMLElement>(`#layer-${layer}`)
        const focus = row?.querySelector<HTMLElement>('button')
        const top = heldRef.current ? scrollAt(bloomAt(chakraOf[layer]) + 0.012) : null
        if (top !== null) return { top, focus }
        setActive(layer)
        return row ? { top: row.getBoundingClientRect().top + window.scrollY - 120, focus } : null
      }),
    )
    return () => offs.forEach((off) => off())
  }, [])

  // Held (wide screens, motion on): the scroll blooms the centres; React state changes only at each step.
  useMotionSetup(ref, () => {
    const mm = gsap.matchMedia()
    mm.add(layouts.pinned, () => {
      heldRef.current = true
      setHeld(true)
      let step = -2
      const tick = () => {
        const t = storyAt(window.scrollY)
        let n = 0
        while (n < 7 && t >= bloomAt(n)) n++
        if (n === step) return
        step = n
        setBloomed(n)
        setActive(n === 0 ? null : byIndex[n - 1])
      }
      tick()
      gsap.ticker.add(tick)
      return () => {
        gsap.ticker.remove(tick)
        heldRef.current = false
        setHeld(false)
        setBloomed(7)
      }
    })
  })

  // Hover and focus pick a layer only when the scroll is not already choosing one.
  const pick = (layer: LayerId) => {
    if (!heldRef.current) setActive(layer)
  }
  // A row that scrolls under a resting cursor is not a choice: only a pointer that moved onto it picks it.
  const lastMove = useRef<[number, number]>([-1, -1])
  useEffect(() => {
    const onMove = (ev: MouseEvent) => (lastMove.current = [ev.clientX, ev.clientY])
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  const hover = (layer: LayerId, ev: ReactMouseEvent<HTMLButtonElement>) => {
    const [x, y] = lastMove.current
    if (x === ev.clientX && y === ev.clientY) return
    pick(layer)
  }

  const usedAt = (layer: LayerId) => (layer === 'cloud' ? null : chapters.filter((c) => c.layers.includes(layer)))
  const atCrown = held && bloomed >= 7
  const marked = choice && choice !== 'all' ? needTop(choice) : null

  return (
    <Section ref={ref} id="engine" beat="layers" className={s.engine} aria-labelledby="engine-title">
      <div className={s.pin} data-pin>
        <div className={s.text} data-held={held ? '' : undefined} data-crown={atCrown ? '' : undefined}>
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
                  data-bloomed={bloomed > k ? '' : undefined}
                  style={{ '--chakra': chakraColors[k] } as CSSProperties}
                >
                  <button type="button" className={s.layer} aria-pressed={active === layer} aria-describedby={`layer-${layer}-text`} onMouseEnter={(ev) => hover(layer, ev)} onFocus={() => pick(layer)} onClick={() => pick(layer)}>
                    <span className={s.dot} aria-hidden="true" />
                    <span className={s.index} aria-hidden="true">
                      0{k + 1}
                    </span>
                    <span className={s.layerName}>
                      {e.layers[layer].name}
                      {marked === layer && <span className={s.focus}>{e.focus}</span>}
                    </span>
                  </button>
                  <div id={`layer-${layer}-text`} className={s.detail}>
                    <div>
                    {/* Held, the detail sits under the list: it names its layer (the row already does for assistive tech). */}
                    <p className={s.detailName} aria-hidden="true">
                      <span className={s.dot} />0{k + 1} · {e.layers[layer].name}
                    </p>
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

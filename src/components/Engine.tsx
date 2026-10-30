import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { chakraColors, chakraOf, chapters, layerOrder, layerTech, needs, needTop } from '../content/shared'
import type { LayerId } from '../content/types'
import { CHAKRAS } from '../features/navigator/yantra'
import { useI18n } from '../i18n'
import { registerAnchor } from '../motion/MotionProvider'
import { getPulse, onPulse, type PulseChoice } from '../motion/pulse'
import { gsap, layouts } from '../motion/gsap'
import { useHold } from '../motion/useHold'
import { useMotionSetup } from '../motion/useMotionSetup'
import { Section } from './Section'
import s from './Engine.module.css'

/** Crown first: the list reads top to bottom as the exploded helmet does, antenna to life-support. */
const crownFirst = layerOrder

/**
 * The seven systems: the promise, openly. The Navigator comes to the centre and opens into his
 * parts along his axis (the world draws that, with each part's callout); here, in the same order,
 * each system is named and explained as the scroll reaches it. The layers a chosen mission takes
 * stand in full light; the others wait.
 */
export function Engine() {
  const { t } = useI18n()
  const e = t.engine
  const ref = useRef<HTMLElement>(null)
  useHold(ref)
  const [choice, setChoice] = useState<PulseChoice>(null)
  useEffect(() => {
    setChoice(getPulse().choice)
    return onPulse(setChoice)
  }, [])
  // Held (wide screens, motion on): the rows are compact and the layer the scroll has reached
  // explains itself in one place under them; -1 when not held (every row carries its words).
  const [current, setCurrent] = useState(-1)
  useMotionSetup(ref, (root) => {
    const mm = gsap.matchMedia()
    mm.add(layouts.pinned, () => {
      let last = -2
      const tick = () => {
        const hold = Math.max(1, root.offsetHeight - window.innerHeight)
        const p = Math.min(1, Math.max(0, (window.scrollY - (root.getBoundingClientRect().top + window.scrollY)) / hold))
        // The same thresholds as the rows' CSS: row i begins to open at p = 0.08 + i × 0.11.
        const k = Math.min(6, Math.max(0, Math.floor((p - 0.08) / 0.11)))
        if (k === last) return
        last = k
        setCurrent(k)
      }
      tick()
      gsap.ticker.add(tick)
      return () => {
        gsap.ticker.remove(tick)
        setCurrent(-1)
      }
    })
  })

  // Links to a layer (#layer-data …) land on the section with that row in view.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const offs = layerOrder.map((layer) =>
      registerAnchor(`layer-${layer}`, () => {
        const row = el.querySelector<HTMLElement>(`#layer-${layer}`)
        const top = el.getBoundingClientRect().top + window.scrollY
        const hold = Math.max(0, el.offsetHeight - window.innerHeight)
        // Held: the moment the exploded view has opened that far; otherwise the row itself.
        const k = 6 - chakraOf[layer]
        return hold > 0 ? { top: top + hold * Math.min(1, 0.15 + k * 0.12), focus: row } : row ? { top: row.getBoundingClientRect().top + window.scrollY - 120, focus: row } : null
      }),
    )
    return () => offs.forEach((off) => off())
  }, [])

  const takes = (layer: LayerId) => !choice || (choice === 'all' ? true : needs[choice].layers.includes(layer))
  const marked = choice && choice !== 'all' ? needTop(choice) : null
  const usedAt = (layer: LayerId) => (layer === 'cloud' ? null : chapters.filter((c) => c.layers.includes(layer)))

  return (
    <Section ref={ref} id="engine" beat="systems" surface="ink" className={s.engine} aria-labelledby="engine-title">
      <div className={s.pin} data-pin>
        <div className={s.text} data-held={current >= 0 ? '' : undefined}>
          <p className={s.eyebrow}>{e.eyebrow}</p>
          <h2 id="engine-title" className={s.title} data-focus tabIndex={-1}>
            {e.title}
          </h2>
          <p className={s.lede}>{e.lede}</p>
          <ol className={s.layers}>
            {crownFirst.map((layer, i) => {
              const k = chakraOf[layer]
              const used = usedAt(layer)
              return (
                <li key={layer} id={`layer-${layer}`} tabIndex={-1} className={s.layer} data-layer={k} data-dim={takes(layer) ? undefined : ''} data-current={current === i ? '' : undefined} style={{ '--chakra': chakraColors[k], '--i': i } as CSSProperties}>
                  <span className={s.index} aria-hidden="true">
                    0{k + 1}
                  </span>
                  <span className={s.body}>
                    <span className={s.name}>
                      {e.layers[layer].name}
                      <small className={s.part}>{CHAKRAS[k].part}</small>
                      {marked === layer && <span className={s.focus}>{e.focus}</span>}
                    </span>
                    <span className={s.layerText}>{e.layers[layer].text}</span>
                    <span className={s.meta}>
                      {layerTech[layer].join(' · ')}
                      {(!used || used.length > 0) && (
                        <>
                          {' · '}
                          {e.usedAt} {used ? used.map((c) => t.chapters[c.id].system).join(' · ') : e.everywhere}
                        </>
                      )}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
          <p className={s.crown}>
            <em>{e.crownTitle}</em> {e.crownText} <span className={s.source}>{e.crownSource}</span>
          </p>
        </div>
      </div>
    </Section>
  )
}

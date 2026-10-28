import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { chapters, chakraColors, chakraOf, hourAccents } from '../content/shared'
import { useI18n } from '../i18n'
import { poses, setBoost, type Pose } from '../motion/engine3d/stage'
import { gsap, layouts, ScrollTrigger } from '../motion/gsap'
import { toneStyle } from '../motion/tone'
import { stickyScrollTop, stickyTracker } from '../motion/sticky'
import { registerAnchor, useMotion } from '../motion/MotionProvider'
import { useMotionSetup } from '../motion/useMotionSetup'
import { useStage } from '../motion/useStage'
import { Visual } from '../visuals/Visual'
import s from './DayTrack.module.css'

// Dimmer than the hero: the cards carry this section, the disk turns behind them.
/** Case number on the card and the index: 01 … 05. */
const caseNo = (i: number) => String(i + 1).padStart(2, '0')

const dayPose: Pose = { ...(poses.hero as Pose), target: [0, -0.6, 0], dist: 21, el: 0.46, shift: [0, 0.04], fade: 0.62, column: 0.4, flow: 7 }

/**
 * Five businesses, five systems, as one horizontal track: one card per system. The card
 * in view sets its colour and lights the layers its system runs on in the engine.
 * Desktop with motion: pinned and scroll-driven. Phones: a native swipe carousel.
 * Motion off or no JS: a plain vertical list.
 */
export function DayTrack() {
  const { t } = useI18n()
  const { enabled, scrollToHash } = useMotion()
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const pinnedRef = useRef<{ start: number; end: number } | null>(null)

  const inView = useRef(false)
  const tracker = useRef<ReturnType<typeof stickyTracker> | null>(null)
  // The accretion disk seen from above turns as the track crosses the screen.
  // Each card lights the layers its system runs on.
  const live = useCallback((y: number) => (tracker.current ? { az: 0.3 + tracker.current.at(y) * Math.PI * 1.1 } : null), [])
  useStage(ref, { pose: dayPose, hold: true, live })

  // The card in view lights the chakras of the layers its system runs on.
  const activate = useCallback((i: number) => {
    activeRef.current = i
    setActive(i)
    if (!inView.current) return
    setBoost(chapters[i].layers, 'day')
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => {
        inView.current = self.isActive
        if (self.isActive) activate(activeRef.current)
        else setBoost(null, 'day')
      },
    })
    return () => st.kill()
  }, [activate])

  // Not pinned (phones, motion off): the card most in view is the active one.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const cards = [...el.querySelectorAll<HTMLElement>('[data-card]')]
    const io = new IntersectionObserver(
      (entries) => {
        if (pinnedRef.current) return
        const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (best) activate(cards.indexOf(best.target as HTMLElement))
      },
      { threshold: [0.55, 0.8] },
    )
    cards.forEach((c) => io.observe(c))
    return () => io.disconnect()
  }, [activate, enabled])

  // Desktop with motion: the section is as tall as the track is wide and its content is
  // sticky; the scroll position moves the cards sideways. No snapping: the reader's scroll
  // is never taken over.
  useMotionSetup(ref, (root) => {
    const mm = gsap.matchMedia()
    mm.add(layouts.pinned, () => {
      const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')]
      // A held card has the screen's height. If any of its text would not fit (a short laptop
      // screen, a long translation, larger text or the reader's own text spacing), the day
      // reads as a list instead: nothing is ever cut off.
      // Boxes as drawn (the interface may be zoomed); the track moves sideways only, so the
      // vertical comparison holds at any scroll position.
      const fits = () =>
        cards.every((card) => {
          const box = card.getBoundingClientRect()
          return [...card.children].every((part) => {
            const r = part.getBoundingClientRect()
            return r.top >= box.top - 1 && r.bottom <= box.bottom + 1
          })
        })
      let release = () => {}
      const choose = () => {
        release()
        delete root.dataset.flow
        if (fits()) release = hold()
        else {
          root.dataset.flow = 'list'
          release = () => delete root.dataset.flow
        }
      }
      choose()
      // Text that grows later (web fonts, the reader's text spacing) re-checks; a resize may also
      // make room again.
      let frame = 0
      const recheck = () => {
        if (frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          if (root.dataset.flow || !fits()) choose()
        })
      }
      const grow = new ResizeObserver(() => {
        if (!root.dataset.flow && !fits()) recheck()
      })
      // The cards too: a card that gets shorter (the heading above it wrapping once fonts load) re-checks.
      cards.forEach((card) => [card, ...card.children].forEach((el) => grow.observe(el)))
      window.addEventListener('resize', recheck)
      return () => {
        cancelAnimationFrame(frame)
        grow.disconnect()
        window.removeEventListener('resize', recheck)
        release()
      }
    })

    function hold() {
      const track = root.querySelector<HTMLElement>('[data-track]')!
      const viewport = track.parentElement!
      const fill = root.querySelector<HTMLElement>('[data-fill]')
      const visuals = [...root.querySelectorAll<HTMLElement>('[data-visual]')]
      let distance = 0
      let width = 0
      let centres: number[] = []
      let sizes: number[] = []
      let dpr = 1
      // Whole device pixels, so text on the moving layers stays sharp wherever they stop.
      const snap = (v: number) => Math.round(v * dpr) / dpr
      let lastX = Number.NaN
      let movedAt = 0
      const own = stickyTracker(root)
      tracker.current = own
      const measure = () => {
        distance = Math.max(0, track.scrollWidth - viewport.clientWidth)
        width = viewport.clientWidth
        centres = visuals.map((v) => v.parentElement!.offsetLeft + v.parentElement!.offsetWidth / 2)
        sizes = visuals.map((v) => v.offsetWidth)
        dpr = window.devicePixelRatio || 1
        // Cards travel three times faster than the page: each one crosses in about a third of a screen.
        root.style.height = `${window.innerHeight + distance * 0.3}px`
        own.measure()
      }
      measure()
      pinnedRef.current = { start: 0, end: 0 }
      // Writes only: every position comes from the scroll offset and the cached measurements.
      const tick = () => {
        const p = own.progress()
        const x = snap(-p * distance)
        const now = performance.now()
        if (x !== lastX) {
          lastX = x
          movedAt = now
          // The interfaces hold still while the track moves: their animations repaint, and
          // repainting moving layers is what a laptop GPU cannot keep up with. They resume on rest.
          if (!('moving' in track.dataset)) track.dataset.moving = ''
          track.style.transform = `translate3d(${x}px, 0, 0)`
          if (fill) fill.style.transform = `scaleX(${p})`
          // Depth: each card's interface drifts against its text as the track moves (up to 4% of its width).
          visuals.forEach((v, i) => (v.style.transform = `translate3d(${snap(((centres[i] + x - width / 2) / width) * -0.04 * sizes[i])}px, 0, 0)`))
        } else if ('moving' in track.dataset && now - movedAt > 160) delete track.dataset.moving
        const i = Math.round(p * (chapters.length - 1))
        if (i !== activeRef.current) activate(i)
      }
      tick()
      gsap.ticker.add(tick)
      window.addEventListener('resize', measure)
      ScrollTrigger.addEventListener('refresh', measure)
      return () => {
        gsap.ticker.remove(tick)
        window.removeEventListener('resize', measure)
        ScrollTrigger.removeEventListener('refresh', measure)
        root.style.height = ''
        track.style.transform = ''
        delete track.dataset.moving
        if (fill) fill.style.transform = ''
        visuals.forEach((v) => (v.style.transform = ''))
        pinnedRef.current = null
        tracker.current = null
      }
    }
  })

  // Links to a card (#h06 …) from anywhere: pinned, a card is a scroll position along the track;
  // in the swipe carousel it is the section plus a horizontal centring; in the list, the card itself.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const cards = [...el.querySelectorAll<HTMLElement>('[data-card]')]
    const top = (node: HTMLElement) => node.getBoundingClientRect().top + window.scrollY
    const offs = chapters.map((c, i) =>
      registerAnchor(c.id, () => {
        const card = cards[i]
        const focus = card.querySelector<HTMLElement>('[data-focus]')
        if (pinnedRef.current) return { top: stickyScrollTop(el, i / (chapters.length - 1)) + 2, focus }
        const vertical = getComputedStyle(card.parentElement!).flexDirection === 'column'
        if (vertical) return { top: top(card) - 80, focus }
        return { top: top(el), focus, after: () => card.scrollIntoView({ block: 'nearest', inline: 'center' }) }
      }),
    )
    return () => offs.forEach((off) => off())
  }, [])

  const go = (e: MouseEvent<HTMLAnchorElement>, i: number) => {
    e.preventDefault()
    scrollToHash(`#${chapters[i].id}`)
  }

  return (
    <>
      <section ref={ref} id="day" data-beat="proof" className={s.day} data-tone="dark" style={toneStyle('dark')} aria-labelledby="day-title">
        <div className={s.pin} data-pin>
          <header className={s.head}>
            <p className={s.eyebrow}>{t.day.eyebrow}</p>
            <h2 id="day-title" className={s.title} data-focus tabIndex={-1}>
              {t.day.title}
            </h2>
            <p className={s.lede}>{t.day.lede}</p>
            <p className={s.hint} aria-hidden="true">
              {t.day.hint} <span>→</span>
            </p>
          </header>

          <div className={s.viewport}>
            <ol className={s.track} data-track>
              {chapters.map((c, i) => {
                const text = t.chapters[c.id]
                return (
                  <li
                    key={c.id}
                    id={c.id}
                    className={s.card}
                    data-card
                    data-active={i === active ? '' : undefined}
                    style={{ '--accent': hourAccents[c.sky as keyof typeof hourAccents] } as CSSProperties}
                    aria-labelledby={`${c.id}-moment`}
                  >
                    <div className={s.text}>
                      <p className={s.time}>
                        <span>{caseNo(i)}</span>
                        <em>{text.industry}</em>
                      </p>
                      <p className={s.sector}>{text.sector}</p>
                      <h3 id={`${c.id}-moment`} className={s.moment} data-focus tabIndex={-1}>
                        {text.moment}
                      </h3>
                      <dl className={s.story}>
                        <div>
                          <dt>{t.ui.before}</dt>
                          <dd>{text.before}</dd>
                        </div>
                        <div>
                          <dt>
                            {t.ui.now} · {text.system}
                          </dt>
                          <dd>{text.now}</dd>
                        </div>
                      </dl>
                      <ul className={s.outcomes}>
                        {c.outcomes.map((value, k) => (
                          <li key={value}>
                            <strong>{value}</strong> <span>{text.outcomes[k]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={s.visual} data-visual>
                      <Visual scene={c.scene} />
                    </div>
                    {/* Under the interface on wide screens, so the story column keeps its height. */}
                    <p className={s.layers}>
                      <span className={s.layersLabel}>{t.ui.usesEngine}</span>
                      {c.layers.map((l) => (
                        <a key={l} href={`#layer-${l}`} style={{ '--chakra': chakraColors[chakraOf[l]] } as CSSProperties}>
                          {t.engine.layers[l].name}
                        </a>
                      ))}
                      <span className={s.stack}>
                        <span className="sr-only">{t.ui.builtWith}: </span>
                        {c.stack.join(' · ')}
                      </span>
                    </p>
                  </li>
                )
              })}
            </ol>
          </div>

          <nav className={s.progress} aria-label={t.day.srTitle}>
            <span className={s.rail} aria-hidden="true">
              <span className={s.fill} data-fill />
            </span>
            <ol>
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} aria-current={i === active ? 'step' : undefined} onClick={(e) => go(e, i)}>
                    <span className={s.tickTime}>{caseNo(i)}</span>
                    <span className={s.tickLabel}>{t.chapters[c.id].industry}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* Outside the held section, whose height is the track's: the rest of the work, described. */}
      <section id="delivered" className={s.delivered} data-tone="dark" style={toneStyle('dark')} aria-labelledby="delivered-title">
        <div className={s.deliveredHead}>
          <h3 id="delivered-title" className={s.deliveredTitle}>
            {t.day.delivered.title}
          </h3>
          <p className={s.deliveredNote}>{t.day.delivered.note}</p>
        </div>
        <ul className={s.deliveredList}>
          {t.day.delivered.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  )
}

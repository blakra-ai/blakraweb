import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { useI18n } from '../../i18n'
import { onReflow } from '../../motion/reflow'
import { STATIONS, chip, markerY, progressFrom, stationY } from './gauge'
import { obs } from './state'
import s from './Gauge.module.css'

/* ---------- the driver: the scroll becomes obs.station / obs.progress ---------- */

const listeners = new Set<() => void>()
let tops: number[] = []
let started = false
let frame = 0

function measure() {
  tops = [...document.querySelectorAll<HTMLElement>('[data-station]')]
    .map((el) => el.getBoundingClientRect().top + window.scrollY - headerPx() - phoneLead())
    .sort((a, b) => a - b)
  update()
}
/** Phones: the chip turns to a chapter once its top passes the upper eighth of the screen (anchor links land 88 px down). */
function phoneLead() {
  return window.matchMedia('(max-width: 767px)').matches ? window.innerHeight * 0.12 : 0
}
function headerPx() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--header-h')
  return v.endsWith('rem') ? Number.parseFloat(v) * 16 : Number.parseFloat(v) || 88
}
function update() {
  const { station, progress } = progressFrom(window.scrollY, tops)
  const changed = station !== obs.station
  obs.station = station
  obs.progress = progress
  if (changed) listeners.forEach((fn) => fn())
}
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    update()
    moveMarkers()
  })
}
const markers = new Set<(progress: number) => void>()
function moveMarkers() {
  markers.forEach((fn) => fn(obs.progress))
}
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('scroll', onScroll, { passive: true })
  onReflow(measure)
  measure()
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  start()
  return () => listeners.delete(fn)
}
const getStation = () => obs.station
const getServerStation = () => 1

/** The station on screen (1 … 9), live. */
export function useStation(): number {
  return useSyncExternalStore(subscribe, getStation, getServerStation)
}

/* ---------- the chip: "04 / 09", in the header on phones ---------- */

/** The chip dot's colour per chapter on phones: gold, the crown's violet where AI is the subject. */
const DOT: Record<number, string> = { 3: 'currentColor', 4: 'var(--crown)', 6: 'var(--crown)' }

export function GaugeChip({ className }: { className?: string }) {
  const station = useStation()
  const { t } = useI18n()
  // The chapter's name on phones, from words the page already uses (no new copy).
  const names = ['', t.products.eyebrow, t.pulse.eyebrow, t.engine.title.split('.')[0], t.engine.focus, t.engine.layers.ai.name, t.process.eyebrow, t.ui.nav.people, t.ui.nav.work, t.contact.eyebrow]
  const name = names[station - 1]
  return (
    <span className={`${s.chip}${className ? ` ${className}` : ''}`} aria-live="polite" aria-atomic="true" style={{ '--dot': DOT[station] ?? '#d9a441' } as CSSProperties}>
      <i className={s.chipDot} aria-hidden="true" />
      {chip(station)}
      {name && <span className={s.chipName}>{name}</span>}
    </span>
  )
}

/* ---------- the gauge: the left 24 px gutter is a ruler ---------- */


/**
 * The thread (art pass v2): an orange 2 px line in the left 24 px gutter, drawn down as the page
 * scrolls (stroke-dashoffset from `obs.progress`, by the scroll driver above: no layout reads), a
 * tick and the station's "04 / 09" at each of the nine stations. Under 768 px it is a 2 px rule
 * under the header instead, and the header carries the chip. Aria-hidden: the stations are real
 * headings in the document; the chip announces the station.
 */
const RULE = 1000 // the SVG's rule length (any value: positions are shares of it)
export function Gauge() {
  const station = useStation()
  const line = useRef<SVGLineElement>(null)
  const rule = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const move = (p: number) => {
      if (line.current) line.current.style.strokeDashoffset = `${RULE - markerY(p, RULE)}`
      if (rule.current) rule.current.style.transform = `scaleX(${markerY(p, 1)})`
    }
    markers.add(move)
    start()
    move(obs.progress)
    return () => {
      markers.delete(move)
    }
  }, [])

  return (
    <>
      <div className={s.gauge} aria-hidden="true" data-mounted={mounted || undefined}>
        <svg className={s.thread} viewBox={`0 0 24 ${RULE}`} preserveAspectRatio="none">
          <line x1="12" y1="0" x2="12" y2={RULE} className={s.threadRest} />
          <line ref={line} x1="12" y1="0" x2="12" y2={RULE} className={s.threadLine} strokeDasharray={RULE} strokeDashoffset={RULE} />
        </svg>
        {Array.from({ length: STATIONS }, (_, i) => i + 1).map((n) => (
          <span key={n} className={s.station} data-on={n <= station || undefined} data-now={n === station || undefined} style={{ top: `${stationY(n, 100)}%` }}>
            <i className={s.tickMark} />
            <b>{chip(n)}</b>
          </span>
        ))}
      </div>
      <div className={s.rule} aria-hidden="true">
        <i ref={rule} className={s.ruleFill} />
      </div>
    </>
  )
}

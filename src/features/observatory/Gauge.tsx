import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { onReflow } from '../../motion/reflow'
import { STATIONS, chip, markerY, progressFrom, readout, stationY } from './gauge'
import { obs } from './state'
import s from './Gauge.module.css'

/* ---------- the driver: the scroll becomes obs.station / obs.progress ---------- */

const listeners = new Set<() => void>()
let tops: number[] = []
let started = false
let frame = 0

function measure() {
  tops = [...document.querySelectorAll<HTMLElement>('[data-station]')]
    .map((el) => el.getBoundingClientRect().top + window.scrollY - headerPx())
    .sort((a, b) => a - b)
  update()
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

export function GaugeChip({ className }: { className?: string }) {
  const station = useStation()
  return (
    <span className={`${s.chip}${className ? ` ${className}` : ''}`} aria-live="polite" aria-atomic="true">
      <i className={s.chipDot} aria-hidden="true" />
      {chip(station)}
    </span>
  )
}

/* ---------- the gauge: the left 24 px gutter is a ruler ---------- */

const RULE_PX = 1000 // the rule's length in the CSS (any value: positions are percentages of it)

/**
 * Nine stations with major ticks (and three minor ticks between neighbours), a marker that moves
 * with `obs.progress` by transform only, and a mono readout rotated along the rule on desktop.
 * Under 768 px the rule is a 2 px progress line under the header instead (no rotated text), and
 * the header carries the chip. The gauge is aria-hidden: the stations are real headings in the
 * document; the chip announces the station.
 */
export function Gauge({ labels }: { labels?: Partial<Record<number, string>> }) {
  const station = useStation()
  const marker = useRef<HTMLElement>(null)
  const rule = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const move = (p: number) => {
      if (marker.current) marker.current.style.transform = `translateY(${(markerY(p, RULE_PX) / RULE_PX) * 100}cqh)`
      if (rule.current) rule.current.style.transform = `scaleX(${markerY(p, 1)})`
    }
    markers.add(move)
    start()
    move(obs.progress)
    return () => {
      markers.delete(move)
    }
  }, [])

  const ticks: { y: number; major: boolean }[] = []
  for (let n = 1; n <= STATIONS; n++) {
    ticks.push({ y: stationY(n, 100), major: true })
    if (n < STATIONS) for (let k = 1; k < 4; k++) ticks.push({ y: stationY(n, 100) + (k * (100 / (STATIONS - 1))) / 4, major: false })
  }

  return (
    <>
      <div className={s.gauge} aria-hidden="true" data-mounted={mounted || undefined} data-light={station === 7 || station === 8 || undefined}>
        {ticks.map((t, i) => (
          <i key={i} className={t.major ? s.major : s.tick} style={{ top: `${t.y}%` }} />
        ))}
        <i ref={marker} className={s.marker} />
        <span className={s.read}>
          <b>{readout(station)}</b>
          {labels?.[station] && <> · {labels[station]}</>}
        </span>
      </div>
      <div className={s.rule} aria-hidden="true" data-light={station === 7 || station === 8 || undefined}>
        <i ref={rule} className={s.ruleFill} />
      </div>
    </>
  )
}

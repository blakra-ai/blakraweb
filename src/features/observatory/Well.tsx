import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { onReflow } from '../../motion/reflow'
import { wellWarp } from './windows'

/*
 * The object on paper (art pass v2): the page's hairline ink grid bends into a small ink well
 * where the hole's object stood, drawn as static SVG: `WellGrid` warps the grid toward the well
 * (the same `wellWarp` the dark windows use, sampled along each line as the storyboard's sb.js
 * does), laid out once per size on reflow, never per frame; `InkWell` is the disk with, by
 * section, the seven bands as hairline rings, the five cases on one hairline orbit, or the chosen
 * layers as ticks on its rim.
 */

export const GRID = 24
const INK = 'rgba(11, 11, 13, 0.14)'
const SAMPLES = 40

/** The grid, bent toward (cx, cy) (fractions of the box) with the well's sigma (px) and pull. Fills its parent. */
export function WellGrid({ cx, cy, sigma = 320, pull = 0.66, className }: { cx: number; cy: number; sigma?: number; pull?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const el = ref.current?.parentElement
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    return onReflow(measure)
  }, [])
  let d = ''
  if (box) {
    const { w, h } = box
    const x0 = cx * w
    const y0 = cy * h
    const warp = (x: number, y: number) => {
      const dx = x - x0
      const dy = y - y0
      const r = Math.hypot(dx, dy) || 1e-6
      const f = wellWarp(r, sigma, pull) / r
      return `${(x0 + dx * f).toFixed(1)} ${(y0 + dy * f).toFixed(1)}`
    }
    for (let x = GRID; x < w; x += GRID) {
      for (let i = 0; i <= SAMPLES; i++) d += `${i ? 'L' : 'M'}${warp(x, (h * i) / SAMPLES)}`
    }
    for (let y = GRID; y < h; y += GRID) {
      for (let i = 0; i <= SAMPLES; i++) d += `${i ? 'L' : 'M'}${warp((w * i) / SAMPLES, y)}`
    }
  }
  return (
    <svg ref={ref} className={className} aria-hidden="true" style={grid} viewBox={box ? `0 0 ${box.w} ${box.h}` : undefined} preserveAspectRatio="none">
      {d && <path d={d} fill="none" stroke={INK} strokeWidth="1" vectorEffect="non-scaling-stroke" />}
    </svg>
  )
}
const grid: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }

export interface InkWellProps {
  /** The disk's radius in px; the drawing is sized to its outermost mark. */
  r: number
  /** The seven layers as concentric hairline rings, inner to outer: how many have formed (0 … 7, fractional). */
  bands?: number
  /** Which bands stand at full ink (the picker's choice); the rest at 30 %. Null: all. */
  lit?: readonly boolean[] | null
  /** The five cases as dots on one hairline orbit: which are lit. */
  dots?: readonly boolean[]
  /** The chosen layers as ticks on the rim (1 … 7, root at the top). */
  ticks?: readonly number[]
  /** The ticks' colour: the accent on paper. */
  tick?: string
  /** The sealed hairline ring round the ticks (the products' well). */
  seal?: boolean
  className?: string
}

/** The ink well: the disk and, by section, its rings, its orbit of dots or its ticks. */
export function InkWell({ r, bands, lit, dots, ticks, tick = 'var(--accent)', seal, className }: InkWellProps) {
  const reach = bands !== undefined ? r + 16 + 7 * 11 + 4 : dots ? r * 2.2 : ticks ? r + 44 : r + 4
  const size = reach * 2
  const c = reach
  const el: React.ReactNode[] = []
  el.push(<circle key="disk" cx={c} cy={c} r={r} fill="var(--porcelain)" />)
  if (bands !== undefined) {
    for (let k = 0; k < 7; k++) {
      const form = Math.max(0, Math.min(1, bands - k))
      if (form <= 0) continue
      const rk = r + 16 + k * 11
      const on = lit ? lit[k] : true
      // Each ring draws itself round from the top as it forms.
      const len = 2 * Math.PI * rk
      el.push(
        <circle
          key={`b${k}`}
          cx={c}
          cy={c}
          r={rk}
          fill="none"
          stroke="var(--porcelain)"
          strokeOpacity={on ? 1 : 0.3}
          strokeWidth={1 + k * 0.15}
          strokeDasharray={len}
          strokeDashoffset={len * (1 - form)}
          transform={`rotate(-90 ${c} ${c})`}
        />,
      )
    }
  }
  if (dots) {
    const rx = r * 2.1
    const ry = r * 0.62
    el.push(<ellipse key="orbit" cx={c} cy={c} rx={rx} ry={ry} transform={`rotate(-14 ${c} ${c})`} fill="none" stroke="var(--porcelain)" strokeOpacity="0.3" />)
    dots.forEach((on, k) => {
      const a = (-0.35 + k * 0.52) * Math.PI
      const t = (-14 * Math.PI) / 180
      const x = c + rx * Math.cos(a) * Math.cos(t) - ry * Math.sin(a) * Math.sin(t)
      const y = c + rx * Math.cos(a) * Math.sin(t) + ry * Math.sin(a) * Math.cos(t)
      el.push(<circle key={`d${k}`} cx={x} cy={y} r={on ? 5 : 3.5} fill="var(--porcelain)" fillOpacity={on ? 1 : 0.3} />)
    })
  }
  if (ticks) {
    if (seal) el.push(<circle key="seal" cx={c} cy={c} r={r + 40} fill="none" stroke="var(--porcelain)" strokeOpacity="0.3" />)
    // The ring of ticks at r + 16: the chosen layers long and in the accent, the rest short hairlines.
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + k * ((2 * Math.PI) / 7)
      const on = ticks.includes(k + 1)
      const x1 = c + (r + 10) * Math.cos(a)
      const y1 = c + (r + 10) * Math.sin(a)
      const x2 = c + (r + (on ? 26 : 18)) * Math.cos(a)
      const y2 = c + (r + (on ? 26 : 18)) * Math.sin(a)
      el.push(<line key={`t${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? tick : 'var(--porcelain)'} strokeOpacity={on ? 1 : 0.3} strokeWidth={on ? 3 : 1.5} strokeLinecap="round" />)
    }
  }
  return (
    <svg className={className} data-ink-well viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      {el}
    </svg>
  )
}

/**
 * The depth gauge's arithmetic, pure so it is testable: ten stations along a rule of a given
 * length, the marker's position from the page's progress, and the mono readouts. The gauge reads
 * station numbers, never fabricated depths (systems.md, "Honesty").
 */

export const STATIONS = 10

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Where station `n` (1 … 10) sits on a rule `length` px long: 01 at 0, 10 at the foot. */
export function stationY(n: number, length: number): number {
  const i = Math.min(STATIONS, Math.max(1, Math.round(n))) - 1
  return (i * length) / (STATIONS - 1)
}

/** Where the marker sits for a page progress (0 … 1). */
export function markerY(progress: number, length: number): number {
  return clamp01(progress) * length
}

/**
 * The page's progress from the scroll position and the stations' page tops: 0 at the first
 * station's top, 1 at the last station's top, linear between neighbours so the marker glides from
 * tick to tick as the reader does (storyboard, "the gauge marker glides 01 → 02").
 */
export function progressFrom(scrollY: number, tops: readonly number[]): { station: number; progress: number } {
  if (tops.length < 2) return { station: 1, progress: 0 }
  const last = tops.length - 1
  if (scrollY <= tops[0]) return { station: 1, progress: 0 }
  if (scrollY >= tops[last]) return { station: STATIONS, progress: 1 }
  let i = 0
  while (i < last - 1 && scrollY >= tops[i + 1]) i++
  const span = Math.max(1, tops[i + 1] - tops[i])
  const within = (scrollY - tops[i]) / span
  return { station: i + 1, progress: (i + within) / last }
}

const two = (n: number) => String(Math.min(STATIONS, Math.max(1, Math.round(n)))).padStart(2, '0')

/** The phone chip: "04 / 10". */
export function chip(station: number): string {
  return `${two(station)} / ${two(STATIONS)}`
}

/** The desktop readout: "Station 04 / 10 · Proof". */
export function readout(station: number, label?: string): string {
  const head = `Station ${chip(station)}`
  return label ? `${head} · ${label}` : head
}

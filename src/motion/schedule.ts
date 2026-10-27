/**
 * Motion setup runs in small tasks, one section at a time and in page order, so
 * building pins and timelines never blocks input in one long task. Sections are
 * created top-down, so a pin spacer only ever moves content below the ones built.
 */
interface Entry {
  job: () => void
  cancelled: boolean
}

const queue: Entry[] = []
const idle = new Set<() => void>()
let running = false
const BUDGET_MS = 12

function step() {
  const started = performance.now()
  while (queue.length) {
    const entry = queue.shift()!
    if (!entry.cancelled) entry.job()
    if (performance.now() - started > BUDGET_MS) break
  }
  if (queue.length) {
    setTimeout(step, 0)
    return
  }
  running = false
  for (const fn of [...idle]) {
    idle.delete(fn)
    fn()
  }
}

export function scheduleMotion(job: () => void): () => void {
  const entry = { job, cancelled: false }
  queue.push(entry)
  if (!running) {
    running = true
    setTimeout(step, 0)
  }
  return () => {
    entry.cancelled = true
  }
}

/** Run once every queued setup has finished (or on the next frame if none is pending). */
export function whenMotionIdle(fn: () => void): () => void {
  if (!running && queue.length === 0) {
    const id = requestAnimationFrame(fn)
    return () => cancelAnimationFrame(id)
  }
  idle.add(fn)
  return () => idle.delete(fn)
}

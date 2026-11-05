import type { NeedId } from '../content/types'

/**
 * The visitor's answer to "What do you need built?": one kind of work, everything, or nothing yet.
 * It lives in memory only (never stored, never sent unless the visitor sends the form).
 * The stage lights the layers it takes; the engine marks it; the form starts from it.
 */
export type PulseChoice = NeedId | 'all' | null

let choice: PulseChoice = null
let changedAt = 0
const listeners = new Set<(c: PulseChoice) => void>()

export function setPulse(next: PulseChoice) {
  choice = next
  changedAt = performance.now()
  listeners.forEach((fn) => fn(next))
}

export const getPulse = () => ({ choice, changedAt })

export function onPulse(fn: (c: PulseChoice) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

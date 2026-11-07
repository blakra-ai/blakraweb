/*
 * On phones the sections below the first screen start out of layout (`content-visibility: auto`, set
 * by the prerendered <style>, scripts/prerender.mjs): their style and layout were the longest tasks of
 * the first load. Once the app runs they are released one at a time, one small task each, so the
 * page soon has its real height and its final state. A jump (an anchor, the motion switch) needs real
 * positions at once: `releaseSectionsNow`.
 */
const sections = () => document.querySelectorAll<HTMLElement>('main > :not(:first-child):not(:last-child), footer')

let pending: HTMLElement[] | null = null

function nextTick(fn: () => void) {
  if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 300 })
  else window.setTimeout(fn, 60)
}

/** Releases the sections in page order, in idle time. Elsewhere than on phones they are already in. */
export function releaseSections() {
  if (pending || !window.matchMedia('(max-width: 767px)').matches) return
  pending = [...sections()]
  const step = () => {
    const el = pending?.shift()
    if (!el) return
    el.style.contentVisibility = 'visible'
    nextTick(step)
  }
  nextTick(step)
}

export function releaseSectionsNow() {
  if (typeof document === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return
  pending = []
  sections().forEach((el) => (el.style.contentVisibility = 'visible'))
}

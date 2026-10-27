/**
 * Long sections hold the screen with native `position: sticky` instead of scroll-jacking
 * pins: the page height never changes after load, the browser composites the scroll, and
 * nothing jumps when a pin starts or ends. This is the section's progress through its
 * held stretch: 0 when its top reaches the top of the viewport, 1 when its bottom reaches
 * the bottom.
 */
export function stickyProgress(section: HTMLElement): number {
  const r = section.getBoundingClientRect()
  const span = r.height - window.innerHeight
  return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
}

/** The scroll position at which a held section reaches progress p. */
export function stickyScrollTop(section: HTMLElement, p: number): number {
  const r = section.getBoundingClientRect()
  return r.top + window.scrollY + p * Math.max(0, r.height - window.innerHeight)
}

/**
 * A held section measured once (and again on resize), so reading its progress every frame
 * is arithmetic on the scroll position: no layout reads while the page scrolls.
 */
export function stickyTracker(section: HTMLElement) {
  let top = 0
  let span = 1
  const measure = () => {
    const r = section.getBoundingClientRect()
    top = r.top + window.scrollY
    span = Math.max(1, r.height - window.innerHeight)
  }
  measure()
  const at = (y: number) => Math.min(1, Math.max(0, (y - top) / span))
  return {
    measure,
    progress: () => at(window.scrollY),
    /** Progress at any scroll position (the camera follows a smoothed one). */
    at,
  }
}

import { lazy, Suspense, useEffect, useState } from 'react'
import { canRunWorld } from './capable'

const Experience = lazy(() => import('./Experience'))

/**
 * Loads the film's world after the page has loaded and gone idle, so it never competes with
 * the first paint, and only on devices with real graphics hardware. Others keep the page's own
 * still (the HTML wordmark and paper), with every word in place; that is decided as soon as the
 * page mounts, so the still is drawn with the first paint and never arrives late.
 */
export function FilmStage() {
  const [go, setGo] = useState(false)
  useEffect(() => {
    // ?film=off measures the page without its world.
    const off = new URLSearchParams(location.search).get('film') === 'off'
    if (off || !canRunWorld()) {
      document.documentElement.classList.add('gl-off')
      return
    }
    let idle = 0
    const start = () => {
      const run = () => setGo(true)
      idle = window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 1500 }) : window.setTimeout(run, 120)
    }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return () => {
      window.removeEventListener('load', start)
      window.cancelIdleCallback?.(idle)
    }
  }, [])
  return go ? (
    <Suspense fallback={null}>
      <Experience />
    </Suspense>
  ) : null
}

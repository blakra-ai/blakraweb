import { lazy, Suspense, useEffect, useState } from 'react'
import { canRunWorld } from '../experience/capable'
import { markWorldReady } from './ready'

const World = lazy(() => import('./World'))

/**
 * Mounts the Observatory's world after the page has loaded and gone idle (at once under the first
 * visit's brand loader, which covers the page), so it never competes
 * with the first paint, and only on devices with real graphics hardware (`canRunWorld`; `?gl=force`
 * runs it anyway, `?film=off` keeps the still). Under 768 px there is no three.js at all (the
 * storyboard's phone path: her still, the CSS ring). Others keep the prerendered still in every
 * window, decided at mount (`gl-off` on <html>).
 */
const PHONE = '(max-width: 767px)'
export function ObservatoryStage() {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const off = new URLSearchParams(location.search).get('film') === 'off'
    if (off || window.matchMedia(PHONE).matches || !canRunWorld()) {
      document.documentElement.classList.add('gl-off')
      markWorldReady()
      return
    }
    // Under the first visit's brand loader the page is covered: the world starts at once, so her GLB
    // and first frame land behind the loader instead of popping in (and stalling) just after it lifts.
    if (document.documentElement.classList.contains('loading')) {
      setGo(true)
      return
    }
    let idle = 0
    const start = () => {
      idle = window.requestIdleCallback ? window.requestIdleCallback(() => setGo(true), { timeout: 1200 }) : window.setTimeout(() => setGo(true), 100)
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
      <World />
    </Suspense>
  ) : null
}

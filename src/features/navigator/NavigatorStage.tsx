import { lazy, Suspense, useEffect, useState } from 'react'
import { canRunWorld } from '../experience/capable'

const World = lazy(() => import('./World'))

/**
 * Loads the Navigator's world after the page has loaded and gone idle, so it never competes
 * with the first paint, and only on devices with real graphics hardware. Others keep the page's
 * own still (the drawn helmet in the hero), decided at mount so it is there from the first paint.
 */
export function NavigatorStage() {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const off = new URLSearchParams(location.search).get('film') === 'off'
    if (off || !canRunWorld()) {
      document.documentElement.classList.add('gl-off')
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

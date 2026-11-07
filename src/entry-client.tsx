import { boot } from './boot'

// The brand loader counts from the first module run, before the app.
boot()

/*
 * On a phone the first paint comes first: the app's code would hold the main thread while the hero's
 * still and words are waiting to paint, and nothing on the first screen needs it (the links are
 * links). It starts once the page has loaded and painted, at the latest after CAP_MS.
 */
const PHONE = '(max-width: 767px)'
const CAP_MS = 2500

const start = () => void import('./hydrate')

if (!matchMedia(PHONE).matches) start()
else {
  let started = false
  const go = () => {
    if (started) return
    started = true
    start()
  }
  setTimeout(go, CAP_MS)
  const afterPaint = () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(go)))
  if (document.readyState === 'complete') afterPaint()
  else addEventListener('load', afterPaint, { once: true })
}

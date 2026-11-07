import { startTransition, StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { App } from './App'
import { loadDict, locales } from './i18n'
import { releaseSections, releaseSectionsNow } from './motion/lazySections'
import { resolveRoute } from './routes'

const root = document.getElementById('root')!
const route = resolveRoute(location.pathname)
// The page's language file is preloaded by the prerendered HTML, so this resolves at once.
const dict = await loadDict(route.locale)
const app = (
  <StrictMode>
    <App route={route} dict={dict} />
  </StrictMode>
)

// A linked section needs the real page under it before the first effects measure.
if (location.hash) releaseSectionsNow()

// Prerendered pages hydrate; the dev server serves an empty shell and renders fresh.
// GitHub Pages has one 404.html, in English, for every path: a miss under /de/ renders fresh in its language.
// In a transition React yields to the browser every few milliseconds, instead of one long task per station.
const lang = locales[route.locale].lang
if (root.firstElementChild && document.documentElement.lang === lang) startTransition(() => void hydrateRoot(root, app))
else {
  document.documentElement.lang = lang
  createRoot(root).render(app)
}
releaseSections()

import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { App } from './App'
import { boot } from './boot'
import { loadDict, locales } from './i18n'
import { resolveRoute } from './routes'

// The brand loader counts from the first module run, before the language file and hydration.
boot()

const root = document.getElementById('root')!
const route = resolveRoute(location.pathname)
// The page's language file is preloaded by the prerendered HTML, so this resolves at once.
const dict = await loadDict(route.locale)
const app = (
  <StrictMode>
    <App route={route} dict={dict} />
  </StrictMode>
)

// Prerendered pages hydrate; the dev server serves an empty shell and renders fresh.
// GitHub Pages has one 404.html, in English, for every path: a miss under /de/ renders fresh in its language.
const lang = locales[route.locale].lang
if (root.firstElementChild && document.documentElement.lang === lang) hydrateRoot(root, app)
else {
  document.documentElement.lang = lang
  createRoot(root).render(app)
}

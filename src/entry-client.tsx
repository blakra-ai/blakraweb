import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { App } from './App'
import { boot } from './boot'
import { loadDict } from './i18n'
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
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)

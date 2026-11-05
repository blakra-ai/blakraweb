import { renderToString } from 'react-dom/server'
import { StrictMode } from 'react'
import { App } from './App'
import type { Dict } from './content/types'
import { renderHead } from './head'
import { renderLlms } from './llms'
import { locales } from './i18n'
import { resolveRoute, routes } from './routes'

export { routes }
export { BASE, stripBase, withBase } from './base'

const dicts = import.meta.glob<{ [k: string]: Dict }>('./content/locales/*.ts', { eager: true })

export function render(path: string): { html: string; head: string; lang: string; locale: string } {
  const route = resolveRoute(path)
  const dict = dicts[`./content/locales/${route.locale}.ts`][route.locale]
  const html = renderToString(
    <StrictMode>
      <App route={route} dict={dict} />
    </StrictMode>,
  )
  return { html, head: renderHead(route, dict), lang: locales[route.locale].lang, locale: route.locale }
}

/** llms.txt (index) and llms-full.txt (full text), from the English dictionary. */
export function llms(full: boolean): string {
  return renderLlms(dicts['./content/locales/en.ts'].en, full)
}

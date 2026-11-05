import { availableLocales, localeFromPath, locales, type Locale } from './i18n'
import { workSlugs, type WorkSlug } from './content/work'

export type PageId = 'home' | 'about' | 'investors' | 'privacy' | 'legal' | 'work' | 'notFound'

export interface Route {
  id: PageId
  locale: Locale
  /** Public path, with trailing slash for pages. */
  path: string
  /** Output file inside dist/. */
  file: string
  indexable: boolean
  /** The project a `work` page shows. */
  slug?: WorkSlug
}

const pagePaths = { home: '/', about: '/about/', investors: '/investors/', privacy: '/privacy/', legal: '/legal/' } as const
type PageWithPath = keyof typeof pagePaths

export function pathFor(id: PageWithPath, locale: Locale, hash = ''): string {
  return `${locales[locale].prefix}${pagePaths[id]}${hash}`
}

/** A client-work project page: /work/<slug>/ under the locale's prefix. */
export function workPath(slug: WorkSlug, locale: Locale): string {
  return `${locales[locale].prefix}/work/${slug}/`
}

function build(locale: Locale): Route[] {
  const prefix = locales[locale].prefix
  const pages = (Object.keys(pagePaths) as PageWithPath[]).map((id) => {
    const path = pathFor(id, locale)
    return { id, locale, path, file: `${path.slice(1)}index.html`, indexable: true }
  })
  const work = workSlugs.map((slug) => {
    const path = workPath(slug, locale)
    return { id: 'work' as const, locale, path, file: `${path.slice(1)}index.html`, indexable: true, slug }
  })
  return [...pages, ...work, { id: 'notFound', locale, path: `${prefix}/404`, file: `${prefix.slice(1)}${prefix ? '/' : ''}404.html`, indexable: false }]
}

export const routes: readonly Route[] = availableLocales.flatMap(build)

export function resolveRoute(pathname: string): Route {
  const locale = localeFromPath(pathname)
  const rest = pathname.slice(locales[locale].prefix.length) || '/'
  const clean = rest.replace(/index\.html$/, '').replace(/\/?$/, '/')
  const match = routes.find((r) => r.locale === locale && r.id !== 'notFound' && r.path === `${locales[locale].prefix}${clean}`)
  return match ?? routes.find((r) => r.locale === locale && r.id === 'notFound')!
}

/** The same page in another language (used by the language switcher and hreflang). */
export function translatePath(route: Route, locale: Locale): string {
  if (route.id === 'work' && route.slug) return workPath(route.slug, locale)
  return route.id === 'notFound' || route.id === 'work' ? pathFor('home', locale) : pathFor(route.id, locale)
}

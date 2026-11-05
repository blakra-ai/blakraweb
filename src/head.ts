import { stripBase, withBase } from './base'
import { aiTools, company, products } from './content/shared'
import type { Dict } from './content/types'
import { shotUrl, work } from './content/work'
import { availableLocales, locales, type Locale } from './i18n'
import { breadcrumbs } from './crumbs'
import { translatePath, type Route } from './routes'

/** The public address of one of our paths: always blakra.us at the root, whatever the build's base. */
const abs = (path: string) => `${company.url}${stripBase(path)}`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function titleFor(route: Route, t: Dict) {
  const m = t.meta
  switch (route.id) {
    case 'home':
      return { title: m.homeTitle, description: m.homeDescription }
    case 'about':
      return { title: m.aboutTitle, description: m.aboutDescription }
    case 'investors':
      return { title: m.investorsTitle, description: m.investorsDescription }
    case 'privacy':
      return { title: m.privacyTitle, description: m.privacyDescription }
    case 'legal':
      return { title: m.legalTitle, description: m.legalDescription }
    case 'work': {
      const project = work.find((p) => p.slug === route.slug)!
      const w = t.work.projects[project.slug]
      return { title: `${project.name}: ${w.category} — ${t.work.metaSuffix}`, description: w.about }
    }
    default:
      return { title: m.notFoundTitle, description: m.homeDescription }
  }
}

/**
 * The social preview for a page (public/og/<locale>/<page>.jpg, made by `npm run og:pages` from the
 * built page): home, about, sponsors and every client-work project have their own; the rest use home's.
 */
export function ogImage(route: Route): string {
  const name = route.id === 'work' ? `work-${route.slug}` : route.id === 'about' || route.id === 'investors' ? route.id : 'home'
  return `/og/${route.locale}/${name}.jpg`
}

/**
 * Search-engine ownership tokens, set at build time by the owner (FACTS.md, "Search and AI");
 * nothing is emitted while they are unset, so no placeholder token ever ships.
 */
const verification = [
  ['google-site-verification', import.meta.env.VITE_GOOGLE_SITE_VERIFICATION],
  ['msvalidate.01', import.meta.env.VITE_BING_SITE_VERIFICATION],
] as const

/** Everything that goes into <head> for one route, as an HTML string for the prerenderer. */
export function renderHead(route: Route, t: Dict): string {
  const { title, description } = titleFor(route, t)
  const url = abs(translatePath(route, route.locale))
  const image = `${company.url}${ogImage(route)}`
  const imageAlt = route.id === 'home' ? t.meta.ogAlt : title
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    '<meta name="theme-color" content="#05060a">',
    '<meta name="color-scheme" content="dark light">',
    `<link rel="icon" href="${withBase('/favicon.ico')}" sizes="32x32">`,
    `<link rel="icon" href="${withBase('/favicon.svg')}" type="image/svg+xml">`,
    `<link rel="manifest" href="${withBase('/site.webmanifest')}">`,
    `<link rel="apple-touch-icon" href="${withBase('/apple-touch-icon.png')}">`,
    ...verification.filter(([, v]) => v).map(([name, v]) => `<meta name="${name}" content="${esc(String(v))}">`),
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${company.name}">`,
    `<meta property="og:locale" content="${locales[route.locale].og}">`,
    ...availableLocales.filter((l) => l !== route.locale).map((l) => `<meta property="og:locale:alternate" content="${locales[l].og}">`),
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${esc(imageAlt)}">`,
  ]
  if (route.indexable) {
    tags.push(`<link rel="canonical" href="${url}">`)
    for (const l of availableLocales) tags.push(`<link rel="alternate" hreflang="${locales[l].lang}" href="${abs(translatePath(route, l))}">`)
    tags.push(`<link rel="alternate" hreflang="x-default" href="${abs(translatePath(route, 'en'))}">`)
    tags.push(`<script type="application/ld+json">${JSON.stringify(structuredData(route, t)).replace(/</g, '\\u003c')}</script>`)
  } else {
    tags.push('<meta name="robots" content="noindex">')
  }
  return tags.join('\n    ')
}

// ---------------------------------------------------------------------------------------------
// Structured data: one @graph per page, its nodes joined by @id, so search and answer engines read
// one entity (BLAKRA) across every page and language. Only what the page itself or FACTS.md states:
// no ratings, reviews, prices or people beyond the page. Checked by tests/seo.test.ts.
// ---------------------------------------------------------------------------------------------

const site = company.url
export const ids = {
  organization: `${site}/#organization`,
  website: `${site}/#website`,
  logo: `${site}/#logo`,
  product: (id: string) => `${site}/#product-${id}`,
}

type Node = Record<string, unknown>

function organization(t: Dict): Node {
  return {
    '@type': 'Organization',
    '@id': ids.organization,
    name: company.name,
    legalName: company.legalName,
    url: `${site}/`,
    email: company.email,
    logo: { '@type': 'ImageObject', '@id': ids.logo, url: `${site}/icon-512.png`, contentUrl: `${site}/icon-512.png`, width: 512, height: 512, caption: company.name },
    image: { '@id': ids.logo },
    description: t.meta.homeDescription,
    slogan: t.meta.ogAlt.replace(/^BLAKRA:\s*/, ''),
    foundingDate: String(company.founded),
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      addressLocality: company.address.city,
      addressRegion: company.address.region,
      postalCode: company.address.postalCode,
      addressCountry: company.address.country,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: company.email,
      availableLanguage: availableLocales.map((l) => locales[l].label),
    },
    knowsAbout: [...Object.values(t.engine.layers).map((l) => l.name), ...Object.values(t.ai.blocks).map((b) => b.name), ...aiTools.open, ...aiTools.platforms],
    ...(company.social.length ? { sameAs: company.social.map((s) => s.href) } : {}),
  }
}

function website(): Node {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    url: `${site}/`,
    name: company.name,
    publisher: { '@id': ids.organization },
    inLanguage: availableLocales.map((l) => locales[l].lang),
  }
}

function product(t: Dict, locale: Locale): Node[] {
  return products
    .filter((p) => !p.draft)
    .map((p) => ({
      '@type': 'SoftwareApplication',
      '@id': ids.product(p.id),
      name: p.name,
      description: `${t.products.items[p.id].line} ${t.products.items[p.id].detail}`,
      operatingSystem: p.platforms.join(', '),
      ...(p.href ? { url: p.href } : {}),
      creator: { '@id': ids.organization },
      inLanguage: locales[locale].lang,
    }))
}

function pageType(route: Route): string | string[] {
  switch (route.id) {
    case 'about':
      return ['AboutPage', 'FAQPage']
    case 'work':
      return 'ItemPage'
    default:
      return 'WebPage'
  }
}

export function structuredData(route: Route, t: Dict): Node {
  const { title, description } = titleFor(route, t)
  const url = abs(translatePath(route, route.locale))
  const lang = locales[route.locale].lang
  const pageId = `${url}#webpage`
  const crumbs = breadcrumbs(route, t)
  const graph: Node[] = [organization(t), website()]
  const page: Node = {
    '@type': pageType(route),
    '@id': pageId,
    url,
    name: title,
    description,
    inLanguage: lang,
    isPartOf: { '@id': ids.website },
    primaryImageOfPage: { '@type': 'ImageObject', url: `${site}${ogImage(route)}`, width: 1200, height: 630 },
  }
  graph.push(page)

  if (crumbs.length > 1) {
    page.breadcrumb = { '@id': `${url}#breadcrumb` }
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
    })
  }

  switch (route.id) {
    case 'home':
      page.about = { '@id': ids.organization }
      graph.push(...product(t, route.locale))
      break
    case 'about':
      page.about = { '@id': ids.organization }
      // The same questions and answers the page shows, word for word.
      page.mainEntity = t.about.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
      break
    case 'investors': {
      const apps = product(t, route.locale)
      graph.push(...apps)
      if (apps.length) page.mainEntity = apps.map((a) => ({ '@id': a['@id'] }))
      break
    }
    case 'work': {
      const project = work.find((p) => p.slug === route.slug)!
      const w = t.work.projects[project.slug]
      const workId = `${url}#work`
      page.mainEntity = { '@id': workId }
      graph.push({
        '@type': 'CreativeWork',
        '@id': workId,
        name: project.name,
        headline: `${project.name}: ${w.category}`,
        description: w.about,
        abstract: w.line,
        genre: w.category,
        inLanguage: lang,
        url,
        image: project.shots.map((s, i) => ({ '@type': 'ImageObject', contentUrl: abs(shotUrl(project.slug, s.file)), width: s.width, height: s.height, caption: w.shots[i] })),
        creator: { '@id': ids.organization },
        mainEntityOfPage: { '@id': pageId },
      })
      break
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

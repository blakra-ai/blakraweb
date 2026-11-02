import { company, products } from './content/shared'
import type { Dict } from './content/types'
import { work } from './content/work'
import { availableLocales, locales } from './i18n'
import { translatePath, workPath, type Route } from './routes'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function titleFor(route: Route, t: Dict) {
  const m = t.meta
  switch (route.id) {
    case 'home':
      return { title: m.homeTitle, description: m.homeDescription }
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

/** Everything that goes into <head> for one route, as an HTML string for the prerenderer. */
export function renderHead(route: Route, t: Dict): string {
  const { title, description } = titleFor(route, t)
  const url = `${company.url}${translatePath(route, route.locale)}`
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    '<meta name="theme-color" content="#05060a">',
    '<meta name="color-scheme" content="dark light">',
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${company.name}">`,
    `<meta property="og:locale" content="${locales[route.locale].og}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${company.url}/og.png">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(t.meta.ogAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ]
  if (route.indexable) {
    tags.push(`<link rel="canonical" href="${url}">`)
    for (const l of availableLocales) tags.push(`<link rel="alternate" hreflang="${locales[l].lang}" href="${company.url}${translatePath(route, l)}">`)
    tags.push(`<link rel="alternate" hreflang="x-default" href="${company.url}${translatePath(route, 'en')}">`)
  } else {
    tags.push('<meta name="robots" content="noindex">')
  }
  if (route.id === 'home') tags.push(`<script type="application/ld+json">${JSON.stringify(organization(route, t)).replace(/</g, '\\u003c')}</script>`)
  return tags.join('\n    ')
}

function organization(route: Route, t: Dict) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    legalName: company.legalName,
    url: company.url,
    email: company.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      addressLocality: company.address.city,
      addressRegion: company.address.region,
      postalCode: company.address.postalCode,
      addressCountry: company.address.country,
    },
    foundingDate: String(company.founded),
    logo: `${company.url}/apple-touch-icon.png`,
    description: t.meta.homeDescription,
    inLanguage: locales[route.locale].lang,
    ...(company.social.length ? { sameAs: company.social.map((s) => s.href) } : {}),
    knowsAbout: Object.values(t.engine.layers).map((l) => l.name),
    subjectOf: work.map((p) => ({ '@type': 'CreativeWork', name: p.name, about: t.work.projects[p.slug].category, url: `${company.url}${workPath(p.slug, route.locale)}` })),
    // Products are listed once they are real (draft: false in shared.ts).
    makesOffer: products.filter((p) => !p.draft).map((p) => ({ '@type': 'Offer', itemOffered: { '@type': 'SoftwareApplication', name: p.name } })),
  }
}

// Static generation: render every route with the SSR bundle into dist/<route>,
// using the client build's index.html (with hashed asset tags) as the template.
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const template = await readFile(join(dist, 'index.html'), 'utf8')
const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8'))
const { render, routes } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)

// Preload the fonts that paint the first screen: Geist (swap, with a metric fallback), Newsreader and Geist Mono (optional).
const assets = await readdir(join(dist, 'assets'))
const geist = assets.find((f) => f.startsWith('geist-latin-wght-normal') && f.endsWith('.woff2'))
if (!geist) throw new Error('prerender: Geist font asset not found in dist/assets')
// The headline's italic ("gravity") is Newsreader: preloaded too, so the H1 never repaints late.
const newsreader = assets.find((f) => f.startsWith('newsreader-latin-wght-italic') && f.endsWith('.woff2'))
const mono = assets.find((f) => f.startsWith('geist-mono-latin-wght-normal') && f.endsWith('.woff2'))
const fontPreload = [geist, newsreader, mono].filter(Boolean).map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`)
// The hero's phone still is the first screen's largest paint on phones: it starts with the HTML.
const phoneStill = assets.find((f) => f.startsWith('hero-still-phone') && /\.(jpg|webp)$/.test(f))
const stillPreload = phoneStill ? [`<link rel="preload" href="/assets/${phoneStill}" as="image" media="(max-width: 767px)" fetchpriority="high">`] : []
const preload = [...fontPreload, ...stillPreload].join('\n    ')

for (const route of routes) {
  const { html, head, lang, locale } = render(route.path)
  // Preload this page's language chunk so hydration never waits on a second round trip.
  const dict = manifest[`src/content/locales/${locale}.ts`]?.file
  const dictPreload = dict ? `\n    <link rel="modulepreload" href="/${dict}">` : ''
  const page = template
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace('<!--head-->', `${head}\n    ${preload}${dictPreload}`)
    .replace('<!--app-->', html)
  const out = join(dist, route.file)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, page)
  console.log(`prerendered ${route.path} -> dist/${route.file} (${(page.length / 1024).toFixed(1)} kB)`)
}

// Sitemap with every language version of each page linked as alternates.
const site = 'https://blakra.us'
const pages = routes.filter((r) => r.indexable)
// One page = one id (and, for client work, one project slug) across its languages.
const pageKey = (r) => `${r.id}:${r.slug ?? ''}`
const byPage = Map.groupBy(pages, pageKey)
const today = new Date().toISOString().slice(0, 10)
const urls = pages.map((r) => {
  const group = byPage.get(pageKey(r))
  // Each language, then x-default (the English page), the same set the <head> lists.
  const xDefault = group.find((a) => a.locale === 'en') ?? group[0]
  const alternates = [...group.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.locale}" href="${site}${a.path}"/>`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${site}${xDefault.path}"/>`].join('\n')
  return `  <url>\n    <loc>${site}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`
})
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`)
console.log(`sitemap: ${pages.length} urls`)

await rm(ssrDir, { recursive: true, force: true })
// The manifest was only for this script; it is not part of the site.
await rm(join(dist, '.vite'), { recursive: true, force: true })

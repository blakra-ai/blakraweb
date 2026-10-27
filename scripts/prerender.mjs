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

// Preload the fonts that paint the LCP text; the mono swaps in later.
const assets = await readdir(join(dist, 'assets'))
const geist = assets.find((f) => f.startsWith('geist-latin-wght-normal') && f.endsWith('.woff2'))
if (!geist) throw new Error('prerender: Geist font asset not found in dist/assets')
// The headline's italic ("gravity") is Newsreader: preloaded too, so the H1 never repaints late.
const newsreader = assets.find((f) => f.startsWith('newsreader-latin-wght-italic') && f.endsWith('.woff2'))
const preload = [geist, newsreader].filter(Boolean).map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`).join('\n    ')

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
const byPage = Map.groupBy ? Map.groupBy(pages, (r) => r.id) : new Map([...new Set(pages.map((r) => r.id))].map((id) => [id, pages.filter((r) => r.id === id)]))
const today = new Date().toISOString().slice(0, 10)
const urls = pages.map((r) => {
  const alternates = byPage.get(r.id).map((a) => `    <xhtml:link rel="alternate" hreflang="${a.locale}" href="${site}${a.path}"/>`).join('\n')
  return `  <url>\n    <loc>${site}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`
})
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`)
console.log(`sitemap: ${pages.length} urls`)

await rm(ssrDir, { recursive: true, force: true })

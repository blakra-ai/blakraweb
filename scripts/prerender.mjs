// Static generation: render every route with the SSR bundle into dist/<route>,
// using the client build's index.html (with hashed asset tags) as the template.
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { criticalCss, firstScreenClasses } from './critical-css.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const template = await readFile(join(dist, 'index.html'), 'utf8')
const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8'))
const { render, routes, llms, BASE, stripBase, withBase } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)

// Preload the fonts that paint the first screen: Geist (swap, with a metric fallback), Newsreader and Geist Mono (optional).
const assets = await readdir(join(dist, 'assets'))
const geist = assets.find((f) => f.startsWith('geist-latin-wght-normal') && f.endsWith('.woff2'))
if (!geist) throw new Error('prerender: Geist font asset not found in dist/assets')
// The headline's italic ("gravity") is Newsreader: preloaded too, so the H1 never repaints late.
const newsreader = assets.find((f) => f.startsWith('newsreader-latin-wght-italic') && f.endsWith('.woff2'))
const mono = assets.find((f) => f.startsWith('geist-mono-latin-wght-normal') && f.endsWith('.woff2'))
const fontPreload = [geist, newsreader, mono].filter(Boolean).map((f) => `<link rel="preload" href="${BASE}assets/${f}" as="font" type="font/woff2" crossorigin>`)
// The hero's phone still is the first screen's largest paint on phones: it starts with the HTML.
const phoneStill = assets.find((f) => f.startsWith('hero-still-phone') && /\.(jpg|webp)$/.test(f))
const stillPreload = phoneStill ? [`<link rel="preload" href="${BASE}assets/${phoneStill}" as="image" media="(max-width: 767px)" fetchpriority="high">`] : []
// The desktop still too: the brand loader waits on it, and it is the first screen until the world runs.
const deskStill = assets.find((f) => /^hero-still-[\w-]+\.jpg$/.test(f) && !f.startsWith('hero-still-phone'))
if (deskStill) stillPreload.push(`<link rel="preload" href="${BASE}assets/${deskStill}" as="image" media="(min-width: 768px)" fetchpriority="high">`)
// The hero's still first: it is the phone's LCP; the fonts follow in the order the first screen needs them.
const preload = [...stillPreload, ...fontPreload].join('\n    ')

// The app is not needed for the first paint (phones start it after it, src/entry-client.tsx), so its code is fetched at low priority behind the still and the fonts.
const appChunks = (key, seen = new Set()) => {
  const entry = manifest[key]
  if (!entry || seen.has(key)) return seen
  seen.add(key)
  for (const dep of entry.imports ?? []) appChunks(dep, seen)
  return seen
}
const entryKey = 'src/entry-client.tsx'
const inEntry = appChunks(entryKey)
const modulePreloads = (keys) => [...keys].filter((k) => !inEntry.has(k)).map((k) => `<link rel="modulepreload" fetchpriority="low" href="${BASE}${manifest[k].file}">`)
const appPreload = modulePreloads(appChunks('src/hydrate.tsx'))

// The stylesheet leaves <head>: the first screen's rules go inline (scripts/critical-css.mjs) and the
// whole sheet loads at the end of <body>, where it blocks no paint of what came before it. The content below
// the first screen waits for it (hiddenUntilSheet, so it is never laid out unstyled), and on phones it stays
// out of the first layouts until it is near the screen or the app releases it (src/motion/lazySections.ts).
const cssFile = assets.find((f) => f.endsWith('.css'))
if (!cssFile) throw new Error('prerender: stylesheet not found in dist/assets')
const fullCss = await readFile(join(dist, 'assets', cssFile), 'utf8')
const sheetTag = template.match(/<link rel="stylesheet"[^>]*>/)?.[0]
if (!sheetTag) throw new Error('prerender: stylesheet link not found in the template')
const belowFold = 'main>:not(:first-child):not(:last-child),footer'
const hiddenUntilSheet = `${belowFold}{content-visibility:hidden}`
const afterSheet = `<style>${belowFold}{content-visibility:visible}@media (max-width:767px){${belowFold}{content-visibility:auto;contain-intrinsic-size:auto 900px}}</style>`
const criticalCache = new Map()

const images = new Map()
for (const route of routes) {
  const { html, head, lang, locale } = render(route.path)
  // Preload this page's language chunk so hydration never waits on a second round trip.
  const dict = manifest[`src/content/locales/${locale}.ts`]?.file
  const dictPreload = dict ? [`<link rel="modulepreload" fetchpriority="low" href="${BASE}${dict}">`] : []
  // The first screen's rules, per set of classes on it (the four languages of a page share one).
  const classes = firstScreenClasses(html)
  const key = [...classes].sort().join(' ')
  if (!criticalCache.has(key)) criticalCache.set(key, criticalCss(fullCss, classes))
  const page = template
    .replace(sheetTag, '')
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace('<!--head-->', [head, preload, ...appPreload, ...dictPreload, `<style>${criticalCache.get(key)}${hiddenUntilSheet}</style>`].join('\n    '))
    .replace('<div id="root"><!--app--></div>', `<div id="root">${html}</div>\n    ${sheetTag}${afterSheet}`)
  // The page's content images (described ones only, decorative alt="" skipped) for the image sitemap.
  images.set(route.path, [...html.matchAll(/<img src="([^"]*\/assets\/[^"]+)"[^>]*alt="([^"]+)"/g)].map((m) => stripBase(m[1])))
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
// lastmod is the date the page's content last changed in git (its language file, the shared facts and,
// for client work, the project's screens), not the build date: Google trusts lastmod only when it is accurate.
const today = new Date().toISOString().slice(0, 10)
const lastmodCache = new Map()
function lastmod(r) {
  const files = [`src/content/locales/${r.locale}.ts`, 'src/content/shared.ts', 'src/content/work.ts', ...(r.slug ? [`src/assets/work/${r.slug}`] : [])]
  const key = files.join(' ')
  if (!lastmodCache.has(key)) {
    let date = ''
    try {
      date = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: root, encoding: 'utf8' }).trim()
    } catch {}
    lastmodCache.set(key, date || today)
  }
  return lastmodCache.get(key)
}
// The social preview each page uses (public/og, scripts/og-pages.mjs), listed with its images.
const ogFor = (r) => {
  const name = r.id === 'work' ? `work-${r.slug}` : ['home', 'about', 'investors'].includes(r.id) ? r.id : 'home'
  return `/og/${r.locale}/${name}.jpg`
}
const urls = pages.map((r) => {
  const group = byPage.get(pageKey(r))
  // Each language, then x-default (the English page), the same set the <head> lists.
  const xDefault = group.find((a) => a.locale === 'en') ?? group[0]
  const alternates = [...group.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.locale}" href="${site}${a.path}"/>`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${site}${xDefault.path}"/>`].join('\n')
  const imgs = [...new Set([...(images.get(r.path) ?? []), ogFor(r)])].map((src) => `    <image:image><image:loc>${site}${src}</image:loc></image:image>`).join('\n')
  return `  <url>\n    <loc>${site}${r.path}</loc>\n    <lastmod>${lastmod(r)}</lastmod>\n${alternates}\n${imgs}\n  </url>`
})
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`)
console.log(`sitemap: ${pages.length} urls`)

// llms.txt (an index for language models, llmstxt.org) and llms-full.txt (the site's English text in
// one file), both written from the same dictionary the pages render, so they never say more than the site.
if (llms) {
  await writeFile(join(dist, 'llms.txt'), llms(false))
  await writeFile(join(dist, 'llms-full.txt'), llms(true))
  console.log('llms.txt, llms-full.txt')
}

// The web app manifest is a plain file from public/: under a sub-path its own URLs move with the site.
if (BASE !== '/') {
  const webmanifest = JSON.parse(await readFile(join(dist, 'site.webmanifest'), 'utf8'))
  webmanifest.start_url = webmanifest.scope = BASE
  for (const icon of webmanifest.icons) icon.src = withBase(icon.src)
  await writeFile(join(dist, 'site.webmanifest'), `${JSON.stringify(webmanifest, null, 2)}\n`)
}

await rm(ssrDir, { recursive: true, force: true })
// The manifest was only for this script; it is not part of the site.
await rm(join(dist, '.vite'), { recursive: true, force: true })

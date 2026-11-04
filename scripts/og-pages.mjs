// Renders one social preview per page and language (public/og/<locale>/<page>.jpg, 1200×630,
// JPEG ≤ 150 KB) from the BUILT pages, so every card says exactly what its page says.
// Usage: npm run build && npm run og:pages   (CHROME=/path/to/chrome to override the browser)
// Pages: home, about, investors and every client-work project; privacy and legal reuse home.
// head.ts points og:image at these files (ogImage); re-run after changing a page's headline.
import { chromium } from 'playwright-core'
import { readFileSync, readdirSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const locales = ['en', 'de', 'fr', 'es']
const prefix = (l) => (l === 'en' ? '' : `/${l}`)

const font = (f) => `data:font/woff2;base64,${readFileSync(join(root, 'src/assets/fonts', f)).toString('base64')}`
const dataUrl = (file, type) => `data:${type};base64,${readFileSync(file).toString('base64')}`
const hero = dataUrl(join(root, 'src/assets/observatory/hero-still.jpg'), 'image/jpeg')
const ink = '#0b0b10'
const paper = '#f2f0eb'
// The official logo (src/assets/brand): the symbol and the BLAKRA lettering, in ink.
const brandSvg = (f, h) => readFileSync(join(root, 'src/assets/brand', f), 'utf8').replace('<svg ', `<svg height="${h}" style="color:${ink}" `)
const logo = `${brandSvg('mark.svg', 34)}${brandSvg('wordmark.svg', 12)}`

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const pick = (html, re) => {
  const m = html.match(re)
  return m ? decode(m[1]) : ''
}
// One sentence, at most ~150 characters, so the lede never runs off the card.
const short = (s) => {
  const first = s.split(/(?<=[.!?])\s/)[0]
  return first.length > 150 ? `${first.slice(0, 147).replace(/\s\S*$/, '')}…` : first
}

const css = `
@font-face { font-family: Geist; src: url(${font('geist-latin-wght-normal.woff2')}); font-weight: 100 900; }
@font-face { font-family: GeistMono; src: url(${font('geist-mono-latin-wght-normal.woff2')}); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; color: ${ink}; font-family: Geist; background: ${paper}; position: relative; }
body.hero { background: linear-gradient(90deg, ${ink} 57%, rgba(11,11,16,.6) 66%, rgba(11,11,16,0) 80%), url(${hero}) right 0 top 0 / auto 700px no-repeat, ${ink}; color: ${paper}; }
body.hero p { color: #b9b6ae; }
body.hero .foot { color: #8d8a83; }
body.hero .brand svg { color: ${paper} !important; }
.brand { position: absolute; top: 52px; left: 72px; display: flex; gap: 16px; align-items: center; }
.text { position: absolute; left: 72px; top: 150px; width: 620px; }
.wide .text { width: 1000px; }
.eyebrow { font-family: GeistMono; font-size: 20px; letter-spacing: .08em; text-transform: uppercase; color: #ff5a1f; margin-bottom: 22px; }
h1 { font-weight: 600; font-size: 64px; line-height: 1.02; letter-spacing: -.04em; }
p { margin-top: 24px; font-size: 26px; line-height: 1.32; color: #33363d; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 52px; display: flex; justify-content: space-between; font-family: GeistMono; font-size: 20px; color: #494d56; }
.shot { position: absolute; right: 56px; top: 56px; bottom: 56px; width: 400px; display: grid; place-items: center; }
.shot img { max-width: 100%; max-height: 100%; border-radius: 14px; box-shadow: 0 18px 50px rgba(11,11,16,.28); background: ${ink}; }
.shot.phone img { max-height: 518px; border-radius: 28px; border: 8px solid ${ink}; }
`

function card({ eyebrow, title, lede, url, shot, kind }) {
  const img = shot ? `<div class="shot ${shot.phone ? 'phone' : ''}"><img src="${shot.src}"></div>` : ''
  return `<style>${css}</style><body class="${kind}"><div class="brand">${logo}</div>
<div class="text">${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}<h1>${esc(title)}</h1>${lede ? `<p>${esc(lede)}</p>` : ''}</div>
${img}<div class="foot"><span>${esc(url)}</span><span></span></div></body>`
}

const workSlugs = readdirSync(join(dist, 'work')).filter((d) => statSync(join(dist, 'work', d)).isDirectory())
const jobs = []
for (const l of locales) {
  const pages = [
    ['home', '/'],
    ['about', '/about/'],
    ['investors', '/investors/'],
    ...workSlugs.map((s) => [`work-${s}`, `/work/${s}/`]),
  ]
  for (const [key, path] of pages) {
    const html = readFileSync(join(dist, `${prefix(l)}${path}`.slice(1), 'index.html'), 'utf8')
    const title = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/)
    const eyebrow = pick(html, /class="eyebrow mono"[^>]*>([\s\S]*?)<\/p>/)
    const lede = short(pick(html, /<meta name="description" content="([^"]*)"/))
    let shot = null
    if (key.startsWith('work-')) {
      const src = html.match(/<main[\s\S]*?<img src="(\/assets\/[^"]+)"/)?.[1]
      if (src) shot = { src: dataUrl(join(dist, src), 'image/webp'), phone: /phone/.test(src) }
    }
    const kind = key === 'home' ? 'hero' : shot ? '' : 'wide'
    jobs.push({ out: join(root, 'public/og', l, `${key}.jpg`), html: card({ eyebrow: key === 'home' ? '' : eyebrow, title, lede: key === 'home' ? '' : lede, url: `blakra.us${prefix(l)}${path}`, shot, kind }) })
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const { out, html } of jobs) {
  mkdirSync(dirname(out), { recursive: true })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  let quality = 82
  let size = Infinity
  while (size > 150 * 1024 && quality >= 50) {
    await page.screenshot({ path: out, type: 'jpeg', quality })
    size = statSync(out).size
    quality -= 8
  }
  console.log(`wrote ${out.slice(root.length + 1)} (${(size / 1024).toFixed(0)} kB)`)
}
await browser.close()

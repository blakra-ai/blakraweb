// Renders the social preview (public/og.png, 1200×630) with the site's own fonts, via system Chrome.
// The icons (favicon, touch icon, manifest icons) come from scripts/icons.mjs.
// Usage: npm run og   (CHROME=/path/to/chrome to override the browser)
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// Inline the fonts: a page made with setContent cannot read file:// URLs.
const font = (f) => `data:font/woff2;base64,${readFileSync(join(root, 'src/assets/fonts', f)).toString('base64')}`
// The background is the film's last frame, the whole system running (scripts/og-frame.mjs, real GPU).
const hero = `data:image/jpeg;base64,${readFileSync(join(root, 'src/assets/observatory/hero-still.jpg')).toString('base64')}`
const ink = '#0b0b10'
const paper = '#f2f0eb'
// The official logo (src/assets/brand): the symbol and the BLAKRA lettering, in ink.
const brandSvg = (f, h) => readFileSync(join(root, 'src/assets/brand', f), 'utf8').replace('<svg ', `<svg height="${h}" style="color:${ink}" `)
const logo = `${brandSvg('mark.svg', 34)}${brandSvg('wordmark.svg', 12)}`

const css = `
@font-face { font-family: Geist; src: url(${font('geist-latin-wght-normal.woff2')}); font-weight: 100 900; }
@font-face { font-family: Newsreader; src: url(${font('newsreader-latin-wght-italic.woff2')}); font-style: italic; font-weight: 200 800; }
@font-face { font-family: GeistMono; src: url(${font('geist-mono-latin-wght-normal.woff2')}); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
/* The system right of the words, as on the end card: the frame a little smaller and moved right, so the orbit clears them. */
body { width: 1200px; height: 630px; overflow: hidden; color: ${paper}; font-family: Geist;
  background: linear-gradient(90deg, ${ink} 57%, rgba(11,11,16,.6) 66%, rgba(11,11,16,0) 80%), url(${hero}) right 0 top 0 / auto 700px no-repeat, ${ink}; }
.brand svg { color: ${paper} !important; }
.brand { position: absolute; top: 60px; left: 72px; display: flex; gap: 16px; align-items: center; }
h1 { position: absolute; left: 72px; bottom: 150px; font-weight: 600; font-size: 88px; line-height: .96; letter-spacing: -.045em; }
em { font-family: Newsreader; font-weight: 400; letter-spacing: -.02em; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 64px; display: flex; justify-content: space-between; font-family: GeistMono; font-size: 22px; color: #8d8a83; }
`
const og = `<style>${css}</style><div class="brand">${logo}</div>
<h1>Software with<br><em>gravity</em>.</h1>
<div class="foot"><span>Product engineering and AI, end to end · blakra.us</span><span></span></div>`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
for (const [html, size, out] of [[og, { width: 1200, height: 630 }, 'og.png']]) {
  const page = await browser.newPage({ viewport: size })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(root, 'public', out) })
  console.log(`wrote public/${out}`)
}
await browser.close()

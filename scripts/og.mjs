// Renders the social preview (public/og.png, 1200×630) and the touch icon
// (public/apple-touch-icon.png, 180×180) with the site's own fonts, via system Chrome.
// Usage: npm run og   (CHROME=/path/to/chrome to override the browser)
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// Inline the fonts: a page made with setContent cannot read file:// URLs.
const font = (f) => `data:font/woff2;base64,${readFileSync(join(root, 'src/assets/fonts', f)).toString('base64')}`
// The background is the site's own hero, rendered by the 3D world on a real GPU.
const hero = `data:image/jpeg;base64,${readFileSync(join(root, 'src/assets/og-hero.jpg')).toString('base64')}`
// The mark: a black hole, its disk passing in front of the shadow (same as the header).
const markSvg = (w, h, ink = '#eeece6') =>
  `<svg width="${w}" height="${h}" viewBox="0 0 24 16"><path d="M2.2 9.2C4.6 4.2 19.4 4.2 21.8 9.2" fill="none" stroke="${ink}" stroke-width="1.1" stroke-opacity="0.55"/><circle cx="12" cy="8" r="4.3" fill="${ink}"/><circle cx="12" cy="8" r="2.9" fill="#050507"/><path d="M1 9.6C4 12.6 20 12.6 23 9.6" fill="none" stroke="#ff6a2b" stroke-width="1.5" stroke-linecap="round"/></svg>`

const css = `
@font-face { font-family: Geist; src: url(${font('geist-latin-wght-normal.woff2')}); font-weight: 100 900; }
@font-face { font-family: Newsreader; src: url(${font('newsreader-latin-wght-italic.woff2')}); font-style: italic; font-weight: 200 800; }
@font-face { font-family: GeistMono; src: url(${font('geist-mono-latin-wght-normal.woff2')}); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; color: #eeece6; font-family: Geist;
  background: linear-gradient(90deg, rgba(5,5,7,.92) 0%, rgba(5,5,7,.55) 45%, transparent 70%), url(${hero}) center / cover, #050507; }
.brand { position: absolute; top: 64px; left: 72px; display: flex; gap: 14px; align-items: center; font-weight: 600; letter-spacing: .22em; font-size: 22px; }
h1 { position: absolute; left: 72px; bottom: 150px; font-weight: 500; font-size: 92px; line-height: .96; letter-spacing: -.045em; }
em { font-family: Newsreader; font-weight: 400; letter-spacing: -.02em; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 64px; display: flex; justify-content: space-between; font-family: GeistMono; font-size: 22px; color: #aeb1b8; }
`
const og = `<style>${css}</style><div class="brand">${markSvg(36, 24)}BLAKRA</div>
<h1>Software with<br><em>gravity</em>.</h1>
<div class="foot"><span>Product engineering and AI, end to end</span><span>blakra.us</span></div>`
const icon = `<style>* { margin: 0 } body { width: 180px; height: 180px; background: #05060a; display: grid; place-items: center; }</style>${markSvg(132, 88)}`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
for (const [html, size, out] of [[og, { width: 1200, height: 630 }, 'og.png'], [icon, { width: 180, height: 180 }, 'apple-touch-icon.png']]) {
  const page = await browser.newPage({ viewport: size })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(root, 'public', out) })
  console.log(`wrote public/${out}`)
}
await browser.close()

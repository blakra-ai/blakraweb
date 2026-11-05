// usage: node shoot.mjs <tag> [widths...]   needs `npx vite preview --port 4175` running
import { chromium } from 'playwright-core'
const [tag = 'x', ...ws] = process.argv.slice(2)
const widths = ws.length ? ws.map(Number) : [1440]
const out = new URL('../', import.meta.url).pathname
const BASE = process.env.BASE ?? 'http://localhost:4175'
const path = process.env.P ?? '/'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const w of widths) {
  const mobile = w < 768
  const ctx = await b.newContext({ viewport: { width: w, height: mobile ? (w === 360 ? 800 : 844) : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  // walk the page so observers fire
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 400) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(60) }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800)
  if (!mobile) await page.screenshot({ path: `${out}${tag}-${w}.png`, fullPage: true })
  else {
    // Phones: stitch viewport tiles (a fullPage capture resizes the viewport and repeats svh sections).
    const vh = page.viewportSize().height
    let H = await page.evaluate(() => document.documentElement.scrollHeight)
    const tiles = []
    for (let y = 0, i = 0; y < H; y += vh, i++) {
      await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(350)
      const f = `/tmp/tile-${tag}-${w}-${i}.png`
      const real = await page.evaluate(() => scrollY); H = await page.evaluate(() => document.documentElement.scrollHeight); if (process.env.DBG) console.log(y, real, H)
      await page.screenshot({ path: f, clip: { x: 0, y: y - real, width: w, height: Math.max(1, Math.min(vh - (y - real), H - y) - 1) } })
      tiles.push(f)
      if (y + vh >= H) break
    }
    const { execFileSync } = await import('node:child_process')
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...tiles.flatMap((t) => ['-i', t]), '-filter_complex', `${tiles.map((_, i) => `[${i}:v]`).join('')}vstack=inputs=${tiles.length}`, `${out}${tag}-${w}.png`])
  }
  if (process.env.SECTIONS && mobile) {
    const ids = await page.evaluate(() => [...document.querySelectorAll('main [data-station]')].map((e, i) => { e.dataset.shot = i; return i }))
    for (const i of ids) {
      const el = page.locator(`[data-shot="${i}"]`)
      await el.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 0))
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${out}section-${String(i + 1).padStart(2, '0')}-${w}.png` })
    }
  }
  console.log(tag, w, h)
  await ctx.close()
}
await b.close()

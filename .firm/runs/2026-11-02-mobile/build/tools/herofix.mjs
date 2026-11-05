import { chromium } from 'playwright-core'
const out = new URL('../', import.meta.url).pathname
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
for (const [w, h] of [[390, 844], [360, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  await p.goto('http://localhost:4175/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
  await p.screenshot({ path: `${out}hero-fix-hero-${w}.png` })
  await p.evaluate(() => document.querySelector('#contact').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(800)
  await p.screenshot({ path: `${out}hero-fix-contact-${w}.png` })
  await ctx.close()
}
await b.close()

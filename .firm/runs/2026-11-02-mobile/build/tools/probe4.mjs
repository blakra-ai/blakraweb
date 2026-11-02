import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto('http://localhost:4175/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
for (const id of ['#products', '#stage', '#ai', '#approach', '#people', '#work', '#contact']) {
  await page.evaluate((id) => document.querySelector(id).scrollIntoView({ behavior: 'instant' }), id)
  await page.waitForTimeout(500)
  console.log(id, await page.evaluate((id) => [scrollY, Math.round(document.querySelector(id).getBoundingClientRect().top), document.querySelector('header [aria-live]').textContent], id))
}
await b.close()

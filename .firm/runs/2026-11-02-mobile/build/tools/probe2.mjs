import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto('http://localhost:4175/', { waitUntil: 'networkidle' })
console.log(await page.evaluate(() => {
  const out = []
  const els = [...document.body.querySelectorAll('body > *, main > *, main > * > *, header > *')]
  for (const e of els) { const d = e.style.display; e.style.display = 'none'; out.push(`${e.tagName}.${String(e.className).slice(0,30)} ${document.documentElement.scrollWidth}`); e.style.display = d }
  return out.join('\n')
}))
await b.close()

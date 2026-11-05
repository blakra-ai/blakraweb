import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto('http://localhost:4175' + (process.argv[2] ?? '/'), { waitUntil: 'networkidle' })
console.log(await page.evaluate((sel) => {
  const s = document.querySelector(sel)
  return [s, ...s.querySelectorAll('*')].map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${e.tagName}.${String(e.className).slice(0, 30)} L${Math.round(r.left)} R${Math.round(r.right)} sw${e.scrollWidth} ov${cs.overflowX}` }).filter((x) => /R(\d+)/.exec(x)[1] > 395 || /sw(\d+)/.exec(x)[1] > 395).slice(0, 25).join('\n')
}, process.argv[3] ?? '#ai'))
await b.close()

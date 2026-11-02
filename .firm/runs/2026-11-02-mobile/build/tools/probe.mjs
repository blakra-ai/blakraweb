import { chromium } from 'playwright-core'
const w = Number(process.argv[2] ?? 390), path = process.argv[3] ?? '/'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto('http://localhost:4175' + path, { waitUntil: 'networkidle' })
console.log(await page.evaluate(() => {
  const W = document.documentElement.clientWidth
  const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('header, .m-swipe') }).slice(0, 12).map((e) => `${e.tagName}.${(e.className?.baseVal ?? e.className)}`.slice(0, 80) + ' ' + Math.round(e.getBoundingClientRect().right))
  const sw2 = [...document.querySelectorAll('.m-swipe')].map((u) => { let e = u, out = []; while (e && e !== document.body) { out.push(e.tagName + '.' + String(e.className).slice(0, 25) + ':' + Math.round(e.getBoundingClientRect().width)); e = e.parentElement } return out.join(' < ') }); return { sw2, inner: innerWidth, sw: document.documentElement.scrollWidth, ih: innerHeight, wide }
}))
await b.close()

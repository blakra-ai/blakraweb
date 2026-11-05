// axe, overflow, gaps and section heights at phone widths. Needs preview on 4175.
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const axe = readFileSync('/home/ashen/.npm/_npx/0f94ee7615faf582/node_modules/axe-core/axe.min.js', 'utf8')
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const paths = (process.env.PATHS ?? '/,/de/,/about/,/de/about/,/work/vitrin-app/,/de/work/helya-ai/').split(',')
let bad = 0
for (const w of [390, 360]) for (const path of paths) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 360 ? 800 : 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await page.goto('http://localhost:4175' + path, { waitUntil: 'networkidle' })
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < H; y += 500) { await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(40) }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.addScriptTag({ content: axe })
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { resultTypes: ['violations'] })
    const v = r.violations.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
    const over = document.documentElement.scrollWidth - innerWidth
    // vertical gaps: union of visible text/media boxes in main, largest empty band
    const boxes = [...document.querySelectorAll('main *')].filter((e) => {
      const st = getComputedStyle(e); const painted = st.backgroundColor !== 'rgba(0, 0, 0, 0)' && e.tagName !== 'SECTION' && e.tagName !== 'MAIN'
      if (!painted && e.children.length && !['IMG', 'svg', 'BUTTON', 'A', 'INPUT', 'TEXTAREA', 'P', 'H1', 'H2', 'H3', 'LI'].includes(e.tagName)) return false
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e)
      return r.height > 0 && r.width > 0 && cs.visibility !== 'hidden' && r.right > 0 && r.left < innerWidth && !e.closest('[aria-hidden="true"]:not(svg)')
    }).map((e) => { const r = e.getBoundingClientRect(); return [r.top + scrollY, r.bottom + scrollY] }).sort((a, b) => a[0] - b[0])
    let end = boxes[0]?.[1] ?? 0, gap = 0, at = 0
    for (const [t, bt] of boxes) { if (t - end > gap) { gap = t - end; at = end } end = Math.max(end, bt) }
    const secs = [...document.querySelectorAll('main [data-station]')].map((e) => `${e.dataset.station}:${(e.getBoundingClientRect().height / innerHeight).toFixed(2)}`)
    return { v, over, gap: Math.round(gap), at: Math.round(at), secs: secs.join(' ') }
  })
  const ok = res.v.length === 0 && res.over <= 0 && res.gap <= 150
  if (!ok) bad++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${w} ${path} axe=${res.v.length} over=${res.over} maxGap=${res.gap}@${res.at}${path.endsWith('/') && !path.includes('work') && !path.includes('about') ? ' screens ' + res.secs : ''}`)
  res.v.forEach((x) => console.log('   ', x))
  await ctx.close()
}
await b.close()
process.exit(bad ? 1 : 0)

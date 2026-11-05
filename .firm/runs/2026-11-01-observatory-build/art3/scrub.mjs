// Fine motion review: scrub the page in 0.05-screen steps, both directions, and log the figure's
// screen anchor (eyes x,y, head px), dock state and frame time. Jumps and reversals are flagged.
import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/?gl=force', { waitUntil: 'networkidle' })
await page.waitForTimeout(9000)
const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
const probe = () => page.evaluate(() => {
  const n = globalThis.__nav
  if (!n) return null
  return { y: scrollY, beat: n.beat, enter: +n.enter.toFixed(2), dock: n.atDock, ex: Math.round(n.anchor.eyes.x), ey: Math.round(n.anchor.eyes.y), head: Math.round(n.anchor.headPx), on: n.anchor.on }
})
const first = await probe()
if (!first) { console.log('nav is not exposed as globalThis.__nav; add `(globalThis as any).__nav = nav` behind import.meta.env.DEV in state.ts'); await browser.close(); process.exit(2) }
const rows = []
const step = 0.05 * 900
for (const dir of [1, -1]) {
  const ys = []
  for (let y = 0; y <= H; y += step) ys.push(y)
  if (dir < 0) ys.reverse()
  for (const y of ys) {
    await page.evaluate(y => scrollTo(0, y), y)
    await page.waitForTimeout(220)
    const p = await probe()
    rows.push({ dir, s: +(y / 900).toFixed(2), ...p })
  }
}
let flagged = 0
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], b = rows[i]
  if (a.dir !== b.dir || !a.on || !b.on) continue
  const dx = Math.abs(b.ex - a.ex), dy = Math.abs(b.ey - a.ey), dh = Math.abs(b.head - a.head)
  if (dx > 140 || dy > 140 || dh > 80) { flagged++; console.log(`JUMP dir=${b.dir} s=${a.s}->${b.s} beat=${a.beat}->${b.beat} eyes (${a.ex},${a.ey})->(${b.ex},${b.ey}) head ${a.head}->${b.head} dock ${a.dock}->${b.dock}`) }
}
console.log(`rows=${rows.length} flagged=${flagged}`)
console.log(JSON.stringify(rows))
await browser.close()

import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { spawn } from 'node:child_process'
const root = '/home/ashen/Documents/projects/blakraMain'
const out = root + '/.firm/runs/2026-11-01-observatory-build/wpC'
const PORT = 5181
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true })
const stop = () => { try { process.kill(-server.pid) } catch {} }
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break } catch {} await new Promise((r) => setTimeout(r, 200)) }
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
const shot = async (q, name, vp = { width: 1440, height: 900 }, dpr = 1.5, wait = 5000) => {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr })
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  await page.goto(`http://localhost:${PORT}/${q}`)
  await page.waitForTimeout(wait)
  await page.mouse.move(vp.width * 0.5, vp.height * 0.55)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/${name}.png` })
  const live = await page.evaluate(() => [document.documentElement.classList.contains('gl-live'), document.documentElement.classList.contains('gl-off'), !!document.querySelector('.obs-world canvas'), document.querySelector('[data-caret]')?.textContent])
  console.log(name, 'gl-live/gl-off/canvas/typed:', JSON.stringify(live))
  const err = logs.filter((l) => l.startsWith('[pageerror]') || l.startsWith('[error]'))
  if (err.length) console.log(name, 'errors:', err.join(' | '))
  return { page, ctx, logs }
}
try {
  let r = await shot('', 'home-default')
  await r.ctx.close()
  r = await shot('?gl=force&profile', 'home-gl-force', undefined, 1.5, 6000)
  // Profile: 6 s of pointer movement on the hero, then the log.
  for (let i = 0; i < 360; i++) { await r.page.mouse.move(600 + (i % 40) * 10, 400 + (i % 20) * 8); await r.page.waitForTimeout(16) }
  console.log(r.logs.filter((l) => l.includes('[observatory]')).slice(-4).join('\n'))
  await r.ctx.close()
  r = await shot('?film=off', 'home-film-off')
  await r.ctx.close()
  r = await shot('?gl=force', 'home-phone-390', { width: 390, height: 844 }, 2)
  await r.ctx.close()
  // Scrub probe: 0.05-screen steps both ways across the hero → next transition, reading obs and the anchor.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(`http://localhost:${PORT}/?gl=force&profile`)
  await page.waitForTimeout(6000)
  await page.mouse.move(700, 450)
  const probe = () => page.evaluate(() => { const o = globalThis.__obs, n = globalThis.__obsWorld?.nav; return { y: scrollY, st: o.station, pr: +o.progress.toFixed(2), on: n?.anchor.on, ex: Math.round(n?.anchor.eyes.x ?? 0), ey: Math.round(n?.anchor.eyes.y ?? 0), head: Math.round(n?.anchor.headPx ?? 0), f: globalThis.__obsWorld?.frames.n } })
  const rows = []
  const step = 0.05 * 900
  for (const dir of [1, -1]) {
    const ys = []
    for (let y = 0; y <= 2 * 900; y += step) ys.push(y)
    if (dir < 0) ys.reverse()
    for (const y of ys) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(120); rows.push({ dir, s: +(y / 900).toFixed(2), ...(await probe()) }) }
  }
  let flagged = 0
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i]
    if (a.dir !== b.dir || !a.on || !b.on) continue
    // The world scrolls with the page: her eyes move by the scroll step (± her gaze turning toward the fixed cursor, a few px); more is a jump.
    const dyExpected = -(b.y - a.y)
    if (Math.abs(b.ex - a.ex) > 10 || Math.abs(b.ey - a.ey - dyExpected) > 10 || Math.abs(b.head - a.head) > 1) { flagged++; console.log(`JUMP dir=${b.dir} s=${a.s}->${b.s} eyes (${a.ex},${a.ey})->(${b.ex},${b.ey}) head ${a.head}->${b.head}`) }
  }
  const stations = [...new Set(rows.map((r) => r.st))]
  console.log(`scrub rows=${rows.length} flagged=${flagged} stations seen=${stations.join(',')} anchor on at s=0: ${rows[0].on}, off after: ${rows.find((r) => !r.on)?.s}`)
  console.log(JSON.stringify(rows.filter((r) => r.dir === 1).map((r) => [r.s, r.st, r.pr, r.on ? 1 : 0, r.ey])))
  await ctx.close()
} finally {
  await browser.close()
  stop()
}

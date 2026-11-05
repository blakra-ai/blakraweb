import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { spawn } from 'node:child_process'
const root = '/home/ashen/Documents/projects/blakraMain'
const out = root + '/.firm/runs/2026-11-01-observatory-build/wpB'
const PORT = 5179
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true })
const stop = () => { try { process.kill(-server.pid) } catch {} }
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://localhost:${PORT}/src/lab/observatory/index.html`)).ok) break } catch {} await new Promise((r) => setTimeout(r, 200)) }
const args = process.env.CHROME_ARGS?.split(' ') ?? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist']
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args })
try {
  const dpr = Number(process.env.DPR ?? 1.5)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr })
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  await page.goto(`http://localhost:${PORT}/src/lab/observatory/index.html?gl=force&profile&line`)
  await page.waitForTimeout(4500)
  await page.mouse.move(700, 500)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/hero-dpr${dpr}.png` })
  // Scroll: the hand-over (hero leaves, window cut by the edge), then the contact window with a pulse.
  await page.evaluate(() => window.scrollTo(0, 420))
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/hero-scrolled-dpr${dpr}.png` })
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(800)
  await page.click('text=Pulse the ring')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/contact-pulse-dpr${dpr}.png` })
  // Profile: continuous frames for 6 s with the pointer moving (the worst case), read the log.
  // Stage window alone (no figure), pointer moving: the flat passes' cost.
  const stageY = await page.evaluate(() => document.querySelector('[data-kind=stage]').getBoundingClientRect().top + scrollY - 88)
  await page.evaluate((y) => window.scrollTo(0, y), stageY)
  for (let i = 0; i < 240; i++) { await page.mouse.move(600 + (i % 40) * 10, 400 + (i % 20) * 8); await page.waitForTimeout(16) }
  logs.push('--- hero, pointer moving')
  await page.evaluate(() => window.scrollTo(0, 0))
  for (let i = 0; i < 360; i++) { await page.mouse.move(600 + (i % 40) * 10, 400 + (i % 20) * 8); await page.waitForTimeout(16) }
  await page.waitForTimeout(500)
  const idleBefore = logs.length
  const f0 = await page.evaluate(() => globalThis.__obs.frames.n)
  const whys = {}
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(100); const w = await page.evaluate(() => globalThis.__obs.frames.why); whys[w] = (whys[w] ?? 0) + 1 }
  console.log(JSON.stringify(whys))
  console.log('idle frames in 6 s (no input):', (await page.evaluate(() => globalThis.__obs.frames.n)) - f0)
  const gpu = await page.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const i = gl.getExtension('WEBGL_debug_renderer_info'); return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : '?' })
  console.log('renderer:', gpu)
  console.log(logs.filter((l) => !l.includes('Download the React DevTools')).join('\n'))
  console.log('idle log lines in the last 6 s:', logs.length - idleBefore)
} finally {
  await browser.close()
  stop()
}

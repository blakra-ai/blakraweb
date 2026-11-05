import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { spawn } from 'node:child_process'
const root = '/home/ashen/Documents/projects/blakraMain'
const PORT = 5187
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true })
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break } catch {} await new Promise((r) => setTimeout(r, 200)) }
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${PORT}/?gl=force&profile`)
  await page.waitForTimeout(8000)
  const st = await page.evaluate(() => { const f = globalThis.__figure; const n = globalThis.__obsWorld?.nav; return { show: f?.eyeMats[0].uniforms.uShow.value, sys6: n?.perf.sys[6], clock: globalThis.__obs.clock, frames: globalThis.__obsWorld?.frames.n, ex: n?.anchor.eyes.x, ey: n?.anchor.eyes.y } })
  console.log(JSON.stringify(st))
  await page.screenshot({ path: `${root}/.firm/runs/2026-11-01-observatory-build/wpC3/eyes-zoom.png`, clip: { x: st.ex - 120, y: st.ey - 60, width: 240, height: 120 } })
} finally { await browser.close(); try { process.kill(-server.pid) } catch {} }

// Renders the film's last frame (the whole system running, as on the end card) to
// src/assets/og-hero.jpg, the background of the social preview. It needs a real GPU: the film
// does not run on a software renderer. Run `npm run build` first; then `npm run og`.
// Usage: npm run og:frame   (CHROME=/path/to/chrome, CHROME_ARGS="--flag --flag" to override)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4175
const BASE = `http://localhost:${PORT}`
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true })
const stop = () => {
  try {
    process.kill(-server.pid)
  } catch {}
}
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(BASE)).ok) break
  } catch {}
  await new Promise((r) => setTimeout(r, 200))
}

// Vulkan ANGLE reaches the GPU from headless Chrome on Linux; other systems may need other flags.
const args = process.env.CHROME_ARGS?.split(' ') ?? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist']
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args })
try {
  // The preview's own size, at twice the pixels, so it stays sharp when scaled.
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })
  await page.goto(`${BASE}/?dpr=2`, { waitUntil: 'load' })
  const live = await page.waitForFunction(() => document.documentElement.classList.contains('gl-live'), null, { timeout: 20000 }).then(() => true, () => false)
  if (!live) throw new Error('The film did not start: this browser has no usable GPU (try CHROME_ARGS).')
  await page.mouse.move(600, 315)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(3500)
  // Only the world: the page's words, the cursor and the header go.
  await page.addStyleTag({ content: 'main, header, footer, .cursor-dot, .cursor-ring, [class*="skip"] { visibility: hidden !important; }' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(root, 'src/assets/og-hero.jpg'), type: 'jpeg', quality: 88 })
  console.log('wrote src/assets/og-hero.jpg')
} finally {
  await browser.close()
  stop()
}

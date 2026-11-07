// Captures the hero window from the real running world and writes src/assets/observatory/hero-still.jpg:
// her first frame (pose, float, breath and sky clock as World/Guide start them), so the crossfade to
// the live world begins from the same pixels. It needs a real GPU and a build. Re-run it whenever the
// figure, her lights, the ring or the hero's layout change, then update the numbers it prints in
// src/features/observatory/Window.module.css and Guide.tsx (STILL_FRAMING).
// Usage: npm run build && node scripts/hero-still.mjs   (PORT, CHROME, CHROME_ARGS="--flag --flag", MAX_KB to override)
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { spawn } from 'node:child_process'
import { statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'src/assets/observatory/hero-still.jpg')
const PORT = process.env.PORT ?? '4176'
const BASE = `http://localhost:${PORT}`
const MAX_KB = Number(process.env.MAX_KB ?? 90)
const VIEW = { width: 1440, height: 900 }
/** Window-local x where the crop starts, left of the ring's halo (2.4 r) with room for the mask's feather. */
const LEFT_OF_RING = 468

const server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], { cwd: root, stdio: 'ignore', detached: true })
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

const args = process.env.CHROME_ARGS?.split(' ') ?? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist']
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args })
try {
  const page = await (await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 })).newPage()
  // Skips the loader, and holds the animation frames a few frames after she is on screen: the page's clock stops with her first frame on the canvas.
  await page.addInitScript(() => {
    sessionStorage.setItem('blakra:loaded', '1')
    const native = requestAnimationFrame.bind(window)
    let left = Infinity
    let held = []
    const run = (cb) => (t) => (left > 0 ? cb(t) : held.push(cb))
    window.requestAnimationFrame = (cb) => native(run(cb))
    const tick = () => {
      if (Number.isFinite(left)) left--
      else if (document.documentElement.classList.contains('gl-live')) left = 3
      native(tick)
    }
    native(tick)
    window.__frozen = () => left <= 0
    window.__freezeIn = (n) => {
      left = n
      for (const cb of held.splice(0)) native(run(cb))
    }
  })
  page.on('pageerror', (e) => console.error('page error:', e.message))
  await page.goto(`${BASE}/?profile&smooth=native`, { waitUntil: 'load' })
  const live = await page.waitForFunction(() => window.__frozen(), null, { polling: 50, timeout: 30000 }).then(() => true, () => false)
  if (!live) throw new Error('The world did not start: this browser has no usable GPU (try CHROME_ARGS).')
  // Only the canvas: no words, frame line or still; the corners over the ink, not the paper.
  await page.addStyleTag({ content: `html, body { background: #0d0d10 !important }
    header, footer, .skip, [data-still], [data-window="hero"] > :not([data-still]) { visibility: hidden !important }
    [data-window="hero"] { border-color: transparent !important }` })
  const info = await page.evaluate(() => {
    const r = document.querySelector('[data-window="hero"]').getBoundingClientRect()
    const nav = window.__obsWorld?.nav
    return { x: r.x, y: r.y, w: r.width, h: r.height, yaw: nav?.perf.head.yaw, pitch: nav?.perf.head.pitch, eyeX: nav?.anchor.eyes.x, eyeY: nav?.anchor.eyes.y, headPx: nav?.anchor.headPx }
  })
  if (Math.abs(info.yaw - 6) > 0.05 || Math.abs(info.pitch) > 0.05) throw new Error(`Not her first pose: yaw ${info.yaw}, pitch ${info.pitch}.`)

  // The ring as the world places it (windows.ts frameWindow): 62 % across, 322/788 down, 180 px scaled by min(w, 1392) / 1392.
  const ring = { x: info.w * 0.62, y: (info.h * 322) / 788, r: (180 * Math.min(1, info.w / 1392)) }
  const x0 = Math.round(ring.x - LEFT_OF_RING)
  const X = Math.round(info.x + x0)
  const Y = Math.round(info.y)
  const W = Math.round(info.x + info.w) - X
  const H = Math.ceil(info.h)
  const visible = VIEW.height - Y
  const top = await page.screenshot({ clip: { x: X, y: Y, width: W, height: visible } })
  // The window runs past the fold at this size: its last rows come from the same frames, scrolled.
  const below = H - visible
  let image = sharp(top)
  if (below > 0) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), below + 4)
    await page.evaluate(() => window.__freezeIn(3))
    await page.waitForTimeout(30)
    await page.waitForFunction(() => window.__frozen(), null, { polling: 50 })
    const strip = await page.screenshot({ clip: { x: X, y: VIEW.height - below - 4, width: W, height: below } })
    image = sharp({ create: { width: W, height: H, channels: 3, background: '#0d0d10' } }).composite([{ input: top, top: 0, left: 0 }, { input: strip, top: visible, left: 0 }])
  }
  const flat = await image.png().toBuffer()

  // The best quality under the budget, all channels at full resolution (the gold lines bleed under 4:2:0).
  let best = null
  for (const quality of [90, 86, 82, 78, 74, 70, 66, 62, 58, 54, 50]) {
    best = await sharp(flat).jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer()
    console.log(`q${quality} 4:4:4 ${(best.length / 1024).toFixed(1)} KB`)
    if (best.length <= MAX_KB * 1024) break
  }
  writeFileSync(OUT, best)
  const scale = ring.r / 180
  console.log(`wrote ${OUT.slice(root.length + 1)} ${W}×${H}, ${(statSync(OUT).size / 1024).toFixed(1)} KB; window ${info.w}×${info.h}`)
  console.log(`Window.module.css .stillImage: width ${(W / scale).toFixed(2)}, height ${(H / scale).toFixed(2)}, ring x ${((ring.x - x0) / scale).toFixed(2)}, ring y ${(ring.y / scale).toFixed(2)}`)
  const local = { x: info.eyeX - info.x - ring.x, y: info.eyeY - info.y - ring.y }
  console.log(`Guide.tsx STILL_FRAMING = { w: ${info.w}, h: ${info.h.toFixed(2)}, eyeX: ${(local.x / ring.r).toFixed(4)}, eyeY: ${(local.y / ring.r).toFixed(4)}, figure: ${((4 * info.headPx) / ring.r).toFixed(4)} }`)
} finally {
  await browser.close()
  stop()
}

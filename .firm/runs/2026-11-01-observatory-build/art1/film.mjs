import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { createRequire } from 'node:module'
const sharp = createRequire('/home/ashen/Documents/projects/blakraMain/package.json')('sharp')
const out = process.argv[2]
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5173/?gl=force', { waitUntil: 'networkidle' }); await p.waitForTimeout(9000)
await p.mouse.move(700, 450)
const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
const n = 24, frames = []
for (let i = 0; i < n; i++) { await p.evaluate((y) => scrollTo(0, y), Math.round(H * i / (n - 1))); await p.waitForTimeout(900); frames.push(await p.screenshot({ type: 'jpeg', quality: 70 })) }
await b.close()
// contact sheets: 3 sheets × 8 frames (2 cols × 4 rows), each frame 640×400
for (let s = 0; s < 3; s++) {
  const tiles = []
  for (let k = 0; k < 8; k++) { const i = s * 8 + k; tiles.push({ input: await sharp(frames[i]).resize(640, 400).toBuffer(), left: (k % 2) * 650, top: Math.floor(k / 2) * 410 }) }
  await sharp({ create: { width: 1290, height: 1630, channels: 3, background: '#222' } }).composite(tiles).jpeg({ quality: 80 }).toFile(`${out}/sheet-${s}.jpg`)
}
console.log('sheets ok', H)

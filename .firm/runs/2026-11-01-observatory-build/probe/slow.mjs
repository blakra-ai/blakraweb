import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { createRequire } from 'node:module'
const sharp = createRequire('/home/ashen/Documents/projects/blakraMain/package.json')('sharp')
const out = process.argv[2]
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=vulkan','--enable-features=Vulkan','--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5174/?gl=force', { waitUntil: 'networkidle' }); await p.waitForTimeout(8000)
await p.mouse.move(700, 450)
const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
const n = 40, frames = [], log = []
for (let i = 0; i < n; i++) {
  const target = Math.round(H * i / (n - 1))
  // slow wheel to target
  for (;;) { const y = await p.evaluate(() => scrollY); if (Math.abs(target - y) < 30) break; await p.mouse.wheel(0, Math.sign(target - y) * Math.min(120, Math.abs(target - y))); await p.waitForTimeout(60) }
  await p.waitForTimeout(700)
  const info = await p.evaluate(() => { const c = document.elementFromPoint(innerWidth/2, innerHeight/2); const s = c && c.closest('section,header,footer'); return { y: Math.round(scrollY), sec: s ? (s.id || s.getAttribute('aria-labelledby') || s.className.slice(0,30)) : '?' } })
  log.push(`${String(i+1).padStart(2)} ${String(Math.round(100*i/(n-1))).padStart(3)}% y=${info.y} ${info.sec}`)
  frames.push(await p.screenshot({ type: 'jpeg', quality: 70 }))
}
await b.close()
for (let s = 0; s < 4; s++) {
  const tiles = []
  for (let k = 0; k < 10; k++) { const i = s*10+k; tiles.push({ input: await sharp(frames[i]).resize(576, 360).composite([{ input: Buffer.from(`<svg width="576" height="360"><rect width="44" height="26" fill="#ff5a1f"/><text x="6" y="19" font-size="18" font-family="monospace" fill="#fff">${i+1}</text></svg>`), left: 0, top: 0 }]).toBuffer(), left: (k%2)*586, top: Math.floor(k/2)*370 }) }
  await sharp({ create: { width: 1172, height: 1850, channels: 3, background: '#222' } }).composite(tiles).jpeg({ quality: 75 }).toFile(`${out}/slow-${s}.jpg`)
}
console.log(log.join('\n'))

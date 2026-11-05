// Journey frames: hero (sky), stage, proof, payload, contact at 1440, with console profile lines.
import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
const out = process.argv[2]
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
p.on('pageerror', (e) => console.log('pageerror', e.message))
p.on('console', (m) => { if (m.type() === 'error' || /observatory\] frame/.test(m.text())) console.log('console', m.text().slice(0, 160)) })
await p.goto('http://localhost:5174/?gl=force&profile', { waitUntil: 'networkidle' })
await p.waitForTimeout(8000)
await p.mouse.move(400, 500)
await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}/hero-1440.png` })
const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (const [name, f] of [['stage', 0.2], ['proof', 0.5], ['payload', 0.72], ['people', 0.84], ['contact', 1]]) {
  await p.evaluate((y) => scrollTo(0, y), Math.round(H * f))
  await p.waitForTimeout(3000)
  const st = await p.evaluate(() => ({ station: globalThis.__obs?.station, owner: globalThis.__obs?.journeyOwner, j: globalThis.__obs && { x: Math.round(globalThis.__obs.journey.x), y: Math.round(globalThis.__obs.journey.y), size: Math.round(globalThis.__obs.journey.figurePx), mode: globalThis.__obs.journey.mode } }))
  console.log(name, JSON.stringify(st))
  await p.screenshot({ path: `${out}/${name}-1440.png` })
}
await b.close()
console.log('journey shots ok')

// The phone hero (390 × 844, ?gl=force): head and neck only, right-aligned in the band.
import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
const out = process.argv[2]
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
p.on('pageerror', (e) => console.log('pageerror', e.message))
await p.goto('http://localhost:5174/?gl=force', { waitUntil: 'networkidle' })
await p.waitForTimeout(8000)
await p.screenshot({ path: `${out}/phone-hero.png` })
await b.close()
console.log('phone ok')

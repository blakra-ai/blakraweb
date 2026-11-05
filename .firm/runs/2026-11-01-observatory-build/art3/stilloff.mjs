import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5173/?film=off', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000)
await p.screenshot({ path: process.argv[2] + '/hero-1440-still.png' })
const m = await b.newPage({ viewport: { width: 390, height: 844 } })
await m.goto('http://localhost:5173/', { waitUntil: 'networkidle' }); await m.waitForTimeout(2000)
await m.screenshot({ path: process.argv[2] + '/phone-hero.png' })
await b.close(); console.log('ok')

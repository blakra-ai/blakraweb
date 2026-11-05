// The hero's desktop still: the window's right half at 1.5× with her and the ring, the words hidden (they are DOM).
import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { createRequire } from 'node:module'
const sharp = createRequire('/home/ashen/Documents/projects/blakraMain/package.json')('sharp')
const out = process.argv[2]
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
await p.goto('http://localhost:5173/?gl=force', { waitUntil: 'networkidle' })
await p.waitForTimeout(8000)
await p.mouse.move(720, 450)
await p.waitForTimeout(2500)
await p.addStyleTag({ content: '[data-window="hero"] > :not([data-still]) { visibility: hidden !important }' })
await p.waitForTimeout(600)
const el = p.locator('[data-window="hero"]')
const box = await el.boundingBox()
const png = await p.screenshot({ clip: { x: box.x + box.width / 2, y: box.y, width: box.width / 2, height: box.height } })
await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toFile(out)
// The phone still: the ring and her bust from the same clean frame, the band's aspect (358 × 250), WebP under 120 KB.
const phone = await p.screenshot({ clip: { x: 660, y: 215, width: 712, height: 497 } })
await sharp(phone).webp({ quality: 78 }).toFile(out.replace('hero-still.jpg', 'hero-still-phone.webp'))
console.log('still', box, (await sharp(out).metadata()).width, 'x', (await sharp(out).metadata()).height)
await b.close()

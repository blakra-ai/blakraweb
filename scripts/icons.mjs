// Renders every site icon from the official logo (src/assets/brand), white on #0a0a0a, via system Chrome:
// public/favicon.svg and favicon.ico (16/32/48: the symbol without its axis lines, which vanish at
// that size), apple-touch-icon.png (180), icon-192/512.png and icon-maskable-512.png (the full
// symbol; the maskable one inside the 80 % safe circle).
// Usage: npm run icons   (CHROME=/path/to/chrome to override the browser)
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = (f) => join(root, 'public', f)
const bg = '#0a0a0a'
const fg = '#ffffff'
const brand = (f) => readFileSync(join(root, 'src/assets/brand', f), 'utf8')
const parts = (svg) => ({ vb: svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number), d: svg.match(/ d="([^"]+)"/)[1] })
const glyph = parts(brand('glyph.svg'))
const mark = parts(brand('mark.svg'))

// One square SVG: the shape scaled to `width` (a share of the side), centred; `r` is the corner radius share.
const square = ({ vb, d }, width, r) => {
  const s = 100
  const k = (s * width) / vb[2]
  const tx = (s - vb[2] * k) / 2 - vb[0] * k
  const ty = (s - vb[3] * k) / 2 - vb[1] * k
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}"${r ? ` rx="${s * r}"` : ''} fill="${bg}"/><path fill="${fg}" transform="matrix(${+k.toFixed(5)} 0 0 ${+k.toFixed(5)} ${+tx.toFixed(2)} ${+ty.toFixed(2)})" d="${d}"/></svg>`
}

const favicon = square(glyph, 0.86, 0.22)
writeFileSync(pub('favicon.svg'), favicon)
console.log('wrote public/favicon.svg')

// Maskable: the safe zone is a circle of radius 40 % of the side; the symbol's corners stay inside it.
const diag = Math.hypot(1, mark.vb[3] / mark.vb[2])
const jobs = [
  [square(glyph, 0.86, 0.22), 16, null],
  [square(glyph, 0.88, 0.22), 32, null],
  [square(glyph, 0.88, 0.22), 48, null],
  [square(mark, 0.72, 0), 180, 'apple-touch-icon.png'],
  [square(mark, 0.72, 0), 192, 'icon-192.png'],
  [square(mark, 0.72, 0), 512, 'icon-512.png'],
  [square(mark, (0.76 / diag), 0), 512, 'icon-maskable-512.png'],
]

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' })
const ico = []
for (const [svg, size, out] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  const png = await page.screenshot({ omitBackground: true })
  await page.close()
  if (out) {
    writeFileSync(pub(out), png)
    console.log(`wrote public/${out}`)
  } else ico.push([size, png])
}
await browser.close()

// favicon.ico: PNG entries (Vista+ format), 16, 32 and 48.
const head = Buffer.alloc(6 + 16 * ico.length)
head.writeUInt16LE(0, 0)
head.writeUInt16LE(1, 2)
head.writeUInt16LE(ico.length, 4)
let offset = head.length
ico.forEach(([size, png], i) => {
  const e = 6 + 16 * i
  head.writeUInt8(size, e)
  head.writeUInt8(size, e + 1)
  head.writeUInt16LE(1, e + 4)
  head.writeUInt16LE(32, e + 6)
  head.writeUInt32LE(png.length, e + 8)
  head.writeUInt32LE(offset, e + 12)
  offset += png.length
})
writeFileSync(pub('favicon.ico'), Buffer.concat([head, ...ico.map(([, png]) => png)]))
console.log('wrote public/favicon.ico')

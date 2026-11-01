import { chromium } from 'playwright-core'
const out = process.argv[2]
const base = process.argv[3] || 'http://localhost:4173'
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const shots = [
  ['hero-1440x900', 1440, 900, '/'],
  ['hero-1024x768', 1024, 768, '/'],
  ['hero-390x844', 390, 844, '/'],
  ['hero-1440x900-film-off', 1440, 900, '/?film=off'],
  ['menu-390x844', 390, 844, '/', 'menu'],
  ['hero-320x568', 320, 568, '/'],
]
for (const [name, w, h, path, act] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  if (act === "menu") await page.click("header button[aria-label=\"Menu\"]")
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/${name}.png` })
  const info = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    h1: getComputedStyle(document.querySelector('h1')).fontSize,
    win: globalThis.__obs?.windows ?? null,
    hasChip: !!document.querySelector('header [aria-live]'),
  }))
  console.log(name, JSON.stringify(info), errors.length ? errors : 'no page errors')
  await page.close()
}
await browser.close()

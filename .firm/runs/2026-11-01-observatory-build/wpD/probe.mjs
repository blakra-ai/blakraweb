import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { spawn } from 'node:child_process'
const root = '/home/ashen/Documents/projects/blakraMain'
const out = root + '/.firm/runs/2026-11-01-observatory-build/wpD'
const PORT = 5189
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true })
for (let i = 0; i < 100; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break } catch {} await new Promise((r) => setTimeout(r, 200)) }
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] })
const open = async (q, vp, dpr = 1.5, wait = 6000) => {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr })
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  await page.goto(`http://localhost:${PORT}/${q}`)
  await page.waitForTimeout(wait)
  return { page, ctx, logs }
}
const stageTop = (page) => page.evaluate(() => { const el = document.getElementById('stage'); return { top: el.getBoundingClientRect().top + scrollY, h: el.offsetHeight } })
try {
  // Desktop: the hold at 0 / 0.5 / 1.0.
  let { page, ctx, logs } = await open('?gl=force&profile', { width: 1440, height: 900 })
  const st = await stageTop(page)
  for (const hold of [0, 0.5, 1]) {
    await page.evaluate(({ y }) => scrollTo(0, y), { y: st.top + (st.h - 900) * hold })
    await page.waitForTimeout(900)
    await page.mouse.move(700, 450)
    await page.waitForTimeout(400)
    const state = await page.evaluate(() => ({ hold: globalThis.__obs.hold, inOrbit: globalThis.__obs.inOrbit, handover: globalThis.__obs.handover, station: globalThis.__obs.station, lit: document.querySelectorAll('#stage li[data-on]').length }))
    console.log(`hold ${hold}:`, JSON.stringify(state))
    await page.screenshot({ path: `${out}/stage-hold-${hold}.png` })
  }
  // The picker: choose "AI on your data" and shoot.
  await page.click('#pulse [role="radio"]:nth-child(4)')
  await page.waitForTimeout(700)
  const picked = await page.evaluate(() => ({ picker: globalThis.__obs.picker, lit: [...document.querySelectorAll('#stage li[data-picked="true"]')].map((l) => l.id), uses: document.querySelector('#pulse [aria-live]')?.textContent }))
  console.log('picked:', JSON.stringify(picked))
  await page.screenshot({ path: `${out}/stage-picker.png` })
  // Profile on the stage at hold 0.5 with the pointer moving.
  await page.evaluate(({ y }) => scrollTo(0, y), { y: st.top + (st.h - 900) * 0.5 })
  await page.waitForTimeout(500)
  for (let i = 0; i < 360; i++) { await page.mouse.move(600 + (i % 40) * 10, 400 + (i % 20) * 8); await page.waitForTimeout(16) }
  console.log(logs.filter((l) => l.includes('[observatory] frame')).slice(-3).join('\n'))
  const errs = logs.filter((l) => l.startsWith('[pageerror]'))
  if (errs.length) console.log('ERRORS', errs.join(' | '))
  // Scrub: hero → stage → proof, 0.05-screen steps both ways.
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(500)
  const end = st.top + st.h + 900
  const probe = () => page.evaluate(() => { const o = globalThis.__obs, n = globalThis.__obsWorld?.nav; return { y: scrollY, st: o.station, hold: +o.hold.toFixed(2), on: n?.anchor.on, ex: Math.round(n?.anchor.eyes.x ?? 0), ey: Math.round(n?.anchor.eyes.y ?? 0), head: Math.round(n?.anchor.headPx ?? 0) } })
  const rows = []
  for (const dir of [1, -1]) {
    const ys = []
    for (let y = 0; y <= end; y += 45) ys.push(y)
    if (dir < 0) ys.reverse()
    for (const y of ys) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(100); rows.push({ dir, ...(await probe()) }) }
  }
  let flagged = 0
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i]
    if (a.dir !== b.dir || !a.on || !b.on) continue
    const dyExpected = -(b.y - a.y)
    // Within one window she scrolls with it; between windows (hero → stage) she re-emerges in the next window's framing: a different place, by design.
    const sameWindow = (a.y < st.top - 900) === (b.y < st.top - 900)
    if (sameWindow && (Math.abs(b.ex - a.ex) > 10 || Math.abs(b.ey - a.ey - dyExpected) > 10 || Math.abs(b.head - a.head) > 1)) { flagged++; console.log(`JUMP dir=${b.dir} y=${a.y}->${b.y} eyes (${a.ex},${a.ey})->(${b.ex},${b.ey}) head ${a.head}->${b.head}`) }
  }
  console.log(`scrub rows=${rows.length} flagged=${flagged} stations=${[...new Set(rows.map((r) => r.st))].join(',')} hold range ${Math.min(...rows.map((r) => r.hold))}..${Math.max(...rows.map((r) => r.hold))}`)
  await ctx.close()
  // Phone: the stage at hold 0.5 and the picker, no WebGL.
  ;({ page, ctx, logs } = await open('', { width: 390, height: 844 }, 2, 4000))
  const sp = await stageTop(page)
  await page.evaluate(({ y }) => scrollTo(0, y), { y: sp.top + (sp.h - 844) * 0.5 })
  await page.waitForTimeout(600)
  console.log('phone:', JSON.stringify(await page.evaluate(() => ({ glOff: document.documentElement.classList.contains('gl-off'), canvas: !!document.querySelector('.obs-world canvas'), lit: document.querySelectorAll('#stage li[data-on]').length }))))
  await page.screenshot({ path: `${out}/phone-stage.png` })
  await page.evaluate(({ y }) => scrollTo(0, y), { y: sp.top + (sp.h - 844) })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/phone-picker.png` })
  // Reduced motion: final state, nothing sticky.
  await ctx.close()
  const calm = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  const p2 = await calm.newPage()
  await p2.goto(`http://localhost:${PORT}/`)
  await p2.waitForTimeout(1500)
  const rm = await p2.evaluate(() => { const el = document.getElementById('stage'); el.scrollIntoView(); return { sticky: [...el.querySelectorAll('*')].some((e) => getComputedStyle(e).position === 'sticky'), lit: el.querySelectorAll('li[data-on]').length, counter: el.querySelector('[aria-live="off"]')?.textContent } })
  console.log('reduced motion:', JSON.stringify(rm))
  await p2.screenshot({ path: `${out}/stage-reduced-motion.png` })
  await calm.close()
} finally { await browser.close(); try { process.kill(-server.pid) } catch {} }

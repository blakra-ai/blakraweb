// Records the first 6 s after navigation (first visit, loader on): screencast frames, layout
// shifts, long tasks, rAF gaps, and the loader's exit time. Usage: node probe.mjs <label> [base]
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const label = process.argv[2] ?? 'run'
const BASE = process.argv[3] ?? 'http://localhost:4173'
const out = join(import.meta.dirname, label)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan'] })
const summary = {}
for (const [w, h] of (process.env.ONLY === 'desk' ? [[1440, 900]] : process.env.ONLY === 'phone' ? [[390, 844]] : [[1440, 900], [390, 844]])) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    const L = (window.__probe = { shifts: [], longs: [], raf: [], marks: [] })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) L.shifts.push({ t: e.startTime, v: e.value, src: (e.sources || []).map((s) => s.node?.nodeName + '.' + (s.node?.className || '')) }) }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) L.longs.push({ t: e.startTime, d: e.duration }) }).observe({ type: 'longtask', buffered: true })
    let last = 0
    let pc='';const f = (t) => { if (last) L.raf.push([last, t - last]); last = t; const b=document.getElementById('boot'); const c=document.documentElement.className+(b?(b.classList.contains('out')?' #boot.out':' #boot'):''); if(c!==pc){pc=c;L.marks.push({t:performance.now(),c,out:c.includes('#boot.out')})} if (t < 12000) requestAnimationFrame(f) }
    requestAnimationFrame(f)
    const mo = new MutationObserver(() => {
      const c = document.documentElement.className
      L.marks.push({ t: performance.now(), c, boot: !!document.getElementById('boot'), out: !!document.querySelector('#boot.out') })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], childList: true, subtree: false })
    document.addEventListener('DOMContentLoaded', () => { const b = document.getElementById('boot'); if (b) new MutationObserver(() => L.marks.push({ t: performance.now(), out: b.classList.contains('out') })).observe(b, { attributes: true, attributeFilter: ['class'] }) })
  })
  const cdp = await ctx.newCDPSession(page)
  const frames = []
  let t0 = 0
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ ts: f.metadata.timestamp, data: f.data })
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 })
  t0 = Date.now() / 1000
  await page.goto(BASE + '/', { waitUntil: 'commit' })
  await page.waitForTimeout(+(process.env.DUR ?? 6000))
  await cdp.send('Page.stopScreencast')
  const probe = await page.evaluate(() => ({ ...window.__probe, nav: performance.timeOrigin }))
  const navS = probe.nav / 1000
  const dir = join(out, String(w))
  await mkdir(dir, { recursive: true })
  for (const [i, f] of frames.entries()) await writeFile(join(dir, `${String(i).padStart(3, '0')}_${Math.round((f.ts - navS) * 1000)}.jpg`), Buffer.from(f.data, 'base64'))
  const outT = probe.marks.find((m) => m.out)?.t ?? null
  const lift = probe.marks.find((m) => m.c && !m.c.includes('loading') && probe.marks.some((p) => p.c?.includes('loading')))?.t ?? null
  const win = (a, b) => probe.raf.filter(([t]) => t >= a && t <= b).map(([, d]) => d)
  const gaps = outT ? win(outT - 100, outT + 1600) : []
  const res = {
    exitStart: outT, loadingRemoved: lift,
    cls: probe.shifts.reduce((s, e) => s + e.v, 0), shifts: probe.shifts,
    longTasks: probe.longs,
    exitLongs: outT ? probe.longs.filter((l) => l.t + l.d > outT && l.t < outT + 1600).map((l) => [Math.round(l.t - outT), Math.round(l.d)]) : [],
    exitWindow: { frames: gaps.length, maxGap: Math.max(0, ...gaps), over50: gaps.filter((d) => d > 50).length, over34: gaps.filter((d) => d > 34).length },
    rafGapsOver50: probe.raf.filter(([, d]) => d > 50).map(([t, d]) => [Math.round(t), Math.round(d)]),
    classMarks: probe.marks.filter((m) => m.c).map((m) => [Math.round(m.t), m.c]),
    screencastFrames: frames.length,
  }
  summary[w] = res
  await ctx.close()
}
await browser.close()
await writeFile(join(out, 'summary.json'), JSON.stringify(summary, null, 2))
for (const [w, r] of Object.entries(summary)) console.log(w, JSON.stringify({ exit: r.exitStart && Math.round(r.exitStart), lift: r.loadingRemoved && Math.round(r.loadingRemoved), cls: r.cls.toFixed(4), win: r.exitWindow, longs: r.longTasks.map((l) => [Math.round(l.t), Math.round(l.d)]), gaps: r.rafGapsOver50, classes: r.classMarks.map(([t, c]) => t + ':' + c) }))

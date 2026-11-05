// CPU profile of the first 6 s at 1440 (first visit), bucketed: top self-time functions per window.
import { chromium } from 'playwright-core'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan'] })
const W = +(process.argv[3] ?? 1440)
const ctx = await b.newContext({ viewport: { width: W, height: W < 800 ? 844 : 900 }, isMobile: W < 800, hasTouch: W < 800 })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start')
await page.goto(BASE + '/', { waitUntil: 'commit' })
await page.waitForTimeout(8000)
const nowMs = await page.evaluate(() => performance.now())
const { profile } = await cdp.send('Profiler.stop')
const origin = profile.endTime / 1000 - nowMs
await b.close()
const nodes = new Map(profile.nodes.map((n) => [n.id, n]))
let t = profile.startTime
const buckets = {}
const wallStart = origin * 1000
profile.samples.forEach((id, i) => {
  t += profile.timeDeltas[i]
  const ms = (t - wallStart) / 1000
  const n = nodes.get(id); const cf = n.callFrame
  if (cf.functionName === '(idle)' || cf.functionName === '(program)') return
  const k = Math.floor(ms / 100) * 100
  const name = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber}:${cf.columnNumber}`
  ;(buckets[k] ??= {})[name] = ((buckets[k] ??= {})[name] ?? 0) + profile.timeDeltas[i] / 1000
})
for (const k of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
  const top = Object.entries(buckets[k]).sort((a, b) => b[1] - a[1])
  const tot = top.reduce((s, x) => s + x[1], 0)
  if (tot < 40) continue
  console.log(k, Math.round(tot) + 'ms', top.slice(0, 5).map(([n, v]) => `${n}=${Math.round(v)}`).join(' | '))
}

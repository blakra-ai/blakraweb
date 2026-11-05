import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage()
for (const n of ['mark','word','full','icon']) {
  let s = readFileSync(`svgo-${n}.svg`,'utf8')
  await p.setContent(s)
  const bb = await p.evaluate(() => { const r = document.querySelector('svg').getBBox(); return [r.x,r.y,r.width,r.height] })
  const pad = 4
  const vb = [Math.floor(bb[0])-pad, Math.floor(bb[1])-pad, Math.ceil(bb[2])+2*pad, Math.ceil(bb[3])+2*pad]
  s = s.replace(/viewBox="[^"]*"/, `viewBox="${vb.join(' ')}" fill="currentColor"`)
  writeFileSync(`../../logo/blakra-${n==='full'?'lockup':n==='word'?'wordmark':n==='icon'?'icon-glyph':'mark'}.svg`, s)
  console.log(n, vb, (vb[2]/vb[3]).toFixed(3))
  // per-path boxes
  console.log(await p.evaluate(() => [...document.querySelectorAll('path')].map(e=>{const r=e.getBBox();return [r.x,r.y,r.width,r.height].map(Math.round).join(',')})))
}
await b.close()

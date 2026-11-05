import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const L='/home/ashen/Documents/projects/blakraMain/.firm/runs/logo/', B='/home/ashen/Documents/projects/blakraMain/src/assets/brand/'
const parts = (f) => { const s=readFileSync(B+f,'utf8'); return { vb: s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number), d: s.match(/ d="([^"]+)"/)[1] } }
const mark=parts('mark.svg'), lock=parts('lockup.svg')
const sq = ({vb,d}, w, bg, fg, r=0) => { const s=1024, k=s*w/vb[2], tx=(s-vb[2]*k)/2-vb[0]*k, ty=(s-vb[3]*k)/2-vb[1]*k
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}"${r?` rx="${r}"`:''} fill="${bg}"/><path fill="${fg}" transform="matrix(${+k.toFixed(5)} 0 0 ${+k.toFixed(5)} ${+tx.toFixed(2)} ${+ty.toFixed(2)})" d="${d}"/></svg>` }
const out = { 'blakra-mark-dark': sq(mark,.7,'#0a0a0a','#ffffff'), 'blakra-mark-light': sq(mark,.7,'#ffffff','#0a0a0a'), 'blakra-icon': sq(mark,.7,'#0a0a0a','#ffffff',230), 'blakra-lockup-dark': sq(lock,.78,'#0a0a0a','#ffffff'), 'blakra-lockup-light': sq(lock,.78,'#ffffff','#0a0a0a') }
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
for (const [n, svg] of Object.entries(out)) { writeFileSync(L+n+'.svg', svg); const p=await b.newPage({viewport:{width:1024,height:1024}}); await p.setContent(`<style>*{margin:0}svg{display:block}</style>${svg}`); await p.screenshot({path:L+n+'.png', omitBackground:true}); await p.close() }
await b.close()

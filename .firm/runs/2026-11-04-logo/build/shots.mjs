import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'
const O = '/home/ashen/Documents/projects/blakraMain/.firm/runs/2026-11-04-logo/', U = 'http://localhost:4199'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = async (w, h, dsf = 2) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf }); await c.addInitScript(() => sessionStorage.setItem('blakra:loaded', '1')); return c }
// header 1440 dark (top of home)
let c = await ctx(1440, 900); let p = await c.newPage(); await p.goto(U + '/'); await p.waitForTimeout(1500)
await p.screenshot({ path: O + 'header-1440-dark.png', clip: { x: 0, y: 0, width: 1440, height: 90 } })
// light: an inner page? find a light surface: scroll to products (station 2)
await p.goto(U + '/#products'); await p.waitForTimeout(2500)
await p.screenshot({ path: O + 'header-1440-light.png', clip: { x: 0, y: 0, width: 1440, height: 90 } })
await p.screenshot({ path: O + 'header-1440-light-ctx.png' })
// footer
await p.goto(U + '/privacy/'); await p.waitForTimeout(800); await p.evaluate(() => scrollTo(0, 1e6)); await p.waitForTimeout(800)
await p.screenshot({ path: O + 'footer-1440.png' })
await c.close()
c = await ctx(390, 844, 3); p = await c.newPage(); await p.goto(U + '/'); await p.waitForTimeout(1500)
await p.screenshot({ path: O + 'header-390.png', clip: { x: 0, y: 0, width: 390, height: 80 } })
await c.close()
// loader frame: fresh session, freeze
c = await b.newContext({ viewport: { width: 1440, height: 900 } }); p = await c.newPage()
await p.route('**/*.js', async r => { await new Promise(x => setTimeout(x, 3000)); r.continue() })
p.goto(U + '/').catch(() => {}); await p.waitForTimeout(1200)
await p.screenshot({ path: O + 'loader.png' }); await c.close()
// icons
c = await b.newContext({ viewport: { width: 700, height: 560 } }); p = await c.newPage()
const d64 = f => 'data:image/png;base64,' + readFileSync('/home/ashen/Documents/projects/blakraMain/public/' + f).toString('base64')
const fav = 'data:image/svg+xml;base64,' + readFileSync('/home/ashen/Documents/projects/blakraMain/public/favicon.svg').toString('base64')
await p.setContent(`<body style="margin:16px;background:#e8e8e8;font:12px sans-serif"><p>favicon.svg at 16 / 32 (1x), and 8x nearest-neighbour</p><div style="display:flex;gap:16px;align-items:end"><img src="${fav}" width=16><img src="${fav}" width=32><canvas id=a width=16 height=16 style="width:128px;image-rendering:pixelated"></canvas><canvas id=b width=32 height=32 style="width:128px;image-rendering:pixelated"></canvas><img src="${d64('icon-512.png')}" width=256><img src="${d64('icon-maskable-512.png')}" width=128 style="border-radius:50%"></div></body><script>for(const[id,s]of[['a',16],['b',32]]){const i=new Image();i.onload=()=>document.getElementById(id).getContext('2d').drawImage(i,0,0,s,s);i.src='${fav}'}</script>`)
await p.waitForTimeout(500); await p.screenshot({ path: O + 'icons.png' }); await c.close()
await b.close()

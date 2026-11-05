import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'
const m = readFileSync('../../logo/blakra-mark.svg','utf8'), w = readFileSync('../../logo/blakra-wordmark.svg','utf8')
const sz = (s, h) => s.replace('<svg ', `<svg height="${h}" `)
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: 900, height: 500 } })
await p.setContent(`<body style="margin:20px;font-family:sans-serif"><div style="display:flex;gap:20px;align-items:end">${[16,24,32,64,200].map(h=>sz(m,h)).join('')}</div><div style="background:#0a0a0a;color:#fff;padding:20px;margin-top:20px;display:flex;gap:16px;align-items:center">${sz(m,22)}${sz(w,12)}<span style="width:40px"></span>${sz(m,32)}${sz(w,16)}</div>${sz(w,60)}</body>`)
await p.screenshot({ path: 'prev1.png' })
await b.close()

import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'
const g = n => readFileSync(`../../logo/${n}.svg`,'utf8')
const tile = (s, sz, k) => `<div style="width:${sz}px;height:${sz}px;background:#0a0a0a;color:#fff;display:grid;place-items:center;border-radius:${sz*.2}px">${s.replace('<svg ',`<svg style="width:${sz*k}px;height:${sz*k}px" `)}</div>`
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: 400, height: 160 }, deviceScaleFactor: 1 })
await p.setContent(`<body style="margin:10px;display:flex;gap:10px;align-items:start">${[16,32,64].map(z=>tile(g('blakra-icon-glyph'),z,.94)).join('')}${[16,32,64].map(z=>tile(g('blakra-mark'),z,.9)).join('')}</body>`)
await p.screenshot({ path: 'prev2.png' }); await b.close()

// Contact sheet of a probe run's reveal: node sheet.mjs <label> <width> <fromMs> <toMs> [step]
import { chromium } from 'playwright-core'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const [label, width, from, to, step = '0'] = process.argv.slice(2)
const dir = join(import.meta.dirname, label, width)
let files = (await readdir(dir)).filter((f) => f.endsWith('.jpg')).map((f) => ({ f, t: +f.split(/[_.]/)[1] })).filter((x) => x.t >= +from && x.t <= +to).sort((a, b) => a.t - b.t)
if (+step) { let last = -1e9; files = files.filter((x) => (x.t - last >= +step ? ((last = x.t), true) : false)) }
files = files.slice(0, 36)
const cols = +width > 800 ? 6 : 9
const cw = +width > 800 ? 300 : 150
const imgs = await Promise.all(files.map(async (x) => `<figure><img src="data:image/jpeg;base64,${(await readFile(join(dir, x.f))).toString('base64')}"><figcaption>${x.t} ms</figcaption></figure>`))
const html = `<body style="margin:0;background:#222;color:#ddd;font:12px monospace"><h3 style="margin:6px">${label} @ ${width}px, ${from}–${to} ms after navigation</h3><div style="display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:4px;padding:4px">${imgs.join('')}</div><style>figure{margin:0}img{width:100%;display:block}figcaption{padding:2px}</style></body>`
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: cols * (cw + 4) + 8, height: 400 } })
await p.setContent(html)
await p.screenshot({ path: join(import.meta.dirname, `sheet-${label}-${width}.png`), fullPage: true })
await b.close()
console.log(files.length, 'frames')

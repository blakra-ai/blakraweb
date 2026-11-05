import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(3000)
const links = await p.$$eval('a', (as) => [...new Set(as.map((a) => a.href))])
console.log(links.join('\n'))
console.log((await p.innerText('body')).slice(0, 6000))
await b.close()

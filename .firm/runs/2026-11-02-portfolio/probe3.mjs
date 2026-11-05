import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(process.argv[2], { waitUntil: 'load', timeout: 60000 })
await p.waitForTimeout(5000)
console.log(await p.evaluate(() => {
 const desc=(e)=>e.tagName+'.'+e.className.toString().slice(0,90)
 const frames=[...document.querySelectorAll('.device-phone-chassis, [class*=browser], [class*=rounded-2xl], [class*=rounded-xl]')].filter(e=>e.getBoundingClientRect().width>250&&e.getBoundingClientRect().height>200)
 return frames.map(f=>{const r=f.getBoundingClientRect();let a=f.parentElement;return [desc(f),Math.round(r.y+scrollY),Math.round(r.width),Math.round(r.height),desc(a),desc(a.parentElement),(a.parentElement.innerText.split('\n').slice(-1)[0]||'').slice(0,80)].join(' || ')}).join('\n')}))
await b.close()

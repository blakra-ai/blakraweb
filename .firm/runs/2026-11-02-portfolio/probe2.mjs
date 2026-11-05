import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(2000)
console.log(await p.innerText('main').catch(()=>p.innerText('body')))
const info = await p.evaluate(() => {
  const out=[]
  for (const el of document.querySelectorAll('*')) {
    const r=el.getBoundingClientRect(); const cs=getComputedStyle(el)
    if (r.width>200 && r.height>300 && (parseFloat(cs.borderRadius)>=20) ) out.push([el.tagName, el.className.toString().slice(0,120), Math.round(r.x),Math.round(r.y+scrollY),Math.round(r.width),Math.round(r.height), cs.borderRadius])
  }
  return {out, imgs:[...document.images].map(i=>i.src), h:document.body.scrollHeight}
})
console.log(JSON.stringify(info,null,1))
await b.close()

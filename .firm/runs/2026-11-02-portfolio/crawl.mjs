import { chromium } from 'playwright-core'
import { writeFile, mkdir } from 'node:fs/promises'
const BASE='https://preview-sandbox--6ae8af05732d2fe49dd36703.base44.app'
const out=new URL('./raw/',import.meta.url).pathname
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
await p.goto(BASE+'/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(5000)
const slugs0=[...new Set(await p.$$eval('a[href*="/work/"]', as=>as.map(a=>new URL(a.href).pathname.split('/work/')[1])))]
const slugs=process.argv.length>2?process.argv.slice(2):slugs0
const all=[]
for (const slug of slugs) {
  await mkdir(out+slug,{recursive:true})
  for (let t=0;;t++){ try { await p.goto(`${BASE}/work/${slug}`, { waitUntil: 'load', timeout: 90000 }); break } catch(e){ if(t>3) throw e; console.log('retry',slug) } }
  await p.waitForTimeout(4000)
  for (let k=0;k<20 && !(await p.innerText('body').catch(()=>'')).includes('THE PROBLEM');k++){ await p.waitForTimeout(5000); if(k%4==3) await p.reload({waitUntil:'load'}).catch(()=>{}) }
  for (let y=0;y<12000;y+=600){ await p.evaluate(y=>scrollTo(0,y),y); await p.waitForTimeout(150) }
  await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(800)
  const text=await p.innerText('main').catch(()=>p.innerText('body'))
  await writeFile(out+slug+'/text.txt', text)
  const figs=await p.$$('.mt-20.space-y-8 figure')
  const shots=[]
  let i=0
  for (const f of figs) {
    i++
    const cap=(await f.$eval('figcaption',e=>e.innerText).catch(()=>''))
    const dev=await f.$('.device-browser, .device-phone-chassis') 
    const target=dev||f
    const kind=dev? (await dev.evaluate(e=>e.classList.contains('device-browser')?'browser':'phone')) : 'figure'
    await target.scrollIntoViewIfNeeded(); await p.waitForTimeout(400)
    await p.evaluate(()=>{for(const e of [document.documentElement,document.body]) e.style.background='transparent'; for (const fg of document.querySelectorAll('.mt-20.space-y-8 figure')){fg.style.background='transparent'; for(const c of fg.querySelectorAll(':scope > div')) c.style.background='transparent'}})
    const file=`${String(i).padStart(2,'0')}-${kind}.png`
    await target.screenshot({ path: out+slug+'/'+file, omitBackground: true, animations:'disabled' })
    const box=await target.boundingBox()
    shots.push({file,kind,caption:cap,w:Math.round(box.width*2),h:Math.round(box.height*2)})
  }
  // hero composite too
  const hero=await p.$('.rounded-3xl')
  if (hero){ await hero.screenshot({path:out+slug+'/00-hero.png'}); }
  all.push({slug,shots})
  console.log(slug, shots.length)
}
await writeFile(out+(process.argv.length>2?'index-b.json':'index.json'), JSON.stringify(all,null,1))
await b.close()

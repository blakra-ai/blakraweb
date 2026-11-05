import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
const root='/home/ashen/Documents/projects/blakraMain', out=root+'/.firm/runs/2026-11-02-portfolio/'
const srv=spawn('npx',['vite','preview','--port','4181','--strictPort'],{cwd:root,stdio:'ignore',detached:true})
for(let i=0;i<50;i++){try{if((await fetch('http://localhost:4181')).ok)break}catch{} await new Promise(r=>setTimeout(r,200))}
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
try{
for (const [w,h,tag] of [[1440,900,'1440'],[390,844,'390']]){
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,reducedMotion:'reduce'})
  const p=await c.newPage()
  await p.goto('http://localhost:4181/?gl=0',{waitUntil:'load'}); await p.waitForTimeout(1500)
  const el=await p.$('#work'); await el.scrollIntoViewIfNeeded()
  for(let y=0;y<4000;y+=400){await p.mouse.wheel(0,400);await p.waitForTimeout(100)}
  await el.screenshot({path:`${out}section-${tag}.png`})
  for (const [slug,l] of [['vitrin-app',''],['nuvoq-vision','/de']]){
    await p.goto(`http://localhost:4181${l}/work/${slug}/`,{waitUntil:'load'}); await p.waitForTimeout(800)
    for(let y=0;y<9000;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(80)}
    await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(500)
    const sw=await p.evaluate(()=>document.documentElement.scrollWidth)
    console.log(tag,slug,'scrollWidth',sw)
    await p.screenshot({path:`${out}page-${slug}${l.replace('/','-')}-${tag}.png`,fullPage:true})
  }
  await c.close()
}} finally {await b.close(); process.kill(-srv.pid)}

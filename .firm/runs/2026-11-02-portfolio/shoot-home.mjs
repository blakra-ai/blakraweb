import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
const root='/home/ashen/Documents/projects/blakraMain', out=root+'/.firm/runs/2026-11-02-portfolio/'
const srv=spawn('npx',['vite','preview','--port','4182','--strictPort'],{cwd:root,stdio:'ignore',detached:true})
for(let i=0;i<50;i++){try{if((await fetch('http://localhost:4182')).ok)break}catch{} await new Promise(r=>setTimeout(r,200))}
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
try{ for (const [w,h] of [[1440,900],[390,844]]){
  const c=await b.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'}); const p=await c.newPage()
  await p.goto('http://localhost:4182/',{waitUntil:'load'}); await p.waitForTimeout(1500)
  for(let y=0;y<20000;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(60)}
  await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(800)
  console.log(w, await p.evaluate(()=>document.documentElement.scrollWidth))
  await p.screenshot({path:`${out}home-${w}.png`,fullPage:true})
  await (await p.$('#work')).screenshot({path:`${out}section-${w}.png`})
  await c.close() } } finally { await b.close(); process.kill(-srv.pid) }

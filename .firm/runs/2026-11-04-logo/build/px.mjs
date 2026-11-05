import { chromium } from '/home/ashen/Documents/projects/blakraMain/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'
const src='data:image/png;base64,'+readFileSync('../../logo/official/13.png').toString('base64')
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); const p = await b.newPage()
const r = await p.evaluate(async (src) => { const i=new Image(); i.src=src; await i.decode(); const c=document.createElement('canvas'); c.width=i.width;c.height=i.height; const x=c.getContext('2d'); x.drawImage(i,0,0); const d=x.getImageData(0,0,i.width,i.height).data; const out=[i.width+'x'+i.height]
 const sx=i.width/2900
 for(let y=Math.round(1250*sx);y<Math.round(1520*sx);y+=1){let xs=[];for(let X=Math.round(1450*sx);X<Math.round(1650*sx);X++){if(d[(y*i.width+X)*4]<128)xs.push(X)} if(xs.length) out.push((y/sx).toFixed(0)+': '+(xs[0]/sx).toFixed(0)+'-'+(xs[xs.length-1]/sx).toFixed(0))}
 out.push('TOP');for(let y=Math.round(380*sx);y<Math.round(700*sx);y+=2){let xs=[];for(let X=Math.round(1450*sx);X<Math.round(1650*sx);X++){if(d[(y*i.width+X)*4]<128)xs.push(X)} if(xs.length) out.push((y/sx).toFixed(0)+': '+(xs[0]/sx).toFixed(0)+'-'+(xs[xs.length-1]/sx).toFixed(0))}
 return out},src)
console.log(r.join('\n')); await b.close()

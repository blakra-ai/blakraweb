import { createRequire } from 'node:module'; const sharp=createRequire('/home/ashen/Documents/projects/blakraMain/package.json')('sharp')
import { readFile, mkdir, stat } from 'node:fs/promises'
const P=JSON.parse(await readFile(new URL('./projects.json',import.meta.url)))
const dst='/home/ashen/Documents/projects/blakraMain/src/assets/work/'
for (const p of P){ await mkdir(dst+p.slug,{recursive:true})
 for (const [i,s] of p.shots.entries()){
  const src=new URL(`./raw/${p.slug}/${s.file}`,import.meta.url).pathname
  const out=`${dst}${p.slug}/${String(i+1).padStart(2,'0')}-${s.kind}.webp`
  let q=82, w=s.kind==='browser'?1920:640
  for(;;){ const info=await sharp(src).resize({width:w}).webp({quality:q,alphaQuality:90,effort:6}).toFile(out); const sz=(await stat(out)).size; if(sz<=122000||q<50){console.log(out.split('/work/')[1],info.width,info.height,q,(sz/1024|0)+'KB'); s.out=out; s.ow=info.width; s.oh=info.height; break} q-=6 }
 }}

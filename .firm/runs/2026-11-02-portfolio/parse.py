import json,re,os,sys
raw='raw'; idx=json.load(open(f'{raw}/index.json'))
if os.path.exists(f'{raw}/index-b.json'):
  b={e['slug']:e for e in json.load(open(f'{raw}/index-b.json'))}; idx=[b.get(e['slug'],e) for e in idx]
res=[]
for e in idx:
  if 'THE PROBLEM' not in open(f"{raw}/{e['slug']}/text.txt").read(): print('skip',e['slug']); continue
  t=open(f"{raw}/{e['slug']}/text.txt").read().split('\n')
  L=[x.strip() for x in t if x.strip()]
  i=L.index('All concept studies')
  cat=L[i+2].split('·',1)[1].strip(); title=L[i+3]; sub=L[i+4]; desc=L[i+5]
  plat=L[L.index('PLATFORMS (DESIGNED FOR)')+1]
  pi=L.index('THE PROBLEM'); problem=L[pi+1]
  di=L.index('THE DESIGN'); ni=L.index('NOTE',di)
  design=[x for x in L[di+1:ni] if not re.fullmatch(r'\d\d',x)]
  nx=L.index('NEXT CONCEPT STUDY') if 'NEXT CONCEPT STUDY' in L else None
  res.append(dict(slug=e['slug'],category=cat,title=title,subtitle=sub,description=desc,platforms=plat,problem=problem,design=design,shots=e['shots'],next=L[nx+1] if nx else None))
json.dump(res,open('projects.json','w'),indent=1,ensure_ascii=False)
with open('inventory.md','w') as f:
  f.write('# Portfolio inventory (crawled 2026-11-02)\n\nSource text kept verbatim for reference; numbers, studio name and "concept study" framing are NOT carried to blakra.us.\n\n')
  for p in res:
    f.write(f"## {p['title']} (`{p['slug']}`)\n- Category: {p['category']}\n- Subtitle: {p['subtitle']}\n- Description: {p['description']}\n- Platforms: {p['platforms']}\n- Problem: {p['problem']}\n- Design:\n"+''.join(f"  {k+1}. {d}\n" for k,d in enumerate(p['design']))+"- Images (raw/"+p['slug']+"/):\n"+''.join(f"  - {s['file']} ({s['kind']}, {s['w']}x{s['h']}): {s['caption']}\n" for s in p['shots'])+"  - 00-hero.png (composite hero, reference only)\n\n")

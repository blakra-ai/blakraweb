import re,sys
d=open('../../logo/official/full.svg').read()
ps=re.findall(r'<path [^>]*/>',d)
ps=[p.replace('fill="#000000"','') for p in ps]
def ty(p): return float(re.search(r'translate\([^,]+,([^)]+)\)',p).group(1))
mark=[p for p in ps if ty(p)<1500]; word=[p for p in ps if ty(p)>=1500]
print(len(mark),len(word))
for name,set_ in [('mark',mark),('word',word),('full',ps)]:
  open(f'raw-{name}.svg','w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2900 2132">'+''.join(set_)+'</svg>')

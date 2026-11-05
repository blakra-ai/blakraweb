import re
d=open('../../logo/official/full.svg').read()
ps=[p.replace(' fill="#000000"','') for p in re.findall(r'<path [^>]*/>',d)]
ty=lambda p: float(re.search(r'translate\([^,]+,([^)]+)\)',p).group(1))
# vtracer dropped the short line under the lower dot (13.png: x~1554, y 1400-1495, tapering down); redrawn as the top line's mirror.
low='<path d="M1548 1402c0-3 12-3 12 0l-4.6 92c-.2 2.4-2.6 2.4-2.8 0z"/>'
mark=[p for p in ps if ty(p)<1500]+[low]; word=[p for p in ps if ty(p)>=1500]
icon=mark[1:7]
S=lambda xs:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2900 2132">'+''.join(xs)+'</svg>'
for n,x in [('mark',mark),('word',word),('full',mark+word),('icon',icon)]: open(f'raw-{n}.svg','w').write(S(x))

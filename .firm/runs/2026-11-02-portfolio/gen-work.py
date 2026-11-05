import json,subprocess,re
P=json.load(open('projects.json'))
dst='/home/ashen/Documents/projects/blakraMain/src/assets/work/'
def dims(f):
  o=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=p=0',f],capture_output=True,text=True).stdout.strip().split(',')
  return int(o[0]),int(o[1])
lines=[]
for p in P:
  shots=[]
  for i,s in enumerate(p['shots']):
    fn=f"{i+1:02d}-{s['kind']}.webp"; w,h=dims(dst+p['slug']+'/'+fn)
    shots.append(f"{{ file: '{fn}', frame: '{s['kind']}', width: {w}, height: {h} }}")
  lines.append(f"  {{ slug: '{p['slug']}', name: '{p['title']}', shots: [{', '.join(shots)}] }},")
open('/home/ashen/Documents/projects/blakraMain/src/content/work.ts','w').write('''/**
 * Selected client work (run 2026-11-02-portfolio): every project was delivered to a private
 * client, who owns the product. Names here are the products' working names as shown in the
 * representative screens; the copy for each lives in the locale files under `work.projects`.
 * Images: src/assets/work/<slug>/<file>, WebP at 2x; width/height are the files' pixels.
 */
export interface WorkShot {
  file: string
  frame: 'phone' | 'browser'
  width: number
  height: number
}
export interface WorkProject {
  slug: WorkSlug
  name: string
  shots: WorkShot[]
}

export const workSlugs = [''' + ', '.join(f"'{p['slug']}'" for p in P) + '''] as const
export type WorkSlug = (typeof workSlugs)[number]

export const work: readonly WorkProject[] = [
''' + '\n'.join(lines) + '''
]

/** Hashed image URLs, keyed by `<slug>/<file>`. */
const urls = import.meta.glob<string>('../assets/work/*/*.webp', { eager: true, query: '?url', import: 'default' })
export function shotUrl(slug: WorkSlug, file: string): string {
  return urls[`../assets/work/${slug}/${file}`]
}
''')

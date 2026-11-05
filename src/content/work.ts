/**
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

export const workSlugs = ['vitrin-app', 'veyra-money', 'vitrin-console', 'flowline-automation', 'helya-ai', 'nuvoq-vision', 'tiravan-logistics', 'raah-learning'] as const
export type WorkSlug = (typeof workSlugs)[number]

export const work: readonly WorkProject[] = [
  { slug: 'vitrin-app', name: 'Vitrin', shots: [{ file: '01-phone.webp', frame: 'phone', width: 640, height: 1358 }, { file: '02-phone.webp', frame: 'phone', width: 640, height: 1358 }, { file: '03-phone.webp', frame: 'phone', width: 640, height: 1358 }] },
  { slug: 'veyra-money', name: 'Veyra', shots: [{ file: '01-phone.webp', frame: 'phone', width: 640, height: 1358 }, { file: '02-phone.webp', frame: 'phone', width: 640, height: 1358 }, { file: '03-phone.webp', frame: 'phone', width: 640, height: 1358 }] },
  { slug: 'vitrin-console', name: 'Vitrin Console', shots: [{ file: '01-browser.webp', frame: 'browser', width: 1920, height: 1309 }] },
  { slug: 'flowline-automation', name: 'Flowline', shots: [{ file: '01-browser.webp', frame: 'browser', width: 1920, height: 1311 }] },
  { slug: 'helya-ai', name: 'Helya', shots: [{ file: '01-browser.webp', frame: 'browser', width: 1920, height: 1309 }] },
  { slug: 'nuvoq-vision', name: 'Nuvoq', shots: [{ file: '01-browser.webp', frame: 'browser', width: 1920, height: 1309 }] },
  { slug: 'tiravan-logistics', name: 'Tiravan', shots: [{ file: '01-browser.webp', frame: 'browser', width: 1920, height: 1311 }, { file: '02-phone.webp', frame: 'phone', width: 640, height: 1356 }] },
  { slug: 'raah-learning', name: 'Raah', shots: [{ file: '01-browser.webp', frame: 'browser', width: 1920, height: 1309 }, { file: '02-phone.webp', frame: 'phone', width: 640, height: 1358 }] },
]

/** Hashed image URLs, keyed by `<slug>/<file>`. */
const urls = import.meta.glob<string>('../assets/work/*/*.webp', { eager: true, query: '?url', import: 'default' })
export function shotUrl(slug: WorkSlug, file: string): string {
  return urls[`../assets/work/${slug}/${file}`]
}

import { describe, expect, it } from 'vitest'
import type { Dict } from '../src/content/types'
import { renderHead } from '../src/head'
import { routes, translatePath } from '../src/routes'

const modules = import.meta.glob<Record<string, Dict>>('../src/content/locales/*.ts', { eager: true })
const dicts = Object.fromEntries(Object.entries(modules).map(([f, m]) => { const c = f.match(/(\w+)\.ts$/)![1]; return [c, m[c]] }))

describe('the About page', () => {
  const about = routes.filter((r) => r.id === 'about')

  it('is an indexable page in every language', () => {
    expect(about.map((r) => r.path).sort()).toEqual(['/about/', '/de/about/', '/es/about/', '/fr/about/'])
    expect(about.every((r) => r.indexable)).toBe(true)
    expect(translatePath(about[0], 'de')).toBe('/de/about/')
  })

  for (const r of routes.filter((x) => x.id === 'about')) {
    it(`${r.locale}: its own title, hreflang and FAQPage structured data`, () => {
      const t = dicts[r.locale]
      const head = renderHead(r, t)
      expect(head).toContain(`<title>${t.meta.aboutTitle.replace(/&/g, '&amp;')}</title>`)
      expect(t.meta.aboutTitle).not.toBe(t.meta.homeTitle)
      expect(head).toContain('hreflang="x-default" href="https://blakra.us/about/"')
      const ld = JSON.parse(head.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])
      const faq = ld['@graph'].find((n: { '@type': string | string[] }) => [n['@type']].flat().includes('FAQPage'))
      expect([faq['@type']].flat()).toEqual(['AboutPage', 'FAQPage'])
      expect(faq.mainEntity).toHaveLength(t.about.faq.length)
      expect(faq.mainEntity[0].acceptedAnswer.text).toBe(t.about.faq[0].a)
    })
  }
})

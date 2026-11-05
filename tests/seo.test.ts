import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Dict } from '../src/content/types'
import { breadcrumbs } from '../src/crumbs'
import { ogImage, renderHead, structuredData } from '../src/head'
import { renderLlms } from '../src/llms'
import { company } from '../src/content/shared'
import { routes } from '../src/routes'

const modules = import.meta.glob<Record<string, Dict>>('../src/content/locales/*.ts', { eager: true })
const dicts = Object.fromEntries(Object.entries(modules).map(([f, m]) => { const c = f.match(/(\w+)\.ts$/)![1]; return [c, m[c]] }))

type Node = Record<string, unknown> & { '@type': string | string[]; '@id'?: string }
const types = (n: Node) => [n['@type']].flat()

/** Every {"@id": …} reference anywhere in the value. */
function refs(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => refs(x, out))
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (Object.keys(o).length === 1 && typeof o['@id'] === 'string') out.push(o['@id'])
    else Object.values(o).forEach((x) => refs(x, out))
  }
  return out
}

/** Keys that would claim something the site does not state (ratings, reviews, prices, people). */
const forbidden = /"(aggregateRating|review|reviewRating|offers|price|telephone|founder|employee|award)"/

describe('structured data', () => {
  for (const r of routes.filter((x) => x.indexable)) {
    it(`${r.path}: one @id-linked graph with the page's own facts`, () => {
      const t = dicts[r.locale]
      const ld = structuredData(r, t) as { '@context': string; '@graph': Node[] }
      expect(ld['@context']).toBe('https://schema.org')
      const graph = ld['@graph']
      const ids = graph.map((n) => n['@id']).filter(Boolean)
      expect(new Set(ids).size).toBe(ids.length)
      // Every reference resolves inside the graph (the logo lives inside the Organization node).
      const known = new Set([...ids, `${company.url}/#logo`])
      for (const id of refs(graph)) expect(known, id).toContain(id)
      expect(JSON.stringify(ld)).not.toMatch(forbidden)

      const org = graph.find((n) => types(n).includes('Organization'))!
      expect(org).toMatchObject({ name: 'BLAKRA', legalName: company.legalName, url: `${company.url}/`, email: company.email, foundingDate: '2024' })
      expect(graph.some((n) => types(n).includes('WebSite'))).toBe(true)

      const page = graph.find((n) => n['@id'] === `${company.url}${r.path}#webpage`)!
      expect(page).toBeDefined()
      expect(page.inLanguage).toBe(r.locale)
      expect((page.primaryImageOfPage as { url: string }).url).toBe(`${company.url}${ogImage(r)}`)

      const crumbs = breadcrumbs(r, t)
      const list = graph.find((n) => types(n).includes('BreadcrumbList'))
      if (r.id === 'home') expect(list).toBeUndefined()
      else {
        const items = list!.itemListElement as { position: number; name: string; item: string }[]
        expect(items.map((i) => i.name)).toEqual(crumbs.map((c) => c.name))
        expect(items.map((i) => i.position)).toEqual(crumbs.map((_, i) => i + 1))
        expect(items.at(-1)!.item).toBe(`${company.url}${r.path}`)
      }

      if (r.id === 'work') {
        const w = graph.find((n) => types(n).includes('CreativeWork'))!
        expect(w.creator).toEqual({ '@id': org['@id'] })
        expect((w.image as { contentUrl: string }[]).length).toBeGreaterThan(0)
        expect(w.description).toBe(t.work.projects[r.slug!].about)
      }
      if (r.id === 'home' || r.id === 'investors') {
        expect(graph.find((n) => types(n).includes('SoftwareApplication'))).toMatchObject({ name: 'LIOXSA', operatingSystem: 'iOS', url: 'https://lioxsa.com' })
      }
    })
  }

  it('is not emitted on noindex pages', () => {
    const r = routes.find((x) => !x.indexable)!
    expect(renderHead(r, dicts[r.locale])).not.toContain('application/ld+json')
  })
})

describe('social previews', () => {
  for (const r of routes.filter((x) => x.indexable)) {
    it(`${r.path}: its own image file, in its language, with Twitter tags`, () => {
      const head = renderHead(r, dicts[r.locale])
      const image = ogImage(r)
      expect(image.startsWith(`/og/${r.locale}/`)).toBe(true)
      const file = readFileSync(new URL(`../public${image}`, import.meta.url))
      expect(file.length).toBeLessThanOrEqual(150 * 1024)
      expect(file.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]))
      expect(head).toContain(`<meta property="og:image" content="https://blakra.us${image}">`)
      expect(head).toContain(`<meta name="twitter:image" content="https://blakra.us${image}">`)
      expect(head.match(/og:locale:alternate/g)).toHaveLength(3)
    })
  }

  it('emits no verification tag without a token', () => {
    expect(renderHead(routes[0], dicts.en)).not.toMatch(/site-verification|msvalidate/)
  })
})

describe('crawler files', () => {
  it('robots.txt allows every page and names the AI search and answer crawlers', () => {
    const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
    expect(robots).not.toMatch(/^Disallow:\s*\S/m)
    for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot']) expect(robots).toContain(`User-agent: ${bot}`)
    expect(robots).toContain('Sitemap: https://blakra.us/sitemap.xml')
  })

  it('llms.txt and llms-full.txt carry the site’s own words and links', () => {
    const t = dicts.en
    const short = renderLlms(t, false)
    const full = renderLlms(t, true)
    expect(short.startsWith('# BLAKRA\n\n> ')).toBe(true)
    expect(short).toContain(company.email)
    expect(short).toContain('https://blakra.us/work/helya-ai/')
    expect(short).toContain('https://blakra.us/llms-full.txt')
    expect(full).toContain(t.about.faq[0].a)
    expect(full).toContain(t.work.projects['nuvoq-vision'].problem)
    expect(full).not.toMatch(/undefined|\[object Object\]/)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Modules read the base when they load, so each test imports them afresh under the stubbed value.
const load = async () => {
  const base = await import('../src/base')
  const r = await import('../src/routes')
  const i18n = await import('../src/i18n')
  const { renderHead } = await import('../src/head')
  const { renderLlms } = await import('../src/llms')
  const { en } = await import('../src/content/locales/en')
  return { ...base, ...r, ...i18n, renderHead, renderLlms, en }
}

describe('under a sub-path (GitHub Pages)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('BASE_URL', '/blakraweb/')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('prefixes links and strips the prefix again', async () => {
    const { withBase, stripBase } = await load()
    expect(withBase('/de/')).toBe('/blakraweb/de/')
    expect(stripBase('/blakraweb/de/')).toBe('/de/')
    expect(stripBase('/blakraweb')).toBe('/')
    expect(stripBase('/blakrawebsite/')).toBe('/blakrawebsite/')
    expect(stripBase('/de/')).toBe('/de/')
  })

  it('links carry the base; routes and files do not', async () => {
    const { pathFor, workPath, translatePath, routes } = await load()
    expect(pathFor('about', 'de', '#x')).toBe('/blakraweb/de/about/#x')
    expect(workPath('helya-ai', 'en')).toBe('/blakraweb/work/helya-ai/')
    const about = routes.find((r) => r.id === 'about' && r.locale === 'en')!
    expect(about.path).toBe('/about/')
    expect(about.file).toBe('about/index.html')
    expect(translatePath(about, 'fr')).toBe('/blakraweb/fr/about/')
  })

  it('resolves the page and language from a prefixed or a bare path', async () => {
    const { resolveRoute, localeFromPath } = await load()
    expect(localeFromPath('/blakraweb/de/about/')).toBe('de')
    expect(resolveRoute('/blakraweb/de/about/')).toMatchObject({ id: 'about', locale: 'de' })
    expect(resolveRoute('/blakraweb/')).toMatchObject({ id: 'home', locale: 'en' })
    expect(resolveRoute('/blakraweb')).toMatchObject({ id: 'home', locale: 'en' })
    expect(resolveRoute('/blakraweb/index.html')).toMatchObject({ id: 'home', locale: 'en' })
    expect(resolveRoute('/de/about/')).toMatchObject({ id: 'about', locale: 'de' })
    expect(resolveRoute('/blakraweb/de/nope/')).toMatchObject({ id: 'notFound', locale: 'de' })
  })

  it('SEO stays on blakra.us; only the local files move', async () => {
    const { routes, renderHead, renderLlms, en } = await load()
    for (const r of routes.filter((x) => x.locale === 'en')) {
      const head = renderHead(r, en)
      const absolute = head.match(/https:\/\/blakra\.us[^"\s]*/g) ?? []
      expect(absolute.length).toBeGreaterThan(0)
      expect(absolute.filter((u) => u.includes('blakraweb'))).toEqual([])
      expect(head).toContain('href="/blakraweb/favicon.svg"')
      expect(head).toContain('href="/blakraweb/site.webmanifest"')
    }
    expect(renderLlms(en, true)).not.toContain('blakraweb')
    expect(renderLlms(en, false)).not.toContain('blakraweb')
  })
})

describe('at the root (blakra.us)', () => {
  it('changes nothing', async () => {
    vi.resetModules()
    const { withBase, stripBase, pathFor, resolveRoute } = await load()
    expect(withBase('/de/')).toBe('/de/')
    expect(stripBase('/de/')).toBe('/de/')
    expect(pathFor('home', 'en')).toBe('/')
    expect(resolveRoute('/de/about/')).toMatchObject({ id: 'about', locale: 'de' })
  })
})

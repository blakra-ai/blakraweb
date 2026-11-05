import { describe, expect, it } from 'vitest'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import type { Dict } from '../src/content/types'
import { work, workSlugs } from '../src/content/work'
import { resolveRoute, routes, translatePath, workPath } from '../src/routes'

const modules = import.meta.glob<Record<string, Dict>>('../src/content/locales/*.ts', { eager: true })
const locales = Object.entries(modules).map(([file, mod]) => {
  const code = file.match(/(\w+)\.ts$/)![1]
  return [code, mod[code]] as const
})

describe('selected client work', () => {
  it('every project has one page per language, resolvable and translatable', () => {
    for (const slug of workSlugs)
      for (const [code] of locales) {
        const path = workPath(slug, code as never)
        const route = resolveRoute(path)
        expect(route.id).toBe('work')
        expect(route.slug).toBe(slug)
        expect(route.indexable).toBe(true)
        expect(translatePath(route, 'de')).toBe(workPath(slug, 'de'))
      }
    expect(routes.filter((r) => r.id === 'work')).toHaveLength(workSlugs.length * locales.length)
  })

  for (const [code, t] of locales) {
    it(`${code}: copy for every project and one caption per screen`, () => {
      expect(Object.keys(t.work.projects).sort()).toEqual([...workSlugs].sort())
      for (const p of work) expect(t.work.projects[p.slug].shots).toHaveLength(p.shots.length)
    })

    it(`${code}: private-client framing only — no source studio, no concept-study label, no figures`, () => {
      const text = JSON.stringify(t.work)
      expect(text).not.toMatch(/noyan|base44|concept stud|konzeptstudie|étude de concept|estudio de concepto/i)
      // Descriptive copy only: no digits anywhere in the section's text.
      expect(text).not.toMatch(/\d/)
    })
  }

  it('images exist, stay under ~120 KB and match their declared size', () => {
    for (const p of work)
      for (const s of p.shots) {
        const file = join(__dirname, '../src/assets/work', p.slug, s.file)
        expect(statSync(file).size).toBeLessThanOrEqual(125_000)
        expect(s.width).toBeGreaterThan(0)
        expect(s.height).toBeGreaterThan(0)
      }
  })
})

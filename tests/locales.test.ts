import { describe, expect, it } from 'vitest'
import type { Dict } from '../src/content/types'
import { en } from '../src/content/locales/en'

const modules = import.meta.glob<Record<string, Dict>>('../src/content/locales/*.ts', { eager: true })
const locales = Object.entries(modules).map(([file, mod]) => {
  const code = file.match(/(\w+)\.ts$/)![1]
  return [code, mod[code]] as const
})
const codes = locales.map(([code]) => code)

/** Every leaf path with its value type, and every array with its length. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))]
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
  return [`${path}:${typeof value}`]
}

// Character budgets for text in fixed-width controls.
const budgets = (t: Dict): [string, string, number][] => {
  return [
    ['ui.cta', t.ui.cta, 22],
    ...Object.entries(t.contact.doors).map(([k, d]): [string, string, number] => [`contact.doors.${k}.label`, d.label, 30]),
  ]
}

// Copy in a tight layout (the hero's facts, the status chip, the phone-only short lines, the two
// card titles): no language runs more than 15 % over English (run 2026-11-06-polish).
const tight = (t: Dict): [string, string][] => [
  ['prologue.facts', t.prologue.facts],
  ['products.stage.working', t.products.stage.working],
  ['products.title', t.products.title],
  ['products.items.skin.lineShort', t.products.items.skin.lineShort],
  ['pulse.bodyShort', t.pulse.bodyShort],
  ['engine.ledeShort', t.engine.ledeShort],
  ['ai.ledeShort', t.ai.ledeShort],
  ['process.title', t.process.title],
]

describe('locales', () => {
  it('ships all four languages', () => {
    expect(codes.sort()).toEqual(['de', 'en', 'es', 'fr'])
  })

  for (const [code, t] of locales) {
    it(`${code}: same keys, value types and list lengths as English`, () => {
      expect(shape(t)).toEqual(shape(en))
    })

    it(`${code}: no empty strings`, () => {
      const empty = shape(t).filter((p) => p.endsWith(':string')).map((p) => p.replace(/:string$/, ''))
      const get = (obj: unknown, path: string) => path.split(/\.|\[|\]/).filter(Boolean).reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj)
      expect(empty.filter((p) => !String(get(t, p)).trim())).toEqual([])
    })

    it(`${code}: labels fit their controls`, () => {
      const over = budgets(t).filter(([, text, max]) => text.length > max).map(([k, text, max]) => `${k} (${text.length}/${max}): ${text}`)
      expect(over).toEqual([])
    })

    it(`${code}: tight-layout copy stays within 15 % of English`, () => {
      const source = Object.fromEntries(tight(en))
      const over = tight(t).filter(([k, text]) => text.length > Math.round(source[k].length * 1.15)).map(([k, text]) => `${k} (${text.length}, English ${source[k].length}): ${text}`)
      expect(over).toEqual([])
    })

    it(`${code}: the contact field asks the question the page has been asking`, () => {
      expect(t.contact.doors.commission.msg).toBe(t.pulse.ask)
    })

    it(`${code}: nothing the owner keeps off the site`, () => {
      const text = JSON.stringify(t)
      expect(text).not.toMatch(/Gartner/) // FACTS.md: deliberately absent
      expect(text).not.toMatch(/[\u0600-\u06ff]/) // no Persian anywhere
    })
  }
})

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

// Character budgets for text that sits in fixed SVG boxes (see the comments in types.ts).
const budgets = (t: Dict): [string, string, number][] => {
  const s = t.scenes
  return [
    ['stock.title', s.stock.title, 24], ['stock.store', s.stock.store, 8], ['stock.chip', s.stock.chip, 26], ['stock.chipSub', s.stock.chipSub, 40],
    ['routes.live', s.routes.live, 20], ['routes.delivered', s.routes.delivered, 14], ['routes.proof', s.routes.proof, 22], ['routes.sheet', s.routes.sheet, 18],
    ...s.routes.calls.map((c, i): [string, string, number] => [`routes.calls[${i}]`, c, 22]),
    ['documents.title', s.documents.title, 20], ['documents.sub', s.documents.sub, 34],
    ...s.documents.rows.flatMap((r, i): [string, string, number][] => [[`documents.rows[${i}].title`, r.title, 22], [`documents.rows[${i}].sub`, r.sub, 24]]),
    ['line.line', s.line.line, 8], ['line.alert', s.line.alert, 32], ['line.now', s.line.now, 8], ['line.report', s.line.report, 22], ['line.reportNote', s.line.reportNote, 34],
    ['queue.title', s.queue.title, 20], ['queue.sub', s.queue.sub, 16], ['queue.auto', s.queue.auto, 28],
    ...s.queue.messages.map((m, i): [string, string, number] => [`queue.messages[${i}]`, m, 28]),
    ['queue.answered', s.queue.answered, 14], ['queue.returned', s.queue.returned, 14], ['queue.person', s.queue.person, 13],
    ['ui.cta', t.ui.cta, 22],
    ...Object.entries(t.contact.doors).map(([k, d]): [string, string, number] => [`contact.doors.${k}.label`, d.label, 30]),
  ]
}

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

    it(`${code}: scene labels fit their boxes`, () => {
      const over = budgets(t).filter(([, text, max]) => text.length > max).map(([k, text, max]) => `${k} (${text.length}/${max}): ${text}`)
      expect(over).toEqual([])
    })
  }
})

import { createContext, useContext, type ReactNode } from 'react'
import type { Dict } from './content/types'

/**
 * Languages. English lives at the root, others under their prefix. Adding a
 * language means one locale file in src/content/locales/ and one line here.
 */
export const locales = {
  en: { label: 'English', short: 'EN', lang: 'en', og: 'en_US', prefix: '' },
  de: { label: 'Deutsch', short: 'DE', lang: 'de', og: 'de_DE', prefix: '/de' },
  fr: { label: 'Français', short: 'FR', lang: 'fr', og: 'fr_FR', prefix: '/fr' },
  es: { label: 'Español', short: 'ES', lang: 'es', og: 'es_ES', prefix: '/es' },
} as const

export type Locale = keyof typeof locales
export const localeCodes = Object.keys(locales) as Locale[]

export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/')[1]
  return availableLocales.find((l) => l !== 'en' && l === first) ?? 'en'
}

/** Locale files are loaded per page, so each visitor downloads one language. */
const loaders = import.meta.glob<{ [k: string]: Dict }>('./content/locales/*.ts')

/** Locales that have a file, in the order of `locales` (the same on server and client). */
export const availableLocales: Locale[] = localeCodes.filter((l) => `./content/locales/${l}.ts` in loaders)

export async function loadDict(locale: Locale): Promise<Dict> {
  const mod = await loaders[`./content/locales/${locale}.ts`]()
  return mod[locale]
}

interface I18n {
  locale: Locale
  t: Dict
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: dict }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n outside I18nProvider')
  return value
}

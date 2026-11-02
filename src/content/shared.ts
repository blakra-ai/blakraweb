import type { ChapterId, LayerId, NeedId, ProductId, StageId } from './types'

/**
 * Facts that are the same in every language: names, numbers, platforms, links.
 * Edit them here once. Anything marked DRAFT is a placeholder to replace before
 * launch (they are all listed in src/content/FACTS.md).
 */

// As stated on the live blakra.us (2026-10-26) and confirmed by the owner, founded in 2024.
// The legal entity, its address and phone: owner, 2026-10-27 (footer, Legal notice, Privacy).
export const company = {
  name: 'BLAKRA',
  legalName: 'BLAKRA LLC',
  address: { street: '901 H St Ste 120', city: 'Sacramento', region: 'CA', postalCode: '95814-1817', country: 'US' },
  phone: '+1 (279) 300-9011',
  url: 'https://blakra.us',
  email: 'hello@blakra.us',
  founded: 2024,
  /** Promised reply time, in hours (the copy says it in words). */
  replyHours: 24,
  /**
   * Only accounts BLAKRA owns (they show in the footer and as sameAs in the structured data).
   * Empty since 2026-10-27: github.com/blakra belongs to someone else, and the LinkedIn and
   * X pages the old site linked do not exist (FACTS.md).
   */
  social: [] as readonly { label: string; href: string }[],
} as const

export interface ChapterFacts {
  id: ChapterId
  /** Outcome values; their labels are translated in each locale. */
  outcomes: readonly string[]
  stack: readonly string[]
  /** Engine layers this system runs on. */
  layers: readonly LayerId[]
}

// The five systems, in the order they launch in the film. Source for every number: src/content/FACTS.md.
export const chapters: readonly ChapterFacts[] = [
  { id: 'h06', outcomes: ['40%', '3 h'], stack: ['React', 'Node.js', 'PostgreSQL', 'POS + QuickBooks'], layers: ['automation', 'data', 'apps'] },
  { id: 'h09', outcomes: ['20%'], stack: ['React', 'Mapbox', 'Node.js routing', 'React Native'], layers: ['automation', 'data', 'apps'] },
  { id: 'h13', outcomes: ['24/7'], stack: ['Python OCR', 'React', 'AWS S3', 'SendGrid'], layers: ['ai', 'data', 'apps'] },
  { id: 'h17', outcomes: ['Live'], stack: ['MQTT', 'TimescaleDB', 'React', 'WebSockets'], layers: ['data', 'apps'] },
  { id: 'h22', outcomes: ['65%'], stack: ['LLM', 'Order API', 'Context routing', 'Slack'], layers: ['ai', 'automation', 'data'] },
]

/** Top to bottom, the way the column is drawn: crown (AI) down to root (cloud and backend). */
export const layerOrder: readonly LayerId[] = ['ai', 'growth', 'apps', 'design', 'automation', 'data', 'cloud']

/**
 * Chakra index (0 root … 6 crown) for each layer, and its colour: the chakra's own, root red to
 * crown violet, the same as its band in the film's disk and its lotus.
 */
export const chakraOf: Record<LayerId, number> = { cloud: 0, data: 1, automation: 2, design: 3, apps: 4, growth: 5, ai: 6 }
export const chakraColors = ['#e8352b', '#f57a1f', '#f7c21b', '#2fb35a', '#2a9fe0', '#4248c2', '#9a4fd0'] as const

export const layerTech: Record<LayerId, readonly string[]> = {
  ai: ['LLMs', 'Retrieval', 'OCR', 'Evaluation'],
  growth: ['Technical SEO', 'Content', 'Analytics', 'Media production'],
  apps: ['React', 'React Native', 'iOS', 'Android'],
  design: ['Research', 'UX', 'Interface design', 'Design systems'],
  automation: ['Workflows', 'Bots', 'Queues', 'Routing'],
  data: ['PostgreSQL', 'TimescaleDB', 'REST and webhooks', 'MQTT'],
  // Source: the live site's infrastructure layer (multi-cloud Kubernetes, CI/CD, edge deployment).
  cloud: ['Node.js', 'Kubernetes', 'CI/CD', 'Multi-cloud'],
}

/**
 * The pulse: what each need takes, root to crown, and the case study that shows it
 * (null: only client work under NDA, listed under "Also delivered"). Each proof case
 * runs on the need's top layer, so the lit column and the card agree.
 */
export const needs: Record<NeedId, { layers: readonly LayerId[]; proof: ChapterId | null }> = {
  panel: { layers: ['cloud', 'data', 'design', 'apps'], proof: 'h17' },
  shop: { layers: ['cloud', 'data', 'automation', 'design', 'apps', 'growth'], proof: null },
  assistant: { layers: ['cloud', 'data', 'automation', 'apps', 'ai'], proof: 'h22' },
  aidata: { layers: ['cloud', 'data', 'automation', 'ai'], proof: 'h13' },
  app: { layers: ['cloud', 'data', 'design', 'apps'], proof: 'h09' },
  warehouse: { layers: ['cloud', 'data', 'automation', 'apps'], proof: 'h06' },
  bots: { layers: ['cloud', 'data', 'automation'], proof: 'h22' },
}

/** The needs in the order they are offered. */
export const needOrder: readonly NeedId[] = ['panel', 'shop', 'assistant', 'aidata', 'app', 'warehouse', 'bots']

/** The highest layer a need takes: where its light stops, and the layer the engine marks. */
export const needTop = (id: NeedId): LayerId => needs[id].layers.reduce((a, b) => (chakraOf[b] > chakraOf[a] ? b : a))

export interface ProductFacts {
  id: ProductId
  name: string
  stage: StageId
  platforms: readonly string[]
  layers: readonly LayerId[]
  /** Product page; empty hides the link. */
  href: string
  draft: boolean
}

// The owner's own products. LIOXSA named by the owner 2026-11-02 (app screens + lioxsa.com privacy policy).
export const products: readonly ProductFacts[] = [
  { id: 'skin', name: 'LIOXSA', stage: 'working', platforms: ['iOS'], layers: ['ai', 'data', 'apps'], href: 'https://lioxsa.com', draft: false },
]

export interface PersonFacts {
  id: string
  name: string
  known?: string
  /** Path under public/, e.g. /team/ashen.jpg. Empty uses the drawn portrait. */
  photo: string
}

export const people: readonly PersonFacts[] = [
  { id: 'ashen', name: 'Hamid Reza Alizadeh', known: 'Ashen', photo: '' },
  { id: 'mehdi', name: 'Mehdi Jannatipour', photo: '' },
  { id: 'habib', name: 'Habiburahman Karokhi', photo: '' },
]


import type { LayerId, NeedId, ProductId, StageId } from './types'
import type { WorkSlug } from './work'

/**
 * Facts that are the same in every language: names, numbers, platforms, links.
 * Edit them here once. Anything marked DRAFT is a placeholder to replace before
 * launch (they are all listed in src/content/FACTS.md).
 */

// As stated on the live blakra.us (2026-10-26) and confirmed by the owner, founded in 2024.
// The legal entity and its address: owner, 2026-10-27 (footer, Legal notice, Privacy). The phone
// number was removed by the owner on 2026-11-02 and is no longer kept in the code.
export const company = {
  name: 'BLAKRA',
  legalName: 'BLAKRA LLC',
  address: { street: '901 H St Ste 120', city: 'Sacramento', region: 'CA', postalCode: '95814-1817', country: 'US' },
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
 * The pulse: what each need takes, root to crown, and the client project nearest to it in
 * "Selected client work" (src/content/work.ts); the picker links to that project's card.
 */
export const needs: Record<NeedId, { layers: readonly LayerId[]; work: WorkSlug }> = {
  panel: { layers: ['cloud', 'data', 'design', 'apps'], work: 'vitrin-console' },
  shop: { layers: ['cloud', 'data', 'automation', 'design', 'apps', 'growth'], work: 'vitrin-app' },
  assistant: { layers: ['cloud', 'data', 'automation', 'apps', 'ai'], work: 'helya-ai' },
  aidata: { layers: ['cloud', 'data', 'automation', 'ai'], work: 'helya-ai' },
  app: { layers: ['cloud', 'data', 'design', 'apps'], work: 'veyra-money' },
  warehouse: { layers: ['cloud', 'data', 'automation', 'apps'], work: 'vitrin-app' },
  bots: { layers: ['cloud', 'data', 'automation'], work: 'flowline-automation' },
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

/**
 * The AI section's two ways to build: the models and platforms we work with, named as tools, not
 * as partners (owner, 2026-11-02; run 2026-11-02-company-content, draft.md §1).
 */
export const aiTools = {
  open: ['Llama', 'Mistral', 'Qwen', 'Whisper'],
  platforms: ['OpenAI', 'Anthropic Claude', 'Google Gemini', 'Azure', 'AWS', 'Google Cloud'],
} as const

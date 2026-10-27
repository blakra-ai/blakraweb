/**
 * The shape of one language. Every locale file (src/content/locales/*.ts) must
 * satisfy it, so a missing or extra line is a type error, not a silent gap.
 *
 * Lengths in comments are layout budgets: scene labels sit inside fixed SVG
 * boxes, so translations must stay within them (checked in tests/locales.test.ts).
 */

/** The seven layers of a complete product, root to crown: everything BLAKRA builds. */
export type LayerId = 'cloud' | 'data' | 'automation' | 'design' | 'apps' | 'growth' | 'ai'
export type ChapterId = 'h06' | 'h09' | 'h13' | 'h17' | 'h22'
/** What a visitor can say they need, in the work types BLAKRA delivers. */
export type NeedId = 'panel' | 'shop' | 'assistant' | 'aidata' | 'app' | 'warehouse' | 'bots'
export type ProductId = 'skin'
export type StageId = 'working'
export type Intent = 'commission' | 'partner' | 'invest'

export interface ChapterText {
  /** One word for the business, on the card and on the track's index. */
  industry: string
  sector: string
  system: string
  moment: string
  before: string
  now: string
  /** Labels for the outcome values in shared.ts, same order. */
  outcomes: string[]
}

export interface SceneText {
  stock: {
    /** ≤ 24 chars */ title: string
    /** ≤ 8 chars, followed by a two-digit number */ store: string
    /** ≤ 26 chars */ chip: string
    /** ≤ 40 chars */ chipSub: string
  }
  routes: {
    /** ≤ 20 chars */ live: string
    /** ≤ 14 chars */ delivered: string
    /** ≤ 22 chars */ proof: string
    /** ≤ 18 chars */ sheet: string
    /** three phone calls, ≤ 22 chars each */ calls: [string, string, string]
  }
  documents: {
    /** ≤ 20 chars */ title: string
    /** ≤ 34 chars */ sub: string
    /** five rows: title ≤ 22, sub ≤ 24 */ rows: [Row, Row, Row, Row, Row]
  }
  line: {
    /** ≤ 8 chars, followed by a number */ line: string
    /** ≤ 32 chars */ alert: string
    /** ≤ 8 chars */ now: string
    /** ≤ 22 chars */ report: string
    /** ≤ 34 chars */ reportNote: string
  }
  queue: {
    /** ≤ 20 chars */ title: string
    /** ≤ 16 chars */ sub: string
    /** ≤ 28 chars */ auto: string
    /** six customer messages, ≤ 28 chars each */ messages: [string, string, string, string, string, string]
    /** ≤ 14 chars */ answered: string
    /** ≤ 14 chars */ returned: string
    /** ≤ 13 chars */ person: string
  }
}

interface Row {
  title: string
  sub: string
}

export interface Dict {
  meta: {
    homeTitle: string
    homeDescription: string
    investorsTitle: string
    investorsDescription: string
    privacyTitle: string
    privacyDescription: string
    legalTitle: string
    legalDescription: string
    notFoundTitle: string
    ogAlt: string
  }
  ui: {
    skip: string
    home: string
    nav: { work: string; engine: string; products: string; people: string; investors: string }
    cta: string
    pauseMotion: string
    /** The header's menu button (below 1100 px). */
    menu: string
    motion: string
    on: string
    off: string
    language: string
    newTab: string
    builtWith: string
    before: string
    now: string
    usesEngine: string
  }
  prologue: {
    eyebrow: string
    /** The H1 is `before` + `human` (set in italic) + `after`; `after` carries its own leading space. */
    title: { before: string; human: string; after: string }
    lede: string
    /** The second action: jumps to the pulse question. */
    cue: string
    /** Short line before the partner and sponsor links in the hero. */
    also: string
    /** Confirmed facts under the actions, separated by " · ". */
    facts: string
  }
  /** Why one team, and the one-tap question that tailors the page to the visitor. */
  pulse: {
    eyebrow: string
    title: string
    body: string
    ask: string
    /** What the visitor needs: the label in their words (it also starts the message) and a short tag. */
    needs: Record<NeedId, { label: string; tag: string }>
    all: string
    allTag: string
    takes: string
    verdict: string
    verdictAll: string
    proof: string
    everyProject: string
    tell: string
  }
  day: {
    srTitle: string
    eyebrow: string
    title: string
    lede: string
    hint: string
    /** Client work that can be described but not shown: one short line each, no numbers. */
    delivered: { title: string; note: string; items: string[] }
  }
  chapters: Record<ChapterId, ChapterText>
  scenes: SceneText
  engine: {
    eyebrow: string
    title: string
    lede: string
    layers: Record<LayerId, { name: string; text: string }>
    /** The one place the name is explained: black hole and chakra. */
    symbol: string
    usedAt: string
    everywhere: string
    crownTitle: string
    crownText: string
    crownSource: string
    /** Marks the layer the visitor picked in the pulse. */
    focus: string
  }
  process: {
    eyebrow: string
    title: string
    lede: string
    steps: [Step, Step, Step]
    /** Commitments in a contract's plain words. */
    terms: [string, string, string, string, string]
    shapes: string
    /** Who we are not for: saying no is part of saying yes. */
    notFit: string
  }
  products: {
    eyebrow: string
    title: string
    lede: string
    stage: Record<StageId, string>
    items: Record<ProductId, { line: string; detail: string; offer: string }>
    platforms: string
    /** Label of the card row that says what is on offer. */
    offer: string
    /** Beside the products: the others, discussed under NDA. */
    more: string
    open: string
    investorsLink: string
  }
  people: {
    eyebrow: string
    title: string
    lede: string
    roles: [Person, Person, Person]
    bench: string
  }
  contact: {
    eyebrow: string
    title: string
    lede: string
    doorsLabel: string
    doors: Record<Intent, Door>
    email: string
    submitting: string
    success: string
    failure: string
    privacy: string
    privacyLink: string
    /** Under the form: the event horizon. */
    horizon: string
    noScript: string
    direct: string
    errors: { org: string; email: string; emailFormat: string; msg: string; msgLong: string }
  }
  footer: {
    line: string
    investors: string
    privacy: string
    /** The provider identification page: Legal notice, Impressum, Mentions légales, Aviso legal. */
    legal: string
    /** Before the email link, for specialists who want to join a project. */
    join: string
  }
  investors: {
    eyebrow: string
    title: string
    lede: string
    thesisTitle: string
    thesis: [string, string, string]
    productsTitle: string
    askTitle: string
    ask: string
    ndaTitle: string
    /** What a serious party receives under NDA. */
    deck: string
    cta: string
    note: string
    disclaimer: string
  }
  privacy: {
    eyebrow: string
    title: string
    updated: string
    /** Who the controller is; the company's name, address and email follow it. */
    whoTitle: string
    who: string
    sections: { heading: string; text: string }[]
    questions: string
  }
  /** Provider identification; the facts themselves are in shared.ts (company). */
  legal: {
    eyebrow: string
    title: string
    providerTitle: string
    contactTitle: string
    emailLabel: string
    phoneLabel: string
    country: string
  }
  notFound: { eyebrow: string; title: string; text: string; back: string }
}

interface Step {
  name: string
  text: string
}

interface Person {
  role: string
  owns: string
  /** The question to bring to this person. */
  ask: string
}

interface Door {
  label: string
  hint: string
  org: string
  msg: string
  placeholder: string
  submit: string
}

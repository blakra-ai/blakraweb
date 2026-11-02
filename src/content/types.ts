import type { WorkSlug } from './work'
/**
 * The shape of one language. Every locale file (src/content/locales/*.ts) must
 * satisfy it, so a missing or extra line is a type error, not a silent gap.
 *
 * Lengths in comments are layout budgets: scene labels sit inside fixed SVG
 * boxes, so translations must stay within them (checked in tests/locales.test.ts).
 */

/** The seven layers of a complete product, root to crown: everything BLAKRA builds. */
export type LayerId = 'cloud' | 'data' | 'automation' | 'design' | 'apps' | 'growth' | 'ai'
/** What a visitor can say they need, in the work types BLAKRA delivers. */
export type NeedId = 'panel' | 'shop' | 'assistant' | 'aidata' | 'app' | 'warehouse' | 'bots'
export type ProductId = 'skin'
export type StageId = 'working'
export type AiBlockId = 'agents' | 'documents' | 'extraction' | 'vision' | 'training' | 'evaluation'
export type Intent = 'commission' | 'partner' | 'invest'

/** One project of the selected client work: descriptive copy only, no figures (run 2026-11-02-portfolio). */
export interface WorkText {
  /** What kind of system it is, a few words (card and page eyebrow). */
  category: string
  /** The one-line subtitle under the name. */
  line: string
  /** Who it is for and what it does, two sentences. */
  about: string
  platforms: string
  problem: string
  /** The design decisions, one sentence each. */
  design: string[]
  /** One caption per screen, in the order of `shots` in work.ts; also the image's alt text. */
  shots: string[]
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
    aboutTitle: string
    aboutDescription: string
    notFoundTitle: string
    ogAlt: string
  }
  ui: {
    skip: string
    home: string
    nav: { work: string; engine: string; products: string; people: string; about: string }
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
    tell: string
    /** The dots' text twin on the stage: "Uses layers 1, 2, 3, 7". */
    uses: string
    /** The porcelain screen's ring caption: "Your choice, remembered". */
    remembered: string
  }
  work: {
    eyebrow: string
    title: string
    lede: string
    /** The private-client framing, shown on the section and on every project page. */
    note: string
    /** One line under the grid: further industries, short form. */
    also: string
    noteTitle: string
    /** Page title suffix and description lead for a project page. */
    metaSuffix: string
    all: string
    problem: string
    design: string
    platforms: string
    engagement: string
    screens: string
    next: string
    projects: Record<WorkSlug, WorkText>
  }
  /** AI on the home page, after the seven layers (run 2026-11-02-company-content). */
  ai: {
    eyebrow: string
    title: string
    lede: string
    blocks: Record<AiBlockId, { name: string; text: string }>
    /** The two ways to build: open-source models and commercial platforms. */
    twoWays: string
    open: { name: string; text: string }
    platforms: { name: string; text: string }
    closer: string
    cta: string
    /** After LIOXSA's name in the vision block. */
    ourProduct: string
  }
  engine: {
    eyebrow: string
    title: string
    lede: string
    layers: Record<LayerId, { name: string; text: string }>
    /** The one place the name is explained: black hole and chakra. */
    symbol: string
    usedAt: string
    crownTitle: string
    crownSource: string
    /** Marks the layer the visitor picked in the pulse. */
    focus: string
    /** The stage's counter: "Layers in orbit 03 / 07" and, with a pick, "It takes 04 / 07". */
    inOrbit: string
    itTakes: string
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
    /** The error summary's title above the form (d-05-form-states). */
    errorsTitle: string
    errors: { org: string; email: string; emailFormat: string; msg: string; msgLong: string }
  }
  /**
   * The Navigator's voice: the typed line in the hero and at contact only (owner, 2026-11-02);
   * on the paper sections her eyes read the section heading instead.
   */
  navigator: {
    name: string
    lines: Record<'hero' | 'contact', string>
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
    /** The second direct way to reach us (the contact form), for the Impressum. */
    formLabel: string
    formLink: string
    country: string
    /** Third-party work used on the site, with its licence (the Navigator's model is CC BY). */
    creditsTitle: string
    credits: string
  }
  /** The /about page. */
  about: {
    eyebrow: string
    title: string
    story: [string, string, string, string]
    leadershipTitle: string
    trustTitle: string
    trust: string[]
    engageTitle: string
    engage: Step[]
    industriesTitle: string
    industries: string[]
    nda: string
    faqTitle: string
    faq: { q: string; a: string }[]
    joinTitle: string
    join: string
    cta: string
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

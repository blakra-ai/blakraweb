# SEO and AI search plan — prioritised (2026-11-03)

## Research basis (current practice, sources with dates)
- Google Search Essentials (spam policies: cloaking, hidden text, keyword stuffing, doorways) — developers.google.com/search/docs/essentials, checked 2026.
- Organization structured data (logo, contactPoint, sameAs, legalName, address, foundingDate): Google docs, guidance updated Nov 2023; no specific rich result but feeds the knowledge panel/logo.
- FAQPage rich results restricted to well-known government and health sites since Aug 2023 (Google Search Central blog, 2023-08-08). Keep FAQPage (valid, consumed by Bing and LLM answer engines) but expect no Google rich result.
- Google "Simplifying the search results page" (June 2025) retired several little-used rich result types; Breadcrumb, Organization, Software App, Article, Product remain. Breadcrumb display on mobile was simplified (Jan 2025) but BreadcrumbList is still parsed.
- SoftwareApplication rich result needs `offers` (price) or `aggregateRating`; LIOXSA has neither public price nor ratings, so we mark it up for entity understanding only and do NOT invent either.
- ProfessionalService/LocalBusiness: only for a place customers visit; BLAKRA is fully remote and its address is a registered office, so we use Organization with address, not LocalBusiness.
- AI crawlers (vendor docs 2024–2025): OpenAI GPTBot (training), OAI-SearchBot (ChatGPT search), ChatGPT-User (user fetch); Anthropic ClaudeBot (training), Claude-SearchBot (search), Claude-User (user fetch); PerplexityBot, Perplexity-User; Google-Extended (Gemini training/grounding token, does not affect Search or AI Overviews, which use Googlebot); Applebot / Applebot-Extended; CCBot (Common Crawl, used by many models). Owner goal is to be cited: allow all.
- llms.txt (proposal by J. Howard, Sep 2024; llmstxt.org): markdown index for LLMs. Google says it does not use it (2025); some agents and IDE tools fetch it. Cheap, harmless, factual: ship it.
- IndexNow (indexnow.org; Bing, Yandex, Seznam, Naver; not Google): needs a key file at the root; owner generates the key at deploy time.
- Sitemaps: Google uses `lastmod` only when consistently accurate (Search Central blog, 2023-06); image sitemap extension still supported; hreflang in sitemap OK.

## Plan (all four locales)
| P | Item | Where |
|---|---|---|
| P1 | One @id-linked JSON-LD @graph per page: Organization (#organization, logo 512 px ImageObject, contactPoint email, address, foundingDate, founder-free, knowsAbout), WebSite (#website, inLanguage list, publisher), WebPage subtype (WebPage / AboutPage / CollectionPage for investors / WebPage for legal+privacy), BreadcrumbList (all non-home pages), FAQPage (about, mainEntity of the AboutPage), SoftwareApplication LIOXSA (investors + home, iOS, url lioxsa.com, no price/rating), CreativeWork per work page (name, description, image, creator=#organization, genre=category). | src/head.ts |
| P2 | Per-page OG/Twitter: og:type article for work, og:locale:alternate, twitter:title/description/image, unique og:image:alt; generated 1200x630 images per locale for home, about, investors and every work page (52 files, JPEG <=150 KB) via the existing Playwright `npm run og` pipeline, committed to public/og/. | scripts/og.mjs, src/head.ts, public/og/ |
| P3 | Sitemap: lastmod from git history of the page's content files (not build date), image:image for work screenshots and OG images; hreflang kept. | scripts/prerender.mjs |
| P4 | robots.txt with explicit allow groups for search/answer and training bots + sitemap. | public/robots.txt |
| P5 | public/llms.txt + llms-full.txt generated at build from the en dictionary and shared facts (no hand-copied claims). | scripts/prerender.mjs |
| P6 | Visible breadcrumbs on work and about pages (nav aria-label, ol), mirrored in BreadcrumbList; work pages link to About and back to Work. | src/pages/WorkPage.tsx, About.tsx, locale `ui` strings |
| P7 | Verification placeholders documented in FACTS.md (google-site-verification, msvalidate.01, IndexNow key) — no fake tokens in code. | FACTS.md |
| P8 | Tests: head graph validity (every @id reference resolves, required props per type, no rating/review), robots/llms presence. | tests/seo.test.ts |

Not doing (white-hat): no LocalBusiness, no aggregateRating/review, no hidden text, no per-keyword landing pages, no FAQ added solely for markup.

## Result (implemented 2026-11-03 on top of c91f76d "Mobile: …")
- P1–P8 done. validator.schema.org: 0 errors on home, about, investors, privacy, legal, work (en) and de/fr/es samples.
- Lighthouse 13.6 mobile: SEO 100, a11y 100, BP 100 on /, /de/, /about/, /work/helya-ai/. Performance A/B in the same session, 4 runs each (noisy machine): baseline / 92.3, /de/ 88.3; after / 90.8, /de/ 89.5 — within noise.
- html-validate: no findings from the new markup; pre-existing findings remain (React camelCase attrs `hrefLang`/`fetchPriority`, `useId` ids, two "Primary" nav landmarks, lowercase doctype).

# SEO / AI-search audit — blakra.us (built from dfdb2bc, 2026-11-03)

Method: `npm run build`, then read `dist/` (52 indexable URLs = 13 pages x 4 locales, plus 4 x 404).

## What is already right
| Area | Finding |
|---|---|
| Crawlability without JS | Every route is prerendered; home carries ~1,540 words of real text in the HTML. No JS needed to read content. |
| Titles / descriptions | Unique per page and locale (dictionary `meta.*`; work pages built from project copy). |
| Canonical + hreflang | Self-canonical; hreflang en/de/fr/es + x-default (en) in head and sitemap, reciprocal. |
| 404 | `noindex`, own file per locale. |
| URL structure | Clean, lowercase, trailing slash, locale prefix (`/de/…`). |
| Headings | One h1 per page; h2/h3 nest logically on home, about, work. |
| Images | Content images have alt, width, height, lazy loading; hero still is decorative (`alt=""`). |
| lang | `<html lang>` set per locale. All locales are LTR (no `dir` needed). |
| robots.txt | Allows all, lists sitemap. |

## Gaps (ranked by impact)
| # | Gap | Impact |
|---|---|---|
| G1 | Structured data is fragmentary: Organization only on home (no `@id`, logo is a 180 px touch icon, no contactPoint), FAQPage on about. No WebSite, no WebPage subtypes, no BreadcrumbList, no SoftwareApplication for LIOXSA, no CreativeWork per work page. Entities are not linked, so Google/LLMs cannot join "BLAKRA" across pages. | High (entity understanding, logo in knowledge panel, breadcrumbs in SERP) |
| G2 | One OG image (`/og.png`, English, 160 KB) for all 52 URLs; og:image:alt identical everywhere; no `og:locale:alternate`; no `twitter:title/description/image`; og:type `website` on articles. | High for social/AI-chat link previews |
| G3 | Sitemap `lastmod` = build date for every URL (Google ignores lastmod that is not consistently accurate). No `image:image` entries for the work screenshots. | Medium |
| G4 | No AI crawler policy beyond `*`; no `llms.txt` / `llms-full.txt`. Allowed by default, but explicit groups document intent and survive a future stricter `*`. | Medium (citation in ChatGPT / Perplexity / Claude) |
| G5 | No visible breadcrumbs on work or about pages; work pages link only to "next project", not to related capabilities/about. | Medium (internal linking, breadcrumb rich result) |
| G6 | No Search Console / Bing verification hook or IndexNow key; owner must supply tokens. | Medium (operational) |
| G7 | Home title leads with "Operations software" — fine; entity description differs slightly between meta, OG and Organization (all reuse `homeDescription`, which is good; keep one source). | Low |
| G8 | Organization `logo` should be a square/rectangular image >= 112x112 on a crawlable URL; 180 px touch icon meets the minimum but a 512 px icon exists. | Low |

## Core Web Vitals
Not regressed by any of this: JSON-LD is a non-executing script; OG images are not loaded by the page. Baseline Lighthouse is measured in Phase 2 before changes (see plan).

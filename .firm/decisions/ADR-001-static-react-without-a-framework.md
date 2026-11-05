# ADR-001: Static React with Vite and a 60-line prerenderer, no framework
Date: 2026-10-26 · Status: accepted
Confidence: high
Prediction: every page ships complete HTML (16 pages, 4 languages); Lighthouse SEO stays 100 and no hydration errors appear in production.
Review by: 2026-12-15
Outcome: pending

## Context
A company site: 4 pages × 4 languages, served as static files by the owner's nginx. SEO matters (it replaces an indexed site), and so does heavy client-side motion.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| React Router 8 framework mode, prerender | routing, conventions | a major version released weeks before; a router 4 pages don't need |
| Astro + React islands | minimal JS | the motion system spans the whole page, so most of it would be one big island |
| Vite + `react-dom/server` + a small prerender script | full control, nothing extra to learn or upgrade | own code for head tags, sitemap and locale routes |

## Decision
Vite 8 with React 19: a client build, an SSR build, and `scripts/prerender.mjs`, which renders each route into `dist/<route>/index.html`. Pages are separate documents, so cross-document View Transitions do the navigation.

## Consequences
Head tags, hreflang and the sitemap are generated in our own code (`src/head.ts`, the prerender). Adding a page means one route entry.

## Revisit if
The site grows beyond about 10 page types or needs server-rendered dynamic data.

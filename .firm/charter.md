# Charter — BLAKRA website (blakra.us)
Last verified: 2026-10-26 (run 2026-10-26-narrative-v5). Read at the start of every firm task, so keep it short.

## Product
Company site for BLAKRA: one engineering company that builds complete digital products (design, web and mobile, backends, bots, enterprise AI and custom assistants, SEO and media), plus its own products. Three audiences, three doors: clients commission systems, partners collaborate, investors join the ecosystem. Big idea: "Software with gravity." The page is a descent through a black hole, one visitor question per station; the seven 3D lotus chakras on its spin axis are the seven layers of a product (cloud, data, automation, design, apps, growth, AI).

## Stack & versions
React 19.3.1, Vite 8.3.5, TypeScript 7.0.2, three 0.186.1, postprocessing 6.39.5, GSAP 3.15.0 (+ @gsap/react 2.1.2; small triggers only), Lenis 1.3.27 (on by default; ?smooth=native turns it off), Vitest 5.0.5, playwright-core 1.64.1 with system Chrome. Fonts: Geist, Geist Mono, Newsreader italic (self-hosted latin). No UI framework, no router; CSS Modules plus global tokens.

## Commands
| Purpose | Command | Status |
|---|---|---|
| dev | `npm run dev` | client render only; no prerender |
| build | `npm run build` | ✓ 2026-10-26: 16 pages + sitemap |
| test | `npm test` | ✓ 2026-10-26: 92 pass |
| typecheck | `npm run typecheck` | ✓ 2026-10-26: clean |
| e2e | `npm run e2e` (after build; spawns preview on 4174) | ✓ 2026-10-27: 106/106 |
| og image | `npm run og` | ✓ |
| lint | none configured | — |

## Architecture map
| Module | Paths | Notes |
|---|---|---|
| Content | `src/content/shared.ts`, `locales/{en,de,fr,es}.ts`, `types.ts`, `FACTS.md` | `Dict` type enforces parity; scene label budgets in tests |
| Routing/SSG | `src/routes.ts`, `src/i18n.tsx`, `src/head.ts`, `src/entry-*.tsx`, `scripts/prerender.mjs` | per-locale dictionary chunk preloaded |
| Motion | `src/motion/MotionProvider.tsx`, `sticky.ts`, `pulse.ts`, `schedule.ts`, `useMotionSetup.ts`, `useStage.ts`, `useReveals.ts` | Lenis smooth scroll without pins or snapping; sticky held sections; smoothed camera scroll position; anchor glide; one IntersectionObserver for reveals |
| 3D world | `src/motion/world/*` (three.js), `src/motion/engine3d/{stage,path,frame}.ts`, `components/StageFallback.tsx` | lazy-loaded; two layers + screen-space lens; governor; no capable GPU → three.js never loads, a still poster (`stage-poster*.jpg`) stays; `?gl=force`, `?q=0…4`, `?profile` |
| Sections | `src/components/{Hero,Pulse,DayTrack,Engine,Products,Process,People,Contact}.tsx`, `src/visuals/` | one station per visitor question; each sets a pose and scene state |
| Form backend | `server/contact.gs` (Apps Script) | Sheet first, mail cap 40/day |
| Deploy | `deploy/nginx.conf.example`, `deploy/blakra-headers.conf` | not applied by us |

## Conventions
- Content never depends on motion: prerendered HTML is the final state; motion adds the "before". Reduced motion or the switch removes scrubbing, sticky holding and Lenis.
- Text is never animated through partial opacity (contrast); entrances start fully hidden or move by transform only.
- Every scroll must change something: sections register a stage pose and scene state (`useStage`); held (sticky) sections drive the pose from their progress (`hold` + `live`).
- Never take over the scroll: no pins, no snapping, no `backdrop-filter` over the canvas; held sections get their height from CSS, so the page height does not change while the reader scrolls.
- New copy goes into all four locale files; facts go into `shared.ts` and `FACTS.md`.

## Non-negotiables
- No invented numbers, clients or testimonials (user). Placeholder products are flagged DRAFT and listed in FACTS.md.
- No Persian on the site (user, 2026-10-26). Languages: en, de, fr, es.
- Never deploy, and never call the real contact endpoint from tests.

## Known open issues
- The live blakra.us form cannot deliver (its CSP blocks script.google.com). The new form needs `server/contact.gs` deployed as a new version. — high
- Placeholder products and the "bench" and seed-round lines need the owner's real content. — medium
- Without `VITE_CONTACT_ENDPOINT` at build time the form shows only an email line, with no doors (UX review U7). — low

## Risk map (raises verification depth)
- Contact form and Apps Script: untrusted input, PII, mail quota.
- 3D stage: GPU cost, battery, accessibility of motion.
- Public claims: FACTS.md.
- SEO of a live domain: hreflang, sitemap, canonical.

## Project specialists
None yet. The repo now has real code: run `/firm:start refresh` to create `proj-motion` (3D stage, scroll choreography, governor) and `proj-content` (facts register, four-language copy).

| Agent | Expertise | Consult when | Last researched |
|---|---|---|---|

## Definition of Done additions
- `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` all pass.
- Lighthouse mobile: performance ≥ 90; accessibility, best practices and SEO 100.
- Home page ≤ 12 screens at 1440×900 with motion on.
- Real-GPU check on the owner's machine: headless Chrome with `--use-angle=vulkan --enable-features=Vulkan` renders on the Intel UHD; static frames at 60 fps.

## Review calibration (do not flag)
- `aria-pressed` with a constant "Pause motion" label is intended (a toggle-button pattern).
- The Apps Script URL in the bundle is public by design; abuse is handled server-side.

## Glossary
- Engine — BLAKRA's seven layers of a product (cloud … AI), drawn as 3D lotus chakras on the black hole's spin axis.
- Pulse — the one-tap "What do you need built?"; lights the layers that need takes, links its proof, starts the contact message.
- Doors — the contact form's three intents: commission, partner, invest.

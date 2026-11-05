# Plan — BLAKRA "One working day"

## Stack (npm registry, 2026-10-26)
- React 19.3.1, react-dom 19.3.1; Vite 8.3.5 with @vitejs/plugin-react 6.1.2; TypeScript 7.0.2 (type check only, Vite transpiles).
- GSAP 3.15.0 (ScrollTrigger, SplitText; free under the Standard licence, gsap.com/standard-license) with @gsap/react 2.1.2 `useGSAP`.
- Lenis 1.3.27 on the GSAP ticker (`autoRaf:false`, `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`).
- Raw WebGL2 sky, one full-screen triangle, about 3 KB, no three.js. WebGPU is not needed for a gradient field, and WebGL2 is universal.
- Fonts self-hosted through @fontsource-variable: Geist (system voice), Newsreader italic (human voice), Geist Mono (clock). Latin subsets, `font-display: swap`, preloaded.
- CSS: global tokens plus CSS Modules, no utility framework, because bespoke art direction reads cleaner as authored CSS.
- Tests: Vitest 5 (logic), Playwright-core 1.64 with the system Chrome (screens, reduced motion, keyboard, no-JS), Lighthouse 13.5 (budgets).

## Rendering
- Static generation without a framework: `vite build` (client), then `vite build --ssr src/entry-server.tsx`, then `scripts/prerender.mjs` renders each route with `react-dom/server` into `dist/<route>/index.html` (title, meta, OG, JSON-LD, preload tags per route). The client hydrates with `hydrateRoot`.
- Pages are separate documents. Navigation is a normal link, enhanced by cross-document View Transitions (`@view-transition { navigation: auto }`, progressive). Reason: 3 pages don't justify a client router. React Router v8 just shipped a major version (registry 8.5.0); a dependency we don't need is risk we don't need.
- nginx: `try_files $uri $uri/ =404; error_page 404 /404.html;` with long-cache hashed assets (example in `deploy/nginx.conf.example`; no deploy).

## Motion architecture
- `MotionProvider`: one source of truth for "motion allowed" = `!prefers-reduced-motion && userToggle`. It owns Lenis and GSAP registration, and everything else reads it.
- `gsap.matchMedia()` contexts: `(min-width: 900px) and motion`: pinned chapters with scrubbed scenes. `(max-width: 899px) and motion`: unpinned scenes scrubbed as they pass. `reduce`: nothing is created and scenes render their final state through a CSS class.
- Sky: fixed canvas behind content. Palettes are keyframed by section; interpolation happens only inside the hour interstitials (which hold only large numerals), so body text always sits on a keyframe palette with known contrast. Global `--ink` tokens switch with the palette luminance. It is paused when hidden, frozen under reduced motion, rendered at half resolution with DPR ≤ 1.5, and initialized after first paint. Fallback: CSS gradients per section (also the no-JS look).
- Scenes: SVG, 600×600 viewBox, transform-only animation. Each scene is "pieces with a before transform and an after layout" plus one signature effect (route draw, scan beam, alert pulse, resolve ticks, PO chip).
- Text: SplitText by lines with a mask (aria auto), headings only. Body copy fades and rises; it is never split.
- A day rail (desktop) and the header clock show scroll time and double as chapter navigation.

## Work packages (single writer: the lead, in order)
- WP1 Scaffold: package.json, Vite and TS config, SSG pipeline, tokens, fonts, base CSS, routes, a hello page prerendered. Check: build + HTML grep.
- WP2 Content: `src/content/site.ts` (all copy, typed) + the facts register.
- WP3 Static layout: every section, all pages, responsive, no motion. Check: no-JS screenshots at 4 widths.
- WP4 Motion system: MotionProvider, Lenis, sky shader + palettes + contrast test, clock and day rail.
- WP5 Scenes and chapter timelines: the 5 scenes, the prologue, the interstitials.
- WP6 Contact form: validation, honeypot, timing, states, endpoint env, `server/contact.gs`, tests.
- WP7 SEO and polish: meta, JSON-LD, sitemap, robots, OG image (PNG rendered by script), favicon, 404, View Transitions.
- WP8 Verify: Vitest, Playwright matrix, Lighthouse; review by ux-designer, code-reviewer, security-engineer (form); then the verifier; then fixes.

## Risks
- Pinned scroll on mobile Safari → unpinned on narrow screens; test on the 375 px emulation.
- Scroll-scrubbed motion becoming decoration again → every animation must show a before→after of a real case study, or it is cut.
- Hydration mismatch (clock, motion state) → render deterministic markup and read media queries in effects only.
- Performance: GSAP + React ≈ 110–130 KB gz. LCP is prerendered text, and the shader starts after the load event.

## Critique outcome
- O1 form can show success while leads are lost — accepted. Confirmed: the live CSP `connect-src 'self' https://api.base44.com` blocks script.google.com, so the live form cannot deliver. New form: CORS POST with `text/plain` (no preflight); `server/contact.gs` returns JSON `{ok}`; success shows only on `ok`, otherwise an error with mailto. One real end-to-end submission before launch, with the owner's approval.
- O2 spam is blocked only in the browser — accepted. The honeypot and elapsed time go in the payload and `contact.gs` enforces them, plus length checks and a daily cap. Redeploying the script is a launch blocker in the handoff.
- O3 case-study details could be invented — accepted. `src/content/FACTS.md` gives every claim a source (live-site text or the owner) and a status. Scene labels are illustrative and carry no numbers except the confirmed outcomes.
- O4 the hero reveal hurts LCP — accepted. The prologue H1 is never hidden: no entrance animation, only an exit-on-scroll effect. Before-states apply only below the fold. Only Geist is preloaded.
- O5 the only CTA is at the end — accepted. Persistent header CTA plus one in the prologue, through `lenis.scrollTo`, focusing the contact heading.
- O6 toggling motion loses the reader's place — accepted. Contexts rebuild on toggle, the active chapter is restored, and the choice is persisted.
- O7 contrast during transitions — accepted. Interstitials are at least 100svh, mixing happens only while they cover the viewport, and a test covers the 25/50/75% blends for the large numerals (3:1) under the live-ink switching rule.

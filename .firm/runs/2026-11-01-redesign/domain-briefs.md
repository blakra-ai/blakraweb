# Domain briefs, blakra.us redesign
Checked 2026-11-01. Tags: [V] fetched/read this session; [S] search-snippet or secondary only; [U] UNCONFIRMED, from memory, verify before relying.
Pinned (package.json): react 19.3.1, vite 8.3.5, typescript 7.0.2, three 0.186.1, @react-three/fiber 9.8.1, gsap 3.15.0, lenis 1.3.27, vitest 5.0.5, playwright-core 1.64.1.

## 1. Web art direction for award-level sites
1. Scoring is design 40 / usability 30 / creativity 20 / content 10; the page does not define the criteria or mention accessibility. Spend effort on design and usability first. [V] https://www.awwwards.com/about-evaluation/ (2026-11-01)
2. Treat accessibility as a usability floor, not a bonus. Text needs 4.5:1, large text (>=24px, or >=18.5px bold) 3:1. Verify both palette colours on every surface, including over imagery. [V] https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html (2026-11-01)
3. Non-text UI (focus rings, controls) needs 3:1 (SC 1.4.11), and focus must be visible (2.4.7). [S] https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html (2026-11-01)
4. Motion craft: animate only transform/opacity; keep UI motion under about 300 ms; ease-out by default; skip animation on high-frequency actions; keep it interruptible; swap to a fade under prefers-reduced-motion. [V] https://emilkowal.ski/ui/great-animations (2026-11-01)
5. Scroll-jacking harms control, discoverability and task success. Keep native scroll positions, and let Lenis smooth them, never replace them. Do not pin sections for long stretches. [S] https://www.nngroup.com/articles/scrolljacking-101/ (2026-11-01; publication date UNCONFIRMED, not 2023-verified)
6. Invisible details (hit areas, focus states, micro-interaction polish): fetch failed (HTTP 500). [U] https://rauno.me/craft/invisible-details
7. Type system: one variable display face (Newsreader, with optical size axis, large sizes only), Geist for text, Geist Mono for labels. Use a single modular ratio (e.g. 1.25 or 1.333), body measure 45-75 characters, and size-adjusted fallbacks. [U] general craft; source https://web.dev/articles/optical-size-axis (not fetched)
8. Two-colour palette plus one accent, used only for the action and the story's turning point. [U] no citable source; this is house rule, not a verified jury rule.
9. One world: every section advances one narrative, and the 3D model and stills are evidence of that story, not decoration. Hero: one headline, one CTA, nav visible and keyboard reachable. [U] opinion; verify against 3 to 5 recent Awwwards SOTD pages (https://www.awwwards.com/websites/sites_of_the_day/). Not examined.

## 2. Motion and 3D in the browser
1. GSAP is free including commercial use and all former Club plugins (SplitText, MorphSVG). Not allowed: no-code animation builders competing with Webflow, and reverse engineering. Terms last updated 2025-05-30. [V] https://gsap.com/standard-license/ (2026-11-01)
2. Lenis + GSAP: `lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t*1000))`; `gsap.ticker.lagSmoothing(0)`. Leave `autoRaf` false when GSAP drives it (one loop only). [V] https://github.com/darkroomengineering/lenis (1.3.27 docs; 2026-11-01)
3. Nested scroll areas: `data-lenis-prevent` (variants -wheel/-touch/-vertical/-horizontal). `allowNestedScroll` costs a DOM check per scroll event. `anchors: true` is needed for in-page links. [V] same URL.
4. three: r181 changed indirect specular, so rough PBR looks a bit brighter; recheck light and env intensities. r183 moved the RoomEnvironment position. [V] https://github.com/mrdoob/three.js/wiki/Migration-Guide (2026-11-01; last 14k characters unread)
5. r187 rebuilds PMREM on cube render targets and removes CubeUVReflectionMapping, which only matters when upgrading past 0.186. PCFSoftShadowMap is deprecated from r182. [V] same URL.
6. R3F: `frameloop="demand"` plus `invalidate()` (a flag, coalesced to one frame). Drive dpr with PerformanceMonitor. [V] https://r3f.docs.pmnd.rs/advanced/scaling-performance (2026-11-01)
7. CSS scroll-driven animations: Chrome/Edge 115, Safari 26. Firefox stable is flag-only (secondary claim). Use only as progressive enhancement. [S] https://developer.chrome.com/docs/css-ui/scroll-driven-animations ; https://www.buildmvpfast.com/blog/css-scroll-driven-animations-replace-js-2026
8. View Transitions support matrix, SkinnedMesh bounds, KTX2/meshopt specifics, the 16 ms iGPU budget, backdrop-filter cost, INP/LCP thresholds (about 200 ms and 2.5 s): [U] not verified. Fetches of web.dev and developer.chrome.com returned 403. https://web.dev/articles/inp

## 3. Frontend engineering for this stack
1. TypeScript 7.0 (native Go port) shipped 2026-07-08. It has no programmatic API until about 7.1. `baseUrl` is removed (TS5102). `@typescript/typescript6` lets 6.x run alongside. [S] https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (page not opened; only search excerpts)
2. `erasableSyntaxOnly` dates from TS 5.8 and forbids enums and parameter properties. No 7.0 change found. [S] https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly (not fetched)
3. Vite 8 (stable 2026-03-12) uses Rolldown by default. Node needs to be 20.19+ or 22.12+. [V] https://vite.dev/blog/announcing-vite8 (via search results 2026-11-01)
4. React: npm `latest` is 19.3.1. I found no official 19.3 release notes, and the project has no React Compiler plugin. Don't assume compiler behaviour. [V] `npm view react dist-tags` (2026-11-01). [U] https://react.dev/blog
5. Prerender: render each section the same on server and client (no Date/Math.random/window reads in the first render). Gate WebGL behind a mounted flag. [U] pattern; https://react.dev/reference/react-dom/client/hydrateRoot
6. nginx headers exist in /home/ashen/Documents/projects/blakraMain/deploy/blakra-headers.conf (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy). Re-declare them in any location that sets its own add_header. The CSP has `script-src 'self'` plus a hash, so no inline scripts and no CDN. [V] local file.
7. Fonts: self-host WOFF2, `font-display: swap` or `optional`, subset Latin plus the DE/FR/ES accents, and set `size-adjust` fallbacks to cut CLS. [U] https://web.dev/articles/font-best-practices
8. Lighthouse 100/100/100 and mobile performance >=90, i18n parity testing, and Playwright with system Chrome: [U] no source checked. Parity is best done as a key-set diff test over the four locales.

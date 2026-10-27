# BLAKRA site rebuild — "One working day"
**Goal:** Replace blakra.us with a new React site that tells one true story, with motion that carries the argument, so a buyer of custom software trusts BLAKRA enough to start a conversation.
**Tier:** T3 for scale and craft (new project, bespoke motion, public launch, multi-session). The architecture itself is simple (3 static pages), so one design pass plus one critique, not competing architects.

## The idea (why this story)
The live site *performs* being a tech company: fake live telemetry, neon, 15 sections, numbers that contradict each other. The new site *shows the work*. Its whole length is one working day, 05:58 to 23:59. Each hour is a real system BLAKRA shipped, and each scene animates the actual change: the workaround (paper, calls, spreadsheets) reorganizing into the system that replaced it. The motion is the case study. The light of the day (a WebGL sky) moves from pre-dawn to night as you scroll, so atmosphere and narrative are the same mechanism.

Typography carries the same duality: a serif italic for the human moment ("The support team has gone home"), a precise grotesk for the system, and a mono clock for time.

## Structure (content amount is deliberate: 1 claim, 5 proofs, 3 answers, 1 action)
1. **Prologue, 05:58.** H1 "We build the systems your day runs on." One line on what BLAKRA is. Cue: follow one working day.
2. **The day.** 06:00 retail · 09:00 dispatch · 13:00 insurance · 17:00 factory · 22:00 support. Each one: moment, before, now, outcome, stack, plus a scroll-scrubbed scene.
3. **Behind every hour.** What we build (4), How a project runs (3), Who builds it (3 people).
4. **Tomorrow, 06:00.** Contact form: "What should run on its own tomorrow?"
5. Secondary pages: `/investors` (thesis, deck request, disclaimer), `/privacy`, `404`.

## Acceptance criteria
- AC1 Given the production build served as static files, Then `/`, `/investors/`, `/privacy/` and `/404.html` each contain their full copy in the HTML (verify: build, then grep the HTML for every chapter heading with JS off).
- AC2 Given `prefers-reduced-motion: reduce` (or the on-page motion toggle off), Then no pinning, scrubbing, smooth scrolling or shader animation runs, and every scene shows its final state (verify: Playwright with emulated reduced motion; assert no `pin-spacer`, Lenis is not active, and the full page is screenshotted).
- AC3 Given Lighthouse mobile on the production build, Then performance ≥ 90, accessibility = 100, best practices ≥ 95, SEO = 100 (verify: `npx lighthouse` against `vite preview`).
- AC4 Given every number and claim on the site, Then each one lives in `src/content/` and traces to the user-confirmed facts below (verify: review the content file against this spec).
- AC5 Given the contact form, When input is valid, Then it POSTs `{org,email,msg}` to the configured endpoint and shows success; When input is invalid, Then an inline, announced error appears and nothing is sent; When the honeypot is filled or the form is submitted in under 3 s, Then nothing is sent (verify: unit tests plus a Playwright run with the endpoint intercepted; the real endpoint is never called in tests).
- AC6 Given any section, Then body text contrast is ≥ 4.5:1 and large text and graphics ≥ 3:1 against its sky palette (verify: unit test over every palette and ink pair).
- AC7 Given widths 375, 768, 1440 and 1920, Then there is no horizontal scroll and no overlapping text (verify: Playwright screenshots plus a `scrollWidth <= innerWidth` assertion).
- AC8 Given keyboard only, Then every link, the day rail, the motion toggle and the form are reachable with visible focus, and a skip link works (verify: Playwright tab-order run).

## Confirmed facts (user, 2026-10-26)
- No headline stats (no founding year, team size, client count, countries, uptime).
- All five case studies are real and may be shown anonymized, with the outcomes the live site states: retail 40% fewer stockouts and 3 hours saved daily; dispatch 20% more deliveries per shift; support 65% of queries automated; insurance and factory are qualitative.
- Team shown by name: Hamid Reza Alizadeh (Ashen), Founder & CTO; Mehdi Jannatipour, Backend lead; Habiburahman Karokhi, Operations & compliance (US). No years of experience (they are numbers).
- Investor content moves to a separate `/investors` page linked from the footer.
- Carried over from the live site as the company's own offers (flag in handoff for confirmation): a free first conversation and technical assessment; a reply within one business day; three engagement shapes (fixed scope, embedded engineers, dedicated squad); raising a seed round.

## Non-goals
- Blog or insights (no articles exist), the 20-item project grid, the R&D "lab", robotics as a service line, a custom cursor, deploying to the server.

## Edge cases
- WebGL unavailable or context lost → CSS gradient sky per section.
- JS disabled → prerendered page, static per-section backgrounds, form posts natively? No: the Apps Script endpoint is no-cors JSON. Without JS the form shows a mailto fallback line.
- Narrow phones (320 px), landscape phones, very tall screens, 200% zoom.
- Slow connection: text paints before fonts and before the shader.

## Decisions
- Story "one working day" — strongest fit with five real projects; turns proof into narrative (lead, user granted full creative freedom).
- Keep the existing Google Apps Script endpoint for the form, behind an env var; ship a hardened `server/contact.gs` for server-side validation (lead: zero new infra; the live endpoint already works).
- Company name BLAKRA kept (lead: renaming is a one-way door the user didn't ask for).

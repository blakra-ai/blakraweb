## Result
blakra.us now introduces BLAKRA as a real engineering company, in plain language and with checkable claims. The new headline is "We build what *organizations run on*." The tagline "Software with gravity." moves to the line above the headline and the footer. The black hole and chakra stay in the visuals and are explained once.

The site serves the owner's three goals in order:
1. brand and trust;
2. client projects;
3. sponsors or buyers for BLAKRA's own products.

All four languages are updated.

## How it was decided
- **Owner interview:** 15 questions, answers in `owner-answers.md`. Four follow-ups were answered on 2026-10-27:
  - support after launch: yes, by agreement;
  - the skin-analysis AI is working and ready;
  - it is written from scratch, and images are never sent to outside services;
  - on offer: sponsorship, a license, or outright sale with source code and IP.
- **Strategy review** (`strategy.md`): position on "Built to run" and lead with client work. Products serve as proof and as the second door. Plain language; the metaphor stays in the visuals.
- **Trust audit** (`psych.md`): the biggest risk was unconfirmed claims shown as fact (the four placeholder products with "Live" badges, a seed round, a deck). Next came "everything" claims that the three-principal team model contradicted, then metaphor overload.
- **Engineer-writer** (`copy-deck.md`): the full copy, key by key, with the pulse mapping and the structural changes.
- **Translations:** native German, French and Spanish, one translator per language.

## What changed
- **Hero:** new H1 and lede, plus a fact strip "Founded 2024 · Fully remote · Reply within 24 hours". The sponsor link goes to the sponsors page.
- **What do you need built:** eight options in the client's words: admin panel, online shop, AI assistant, AI on your own data, mobile app, warehouse or database system, bots, a complete system.
  - Each option lights its layers.
  - Each links the case that shows it, or "Also delivered" when there is none.
  - Each starts the contact message.
  - The orbit note and the layer count are gone.
- **Proof:** new title and a confidentiality line. The moment lines no longer depend on time of day. A new "Also delivered" panel lists the owner's own list of work (seven items, no names, links or numbers). The day sections now carry their tone colours; the progress rail had been invisible without them.
- **Seven layers:**
  - The eyebrow is "Capabilities".
  - The chakra labels are gone; the colour dots remain.
  - One caption explains the name.
  - No "engine every project inherits".
  - The Gartner line now gives Gartner's own causes.
  - The list reads root first, so the highlight moves down as the scroll climbs (owner report).
- **Products:** the four placeholder products and the roadmap are removed. In their place: one real product card for the skin-analysis AI (abstract preview, status, layers, what is on offer) and an NDA card for the other products.
- **How we work:**
  - "Scope the problem" replaces "Map the weight".
  - Nothing implies on-site work.
  - Support after launch is under a written agreement.
  - A fifth term: an NDA before you share details.
- **People:** the team model is stated as fact: three principals lead each project, specialists join under BLAKRA's contract, and everyone works remotely.
- **Contact:** the doors are "Commission a project", "Partner with us" and "Sponsor or buy a product". The line under the form is "Read by an engineer, not a sales team."
- **Sponsors and buyers page** (was Investors, same URL): no seed round, deck or data room. It now has:
  1. the thesis as three lines;
  2. the products;
  3. what is on offer;
  4. what you receive under NDA;
  5. the founder as contact.
- **Footer:** a "join a project" line.
- **Privacy:** it now says what the form really records (time, page and language as well) and that enquiries go to a Google Sheet, and it states a 12-month retention default.
- **Behaviour fix:** content that changes height after load (the pulse answer opening) now triggers a re-measure of every held section and pose. Before, the engine and the day track read stale positions after a pulse answer, so links into them lit the wrong row.
- **Layout fixes:**
  - The French and Spanish H1 second lines were shortened to fit two lines.
  - Long words in page titles hyphenate.
  - On phones, the product table stacks its cells (in French it had widened the page by 6 px).
- **Records:** FACTS.md has the new confirmed rows and open items; placeholder rows are removed. The e2e checks follow the new structure.

## Evidence
Final build, 2026-10-27:
- typecheck clean; unit tests 92/92; build 16 pages + sitemap.
- e2e 106/106: no-JS copy on all 16 routes in four languages; reduced motion; form (endpoint mocked); overflow at 375 px; keyboard; 11.9 screens; pulse; no pins; short screens; software-GPU fallback; no console errors.
- Lighthouse mobile:
  - `/` 92
  - `/de/` 89, 93 and 91 over three runs
  - `/investors/` 95
  - accessibility, best practices and SEO 100 on all three
- No horizontal overflow on 64 pages (375, 768, 1440, 1920 × four languages × four pages).
- Real GPU (owner's Intel UHD, Vulkan):
  - every station renders, with no errors;
  - still frames at 60 fps (p95 16.7 ms) at the hero, engine, products and contact;
  - wheel scrolling: p50 16.7 ms, 8.7% of frames over 20 ms;
  - proof track alone: 6–7% of frames over 20 ms, none over 50 ms (55–66% before the second smoothness pass).
- e2e found two real bugs, both fixed and re-verified:
  - **Stale scroll positions after the pulse answer opened.** The page now re-measures when its height changes.
  - **A resting cursor took the highlight from a layer a link had just opened.** Only a cursor that actually moves picks a row now.

## Open items for the owner
- The legal entity (name, jurisdiction, registration number). Until then, the footer says "BLAKRA" and Privacy has no "Who we are" section.
- The skin AI's real product name and platforms. The default is "Skin analysis AI", with the platforms row hidden.
- Confirm the NDA package (demo, architecture walkthrough, code review) and the 12-month retention.
- Optional, to raise credibility: per-case year, duration and measurement method; photos and LinkedIn for the principals; two clients willing to give references under NDA.

## Not verified / risks
- The Spanish H1 takes three lines at 900 px width. It still reads cleanly and doesn't overflow; at 1440 it is two lines.
- The translations were checked for types, layout budgets and overflow, not by a native reviewer.

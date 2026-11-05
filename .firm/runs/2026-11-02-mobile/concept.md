# Phone-first art direction: blakra.us at 390 px

Run 2026-11-02-mobile. Art direction only: src/ was not touched, because another engineer is reordering sections there.
Inputs: `.firm/runs/2026-11-02-company-content/shots/home-390.png` (390 × 13,796 px ≈ 16.3 screens of 844 px, captured in the **old** section order), `products-after-390.png`, `src/styles/global.css`, `src/content/locales/en.ts`.
Prototype: `proto/index.html` (screens 01–04 at 390), frames `proto-1..4.png`, scroll sequence `seq/f000–f018.png`, `scroll.mp4`, `scroll-sheet.png`.

## The one idea

**The phone is the instrument.** On the desktop the visitor moves through a world. On a phone, the visitor holds one instrument that keeps showing which chapter they are in. Three devices make it ours rather than generic:

1. **The chapter chip.** The header pill `● 03 / 10 WHY ONE TEAM` names the current section. Its dot takes the chapter's colour (gold for the product, a chakra colour for a lit layer), and a 2 px gold scroll-progress line runs under the header. This replaces the depth gauge, which a phone has no room for.
2. **The gravity ring at three scales.** The hero ring pulls inward (suction ripples, CSS only). The seven layers form in orbit round the same black disc. The contact well closes the arc. One object, seen three times, is the "one world" Awwwards winners have.
3. **Rhythm by surface.** ink hero → ink window on paper (product) → paper (why) → ink (layers) → paper … so no two adjacent screens look alike. The current phone page is paper-grey for about 11 screens in a row.

## 1. Diagnosis at 390 px (current build)

| Section | What is wrong |
|---|---|
| Header | Fine in itself, but at 390 the chip only says `01 / 10`, so the visitor cannot tell where they are. |
| Hero | The best screen, but the lede is 6 lines of 15 px grey, and the "Each stage of this page answers…" italic line spends the one accent voice on navigation. The figure is a cropped band under the text, not the subject. The facts line is clipped by the image. |
| Products (LIOXSA) | ≈ 2.4 screens. The device mock, which is the only image, comes **last**, after about 1.4 screens of text. Four text tiers (title, lede, line, detail, layers, offers) and two CTAs compete with each other. The best visual in the section is below the fold. |
| Why one team | The H2 is good, then about **600 px of empty paper** (the desktop sticky stage's hold height survives on a phone with nothing in it). This is a dead band four times over the 150 px limit. No image. |
| Seven layers | About **700 px of empty grid** before and after the copy. The seven layers, which are the brand's chakra symbol, are not visible at all on a phone. Only the earlier "02" ring-list screen shows them, as underlined links. |
| AI | ≈ 2.5 screens: a 7-line lede, six numbered blocks stacked at the same weight, then an ink card with two chip clouds and a closing italic line. Nothing to look at, and no hierarchy between the six capabilities. |
| Picker | 7 tag pills in a grey box with a lot of empty space. It is a decision tool that shows no consequence on a phone. |
| How we work | 3 steps as plain text. Fine as content, but flat. |
| Leadership | 3 role blocks in 15/14 px, with "Ask about" lines at the same weight as the body. Large text block, no faces (correctly: no invented people), but no device to replace them either. |
| Selected work | **≈ 5.5 screens**: 8 stacked cards, each about 700 px tall. Desktop browser screenshots are shrunk to 350 px wide, so their UI is unreadable. This single section is a third of the page. |
| Contact | The headline "Tell us what you need built." renders as **pale grey on the grid**, which fails contrast in that capture (bottom quarter of home-390.png). It may be an entrance caught mid-fade, which would itself break the no-text-through-opacity rule. Verify in the `?film=off` state. The form is fine. |

Across the page: body 15–16 px in #5f5c56 or #8a8781 is used for about 70 % of the pixels, so the page reads as one grey column. There is no large-type moment between the H1 and the footer. The only motion on a phone is the caret.

## 2. Concept: the phone story in about 9 screens (was 16.3)

Grid at 390: 20 px margins, 4 columns, 12 px windows (ink panels inset 12 px, `--r-window`). Type: H1 40/0.98, H2 32/1.04, H3 24, lead 17, body 16, mono 11–12 with 0.12–0.14 em tracking. These are the existing `clamp()` values resolved at 390, so **no new size tokens**. The product name, LIOXSA, is 48 px Geist 300 and is the only exception (a display moment). Newsreader italic is used for one word per headline.

| # | Section, surface, length | Layout at 390 | Interaction | The one motion |
|---|---|---|---|---|
| 01 | **Hero**, ink, 1.0 screen | The figure owns the top 60 % (hero-still-phone.webp, cropped to the head and ring). Then the label, H1 40 px (3 lines, *run on* in Newsreader), a **1-line** lede, a gold "Start a project" pill plus a "See our product" link, and a mono facts row. | The chip shows `01 / 10`. | Gold and violet **suction ripples** contract into the ring (SVG circles, scale 1.5 → 1, 3.6 s loop) plus a slow drift on the still (14 s scale 1 → 1.035). The H1 rises line by line behind a mask. |
| 02 | **Our products**, ink window on paper, 1.3 | Label, H2, then the **device first** (196 × 360 mock with 2 gold halos), state pill, LIOXSA 48 px, a 2-line claim plus the disclaimer, a Sponsor / License / Acquire segmented strip, a gold CTA and a "Details +" disclosure. | "Details" opens the dependency, NDA and layers text in place (`<details>`). | A **scan line** sweeps the face (transform). The device tilts −9° → −3° with scroll (view timeline). |
| 03 | **Why one team**, paper with grid, 1.0 | H2 (*hand-off* in italic). "The usual way" is 4 vendor cards in a 2 × 2 grid (Design · one agency, The app · another agency, Backend · a freelancer, AI · a consultant, from the existing copy). Under them, an ink card "With us · 1 contract" with **one gold wire through four lit dots**. Then 2 sentences of body. | none | On scroll the vendor cards **drift apart** (±4 px, ±2°) and the gold wire **draws** through the four dots (scaleX). It shows the argument without words. |
| 04 | **Seven layers**, ink, 1.2 | H2, a 1-line lede, then the **orbit**: 7 chakra rings round the black disc with the gold rim (350 px). Then a 7-row accordion, crown to root (dot, name 19 px, index, +). AI is open by default. The crown line closes the section. | Tap a row to open its line. Opening one row closes the others (one open at a time). | The rings **settle into orbit**, root to crown (scale .42 → 1 and rotate −40° → 0, staggered by scroll). |
| 05 | **AI**, paper, 1.3 | H2 plus a 2-line lede. The 6 capabilities become a **horizontal snap carousel** of 280 × 300 cards (number, name 24 px, line, product link where one exists: Helya, Nuvoq/LIOXSA) with a 1-of-6 mono counter. "Two ways to build" becomes a 2-tab segmented control (Open-source / Platforms) with its chips. | Swipe with `scroll-snap`, the counter updates, and the next card peeks by 40 px. | The active card lifts 8 px and its number turns gold (transform and colour). |
| 06 | **Picker**, ink, 1.0 | "What do you need built?" in 32 px, then 8 tags in 2 columns (44 px tap targets). The result appears **in place**: a mini orbit lights the chosen layers (same SVG as 04, the other layers dimmed), the verdict line, and "Where we've done it" → the work card. | Tap a tag. The choice is remembered (existing pulse store) and the chip dot takes the top layer's colour. | The chosen rings brighten while the others dim (opacity on rings only, never on text). |
| 07 | **How we work**, paper, 1.0 | H2 *Exact before expensive.* Then 3 steps as a **vertical timeline**: a gold line, 3 nodes, the step name 20 px, and a 2-line text. The terms become 5 mono check rows. | none | The timeline line draws with scroll (scaleY). |
| 08 | **Leadership & teams**, paper, 1.0 | H2 plus a 1-line lede. The 3 roles become a **swipe carousel** of role cards: role 20 px, "owns" 16 px, and "Ask about" as a gold-dotted mono footer. The 5 practices follow as a mono chip row. | Swipe. | The card lift, as in 05. |
| 09 | **Selected work**, ink, 1.3 (was 5.5) | H2 plus a 1-line lede. A **full-bleed snap carousel** of the 8 projects, one per screen width. Use the **phone** shots where they exist (vitrin-app, veyra, tiravan 02, raah 02). For browser-only projects, crop the browser shot to its left 60 % at a readable scale, never shrink the whole screen. Category in mono, name 32 px, one line, "Open case →". Then a dot pager and the NDA note. | Swipe. Tap opens the case page. | Parallax: the screenshot moves at 0.85× the card's swipe (transform, driven by the scroll-snap container's scroll timeline). |
| 10 | **Contact**, ink window, 1.2 | The **ring again**, small, with ripples, beside the 24-hour line. Then the H2 in porcelain (fixes the contrast fail), the "I would like to" pills, and the 3 fields. | Form. | The ripples speed up once while sending (state, not decoration). |

Total ≈ 11.3 screens with all ten sections, against 16.3 today. The first eight screens (01–07) carry the whole story. If the owner wants the ~9-screen target, fold Picker (06) into the bottom of Seven layers (04), which also suits the existing desktop "held stage" logic, and land at about 10.

**Button feel ("haptic").** On `:active`, scale .97 over 120 ms with ease-out, and a 1 px inner gold ring on gold buttons. Call `navigator.vibrate(8)` **only** on picker tag selection and form send, where the API exists. Android supports it; iOS ignores it silently.

**Reduced motion.** Every scroll timeline is guarded by `@media (prefers-reduced-motion: no-preference)`. Without it, the final states render: rings formed, wire drawn, device at −3°. The ripples, the scan line and the drift stop, and the ring shows statically with its glow. Entrances never use opacity on text: H1 and H2 use a mask with translateY, and blocks use translateY 28 px only, so the `?film=off` still state is identical to the end state.

**The deer (hero figure).** Default: the existing `hero-still-phone.webp` (36 KB) plus the CSS ripples and drift. That is already "alive" and costs zero JS. Upgrade path, only after the owner sees it: a **2.0 s seamless loop** (head turn and ring glow) rendered from the GLB as AV1 MP4 with H.264 fallback, ≤ 350 KB, `muted playsinline loop autoplay`, `preload="none"` with the still as poster. Swap it in on `canplaythrough` only if `navigator.connection.saveData` is not set and `effectiveType` is `4g`. **No GLB on phones by default**: navigator.glb is 1.06 MB, over the whole page budget.

## 3. Copy budget on mobile

Rule: on a phone, each section shows **one H2, at most 2 lines of lead and at most 3 lines of body**. Everything else moves behind "Details +" (`<details>`, crawlable, no JS) or into a carousel card. New keys need the `Short` suffix in all four locales (Dict parity, tests/locales.test.ts). They contain no new facts and are each cut from an existing sentence.

| Key (new) | EN proposal (≈ chars) | Source sentence |
|---|---|---|
| `prologue.ledeShort` | Operations software, apps and AI, designed, built and run by one team. (70) | meta.homeDescription |
| `products.items.skin.lineShort` | Reads one photo of the face for tone, texture, redness and pores, and explains it in plain words. (≈ 95) plus the existing disclaimer sentence, kept verbatim | products.items.skin.line |
| `pulse.bodyShort` | LIOXSA was built by one team, end to end. Each hand-off loses something, and when it breaks, each vendor points at the next. (≈ 125) | pulse.body |
| `pulse.vendors` | [Design · One agency] [The app · Another agency] [Backend · A freelancer] [AI · A consultant] | pulse.body |
| `pulse.withUs` | One contract, one team and one accountable lead for all of it. | pulse.body |
| `engine.ledeShort` | We cover all seven and build them in order, from the foundation up. | engine.lede |
| `ai.ledeShort` | AI tools end to end: open-source on your servers, or commercial platforms, chosen per project. | ai.lede |
| `people.ledeShort` | Our leadership team scopes each project and stays hands-on until it runs. | people.lede |

Hidden behind "Details +" on a phone: the products detail and layers, the AI closer, the process "shapes" and "notFit" lines, and the people bench (shown as practice chips instead). Budget for de and fr: they run about 25–35 % longer. Every phone headline must fit **4 lines at 32 px** in de, check "Ein Produkt ist nur so stark wie seine schwächste Übergabe." first (not rendered in this run). Set `hyphens: auto` with `lang` on `<html>` for de, because German compounds at 40 px overflow 350 px ("Produktivbetrieb"). Check 360 px in de first; it is the tightest case.

## 4. Technical plan (for the engineer who owns src/ after the reorder)

Nothing below changes desktop. All of it goes under `@media (max-width: 767px)`, which is the breakpoint global.css already uses.

1. **global.css**: add `--r-window` to the 12 px window inset (`--inset-phone: 12px`). The ripple keyframes `suck` and `inward` and the `.reveal` scroll-timeline utility go in one place, guarded by `@supports (animation-timeline: view())` **and** reduced motion. Firefox and Safari get the static end state (progressive enhancement, no polyfill).
2. **Header.tsx / Header.module.css**: the chip gets `name` text from `data-chapter` on the current section, through one IntersectionObserver (rootMargin `-64px 0 -90% 0`). Add the dot colour variable and the CSS-only progress line `animation-timeline: scroll(root)`. Header background follows the section surface (`data-surface`). Clip the name at 210 px with an ellipsis.
3. **Hero.tsx**: below 768 px, render the still as the art block (top 60 %) with the inline ripple SVG (3 circles, about 0.6 KB). Use `ledeShort`. Drop the guide's italic navigation line on phones.
4. **Porcelain.tsx (Products)**: reorder on phones with CSS `order` (device before name), segmented offer strip, and the detail wrapped in `<details>`. The scan line is a pseudo-element.
5. **Stage.tsx**: below 768 px, **do not use the 2.4-screen sticky hold**. Render three normal blocks: Why (vendor grid plus wire card), Layers (orbit SVG plus accordion), Picker (tags plus mini orbit). This removes the two dead bands. Rings are 7 `<circle>` elements with chakra colours from shared.ts `chakraColors`.
6. **Ai.tsx, Process.tsx, People, Work.tsx**: one shared `<Swipe>` component (CSS `scroll-snap-type: x mandatory`, `scroll-padding: 20px`, cards at 280 px or 100 % − 40 px, a counter from IntersectionObserver at threshold 0.6, arrow-key support, `aria-roledescription="carousel"`, every card focusable). No library.
7. **Work.tsx**: on phones use the phone shots where they exist. For browser-only projects add a `-crop.webp` (left 60 %, 2× for 350 px, ≤ 45 KB) or use `object-position: left top` with `object-fit: cover` at 4:5.
8. **Contact**: H2 colour must be `--porcelain` on its surface. Today it is a pale grey on the grid: **contrast fail, fix first**.

**Budgets (mid-range Android, Moto G Power class, 4× CPU throttle, Slow 4G).**

| Metric | Budget |
|---|---|
| JS added | ≤ 3 KB gzip (chapter observer plus Swipe counter). All motion is CSS. No GSAP or Lenis on phones (already off), no three on phones. |
| LCP | < 2.5 s on 4G. The LCP element is the hero still: `fetchpriority="high"`, preload, ≤ 40 KB, intrinsic sizes. |
| CLS | 0. Every image has width and height, carousels reserve their height, and Geist's metric fallback already holds the type. |
| INP | < 200 ms. Accordion, tabs and tags are native elements with no layout thrash. |
| Animated properties | transform and opacity (opacity only on non-text strokes). At most 3 infinite loops on screen at once, and they pause off screen (an IntersectionObserver toggles `animation-play-state`). |
| Page weight to first screen | ≤ 250 KB. Fonts are already 3 preloads. Video, if adopted, is fetched after load. |

**Testing.** Playwright with system Chrome at 390 × 844 and 360 × 800, @2x, `isMobile`. Capture full page plus one frame per section, also with `?film=off` and with `reducedMotion: 'reduce'`. Assert in the e2e that there is no horizontal overflow (`scrollWidth === 390`), that no section exceeds 1.3 × viewport height (1.8 for work), and that no vertical gap between visible boxes exceeds 150 px. Run Lighthouse mobile (`--form-factor=mobile --throttling-method=simulate`): LCP < 2.5 s, CLS 0, TBT < 200 ms. Spot-check on one real Android Chrome with remote DevTools: Performance panel, 60 fps through the orbit and the work carousel. Check de at 360 for every H1, H2 and button.

## Prototype notes

`proto/index.html` uses the real fonts (copied from src/assets/fonts), the real tokens and the real still. The scroll-driven parts use CSS `animation-timeline` only, so `seq/` shows them as the page scrolls. Contrast in the prototype:

| Pair | Ratio |
|---|---|
| #a9a59d on #0b0b0d | ≈ 8.3 : 1 |
| #8a8781 on #0b0b0d | 5.4 : 1 |
| #5f5c56 on #f4f2ec | 5.9 : 1 |
| ink on gold #d9a441 | ≈ 9 : 1 |
| gold text on ink | ≈ 9 : 1 |

Orange #ff5a1f is not used for text anywhere.

Known prototype limits: the 390 frame is fixed width, so 360 has not been rendered. The violet "neon" ripple is the owner's request. It sits near the "chakra colours only for lit layers" rule, so confirm it with the owner or switch it to gold.

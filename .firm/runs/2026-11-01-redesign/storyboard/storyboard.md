# Storyboard, round 2 · revision 1 — Observatory, framed (lead designer, 2026-11-01)

Binding inputs: ADR-001 with its six refinements, system A, C's grid-well, the reverse-engineering synthesis, direction.md §3, charter.md, en.ts verbatim, and `revision-1.md` (15 items, all applied). Frames: `d-01…d-05`, `d-02b`, `d-03b-picker`, `d-05-form-states`, `d-handover`, `d-accent-ab` (1440×900), `t-01-hero` (1024×768), `m-01, m-02, m-03, m-05, m-menu` (390×844); shared system in `sb.css`/`sb.js`. Astraía is still a labelled silhouette (the rendered still waits for the owner's download); each frame names her one act.

**Architecture.** One `<canvas>` fixed to the viewport draws one world (the hairline grid bending into the well, the lensing ring, Astraía) in viewport space. The document scrolls over it; framed *windows* (24 px inset, 16 px radius, `min-height: 100svh; height: auto`) let the world through; the scissor rect follows the windows on reflow, so nothing clips at 200 % zoom, 320×568 or with German copy. Nine stations on the gauge, six screens, in story order: 01 hero → 02/03/04 held stage (manifesto, layers, **the picker closes the hold**) → 05 proof + 06 how we work → 07 products + 08 people (porcelain) → 09 contact.

**The guide is consequential (item 1).** She is in the world at 01–04, 05 and 09, with one act each: 01 eyes hold the hole, rings orbit with scroll speed · 02 watches each layer snap into orbit · 03 turns a third to the orbits, irises light root → crown · 04 lights the layers the picker chose, the others go grey · 05 turns to the stitched row and holds it · 09 faces the form, a door lights its layer, Send: one slow blink. Fallback if Astraía fails on the frame: Cyber Girl with the same acts, never the ring alone.

**Accent discipline (item 7).** Gold on at most three DOM elements per frame: the gauge marker, the caret of her line, Send (plus the canvas: ring glow and armillary rings). Eyebrows, labels and the CTA border are porcelain/grey. Chakra dots appear only where layers are the subject (stage, picker, proof rows, the product row); every dot row has a mono text twin ("Uses layers 2, 3, 5"), dots `aria-hidden`.

## 01 Hero (`d-01-hero`, `t-01-hero`, `m-01-hero`)
- **Columns.** Nav 64 px: wordmark, four links, language menu "EN ▾" (four options), motion `<button aria-pressed>`, ghost CTA. In the window: eyebrow, H1 84/300, lede, CTA in cols 1–6 at 62 % height; ring r 150 at col 9–10; her at the lower-right rim cols 10–12, cut by the frame; her line cols 7–9 under the ring; facts in the foot.
- **One motion (item 3).** On load the straight hairline grid bends into the well over 900 ms, `cubic-bezier(.2,.7,.2,1)`; nothing else moves. The hole grows station by station (r 150 → 165 → 230). Hover: gaze. Never: text, CTA.
- **Line.** "I'm the Navigator. I've flown this descent before. Look into my eyes and see what I see." Full text, clip-revealed; the caret is static under reduced motion.
- **Hand-over** (`d-handover`). Native scroll; the hero window leaves while the world stays; ring and guide are cut by the window's bottom edge and re-emerge through the stage window 24 px later; the marker glides 01 → 02.
- **Tablet 768–1100.** Hamburger + station chip + CTA; H1 `clamp(40px, 6.4vw, 64px)`; her line stacked under the ring. ≥ 1920: content max-width 1600, type by `clamp()`.
- **Phone.** 24 px inset everywhere; station chip "01 / 09" in the nav instead of the rotated gauge; compact "Start a project" from 360 px; her rendered still beside a CSS ring; no WebGL under 768 px.
- **Reduced motion.** The grid is already bent; the still is the final state.

## 02–04 The held stage (`d-02-stage`, `d-02b-stage-held`, `d-03b-picker`, `m-02-stage`)
- **Columns.** A 2-screen section, window sticky for its CSS height (no pin). Words in cols 1–5 are normal-flow DOM scrolling over the window, in an opaque band on phone: 02 "A product is only as strong as its weakest hand-off." → 03 "Seven layers. One team." + "AI sits on top…" → 04 "What do you need built?" with the eight pills (radiogroup), "What it takes" dots + "Uses layers 1, 2, 3, 7", the verdict, "Where we've done it ↓" (points down only). Ring r 165; label column cols 10–12, unlit labels solid grey (5.49 : 1), lit ones porcelain 600 (item 4); counter top-right.
- **One motion.** Scroll-scrubbed: each layer leaves its straight grid line and snaps into orbit, 01 → 07. The picker lights the chosen orbits and greys the rest; it never overwrites typed text and announces the result (`aria-live`). Over the hold's last 10 % the ring is scrubbed into the gauge marker (item 9); no timed animation.
- **Lines.** 02 "One contract, one crew. Every hand-off you skip is a failure you never debug." 03 "My seven systems, root to crown. Each one rests on the one beneath it." 04 "AI on your data: 4 of my seven systems. Watch them light."
- **Phone.** Hold 1.5 screens, SVG orbits, labels left; the picker follows as plain DOM.
- **Reduced motion.** All seven in orbit, choice applied at once.

## 05 Proof + 06 how we work (`d-03-proof`, `m-03-proof`)
- **Columns.** H2 + lede cols 1–5; a letterbox window cols 7–12 (710×230) keeps her in the world, head turned to the rows, her line inside it. Five hairline rows: industry/sector, moment, system + "Uses layers…", outcome numeral + dots; outcomes are shared.ts facts. Station 06 closes the screen.
- **One motion.** As the marker passes a row its inner grid lifts 4 px and its dots light (240 ms); the arc is `translateX` on the inner wrapper, hairlines straight. The row mapped to the picked need carries the 2 px gold stitch and the label "Nearest your choice" (honest: the picker came first).
- **Line.** "Five missions flown. The one nearest yours wears the gold stitch." (item 15: owner's call; four locales).
- **Hand-over.** Surface flip at a hairline; the marker turns ink.
- **Phone.** Rows stack; "Layers 3 2 5" replaces the dots.

## 07–08 The porcelain screen (`d-04-porcelain`)
- **Columns.** Cols 1–6: products (eyebrow, H3, lede, the skin-analysis product as a hairline row with "Uses layers 2, 5, 7", investors link), then people as three hairline rows. Cols 8–12: **one large object**, the ring drawn in ink with the seven layers on an orbit, the picked ones lit, caption "Your choice, remembered" (item 8). Her payload line above it.
- **One motion.** None beyond hover; the lit layers are the memory of 04. Focus on porcelain: ink ring + porcelain gap. Borders #7a776f (3.69 : 1).
- **Reduced motion.** Identical.

## 09 Contact (`d-05-contact`, `d-05-form-states`, `m-05-contact`)
- **Columns.** Window; hole r 230; form on panel #121216 cols 1–5: doors as radios with a check mark on the selected one (not colour alone), fields with #6b6963 borders (3.58 : 1 body, 3.40 panel), Send in gold, privacy line; her at the rim facing the form; `scroll-padding-top: 88px`.
- **States (item 6).** Errors: a focused `role="alert"` summary linking each error, inline messages via `aria-describedby`, `aria-invalid`. Sending: `aria-busy`, fields disabled, text kept, Send not re-pressable. Success: static `role="status"` box receiving focus, "Thank you. We'll reply within 24 hours." Failure: `role="alert"` above Send, every field keeps its text. Honeypot: off-screen, `tabindex="-1"`, `aria-hidden`, `autocomplete="off"`.
- **One motion.** Send: one slow blink, the ring closes to a dot over 1.2 s. Reduced motion: none; the status appears at once.
- **Phone.** A 232 px window for the hole and her line; the form is DOM below.

## Phone menu (`m-menu`)
A `role="dialog"` panel: five links carrying station numbers, language as a four-option radiogroup, motion as a pressed-state button, the CTA and the contact line; focus trapped, Esc closes.

## Decision log
| Decision | Options | Choice | Reason |
|---|---|---|---|
| Accent | orange · gold | **gold** (`d-accent-ab`) | Accretion light and the brass of her rings; 8.74 : 1 vs 6.31; the orange-on-black register is the set's most common. Cost: one copy word, the OG image. |
| Display | 500/104 · 300/84 · 400/72 | **300 at 84, H2 56, mono floor 12** | The canvas is the loud element; labels are shortened, never shrunk. |
| Screens | 10.3 · 6 · 4 | **6, nine stations** | ADR-001 §2. |
| Canvas framing | full world · windows on one fixed canvas · canvas per section | **one fixed canvas, windows that grow** | One context, one rAF, native scroll, no clipping. |
| Guide placement | badge · over text · rim cols 10–12 · letterbox at 05 | **rim, cut by the frame; letterbox at 05; one act per station** | Consequential, never over text, never the ring alone. |
| Picker | hero · own screen · porcelain · **end of the held stage** | **closes the hold (04)** | The choice precedes the proof, so the stitch is honest and "Where we've done it" points down. |
| Gauge | 64 px ruler · the 24 px gutter · phone chip | **gutter; chip "n / 09" in the phone and tablet nav** | Exact inset; no rotated text on phone. |

## Performance plan
- **Loads when.** Prerendered HTML, the still poster behind the hero window, CSS rings and a static SVG well: first paint needs no script. After idle and `canRunWorld()`: ring shader (one quad), grid-well shader (one plane), Astraía GLB ≤ 2 MB (head-and-shoulders cut, arms removed at adopt time, draco, 1k textures). Three woff2 fonts.
- **Intel UHD.** dpr ≤ 1.5; scissor to the visible windows; `frameloop="demand"` outside the hold; target ≤ 6 ms GPU per frame (grid 1, ring 1.5, bust 2.5, hair ≤ 0.3). One rAF (gsap ticker drives Lenis and R3F); layout read only in `onReflow`. Lenis smooths native scroll and is off under reduced motion (item 11).
- **Phone.** No three.js under 768 px or without a capable GPU; Lighthouse mobile ≥ 90 measured on that path.

## Accessibility
| Pair | Ratio | Use |
|---|---|---|
| porcelain on body #0b0b0d | 16.22 | display, body |
| warm grey #8a8781 on body | 5.49 | lede, mono, unlit labels |
| gold on body / panel | 8.74 / 8.31 | marker, caret, Send |
| body on gold (Send) | 8.74 | button |
| control border #6b6963 on body / panel | 3.58 / 3.40 | fields, pills |
| body on porcelain · #5f5c56 on porcelain | 16.22 · 5.50 | light screen |
| control border #7a776f on porcelain | 3.69 | light-screen controls |
| gold / orange on porcelain | 1.86 / 2.57 | never text, never a control |

Focus: 2 px porcelain ring + 2 px body gap (ink ring + porcelain gap on the light screen). Headings explicit: one h1, each station an h2, sub-blocks h3. Reader order: nav → H1, lede, CTA → stations in page order → form; canvas, gauge, grid, orbits and dots `aria-hidden`; her line is text labelled "Navigator"; typed lines are full text with a clip reveal.

## Open risks
1. **Copy.** "gold stitch" is rendered as proposed; the owner decides the word in four locales (item 15).
2. **Astraía at ≤ 2 MB** and the rendered still: pending the owner's download; Cyber Girl is the fallback with the same acts.
3. **Sticky windows + fixed canvas on Safari**: scissor refresh on resize/font load; verify in the hero prototype.
4. **Four dark screens of six**: the proof screen can flip to porcelain without changing the system.
5. **German**: "Wir bauen, was Ihren Betrieb trägt." fits at 84; the manifesto H2 at 56 in cols 1–5 needs a check.

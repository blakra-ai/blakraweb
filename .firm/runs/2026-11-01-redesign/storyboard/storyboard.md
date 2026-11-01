# Storyboard, round 2 — Observatory, framed (lead designer, 2026-11-01)

Binding inputs: ADR-001 with its six refinements, system A, C's grid-well, the reverse-engineering synthesis, direction.md §3, charter.md, en.ts verbatim. Frames: `d-01…d-05`, `d-02b`, `d-handover`, `d-accent-ab` (1440×900) and `m-01, m-02, m-03, m-05` (390×844), each `.html` + `.jpg`; shared system in `sb.css`/`sb.js`. Astraía is a labelled silhouette with her armillary rings; no face is drawn.

**Architecture.** One `<canvas>` fixed to the viewport draws one world (warped hairline grid, lensing ring, Astraía) in viewport space. The document scrolls over it; three *windows* (framed stages, 24 px inset, 16 px radius) let the world show through, measured on reflow only. Everything else is DOM. Nine stations on the gauge, six screens: 01 hero → 02/03 stage (held) → 04 proof + 05 how we work → 06 picker + 07 products + 08 people (porcelain) → 09 contact.

## 01 Hero (`d-01-hero`)
- **Columns.** Nav 64 px. In the window: eyebrow, H1 84/300, lede, CTA in cols 1–6 at 62 % height; ring r 150 at col 9–10; her head-and-shoulders cols 10–12 at the lower-right rim, cut by the frame; her line cols 7–9 under the ring; layer readout top-right (01–03 lit); facts and scroll cue in the feet.
- **DOM / canvas.** Canvas: grid-well, ring, her. DOM: all words, readout, gauge, frame border.
- **One motion.** The three foundation layers power on root → crown on load (readout dots, her irises), 900 ms, `cubic-bezier(.2,.7,.2,1)`. Hover: gaze; her rings orbit at 40 s and speed with scroll velocity. Never: H1, lede, CTA, labels.
- **Guide.** Rim-lit, eyes on the hole. Line: "I'm the Navigator. I've flown this descent before. Look into my eyes and see what I see." Typed once, accent caret, jaw-synced later.
- **Hand-over** (`d-handover`). Native scroll: the hero window leaves upward while the world stays; ring and guide are cut by the window's bottom edge and re-emerge through the stage window's top edge 24 px later. The gauge marker glides 01 → 02. Nothing scales or fades.
- **Phone.** Same frame; H1 40/300; her rendered still in the lower third beside a 70 px CSS ring; line at 18 px; no WebGL under 768 px.
- **Reduced motion.** The prerendered still is the final state: dots lit, line printed, rings static.

## 02 The seven-layer stage (`d-02-stage`, `d-02b-stage-held`)
- **Columns.** A 2-screen section; the window is `position: sticky` for its CSS height (no pin, page height constant). Words in cols 1–5 are normal-flow DOM scrolling *over* the window: station 02 "A product is only as strong as its weakest hand-off." then 03 "Seven layers. One team." + "AI sits on top…". Ring r 165; label column cols 10–12 with leaders; counter "Layers in orbit n / 07"; her line cols 7–9 at the top.
- **DOM / canvas.** Canvas: grid, ring, orbits, dots, her. DOM: words, labels, counter, leaders (static SVG).
- **One motion.** Scroll-scrubbed: each layer leaves the straight grid line it was and snaps into orbit, 01 → 07 across the hold; its dot lights on arrival. Words move only by scrolling.
- **Guide.** Same world, same place. Lines: 02 "One contract, one crew. Every hand-off you skip is a failure you never debug." 03 "My seven systems, root to crown. Each one rests on the one beneath it." She turns a third toward the orbits; her irises light with the list.
- **Hand-over.** The window un-sticks and leaves; the ring shrinks by transform into the gauge marker (300 ms); from here the marker is drawn as a ring: *the ring alone carries* 04–08.
- **Phone.** Hold 1.5 screens, SVG orbits, no figure, labels left of the ring.
- **Reduced motion.** All seven in orbit, counter 07 / 07, words in flow.

## 03 Proof + how we work (`d-03-proof`)
- **Columns.** DOM only. H2 cols 1–5, lede cols 7–12, ring glyph + her line beside it. Five hairline rows: industry/sector (1–2), moment 21 px (3–6), system (7–9), outcome numeral + lit dots (10–12); outcomes are shared.ts facts. "Exact before expensive." and the three steps close the screen (station 05).
- **One motion.** As the marker passes a row, its inner grid lifts 4 px and its dots light (240 ms). Rows sit in a lensed arc by `translateX` 0/8/14/8/0 on the inner wrapper, hairlines straight; the row nearest the picked need carries the 2 px accent stitch. No reflow.
- **Guide.** Absent; the marker-ring is her. Line: "Five missions flown. The one nearest yours wears the orange stitch." (risk 1).
- **Hand-over.** Surface flip at a hairline: body → porcelain; the marker turns ink.
- **Phone.** Rows stack; steps as one mono line.
- **Reduced motion.** Rows at rest, arc static, dots lit.

## 04 The porcelain screen (`d-04-porcelain`)
- **Columns.** #ece9e2, ink text, grey #5f5c56. Station 06: H2 "What do you need built?" cols 1–5; eight pills cols 7–12 (one selected, ink); "What it takes" dots + verdict + "Where we've done it →"; her line beside the ring glyph. Hairline. Station 07 cols 1–5: products H3, lede, the skin-analysis card (14 px radius), investors link. Station 08 cols 7–12: people H3, three roles on hairlines, bench text.
- **One motion.** The picker: the dots light root → crown (80 ms steps), the verdict re-types once, the proof link points at the mapped case, the contact message pre-fills. Pills change border on hover only.
- **Guide.** Absent; the ring glyph answers. Line: "What are we building? Choose, and I'll light the systems it takes." Her irises remember the choice at 09.
- **Hand-over.** Flip back to body at the hairline; the contact window enters with the hole already large.
- **Phone.** Pills wrap in two rows; card, then roles, one column (a reflow of the same DOM; not rendered this round).
- **Reduced motion.** Dots light at once; no re-type.

## 05 Contact, the closing stage (`d-05-contact`)
- **Columns.** Window; hole r 230 at col 9–10 filling the upper right; form on panel #121216 cols 1–5 (eyebrow, H2 44, lede, three door pills, three fields, Send in accent, privacy line); her at the lower-right rim facing the form; her line cols 7–9; "Read by an engineer, not a sales team." in the foot; footer links below the frame.
- **One motion.** Send: one slow blink, the ring closes to a dot over 1.2 s, "Thank you. We'll reply within 24 hours." types. A door lights a layer in her irises. Focus: 2 px porcelain ring, 2 px body gap.
- **Guide.** Line: "Your mission is written in. Send it, and an engineer who would build it answers within 24 hours."
- **Hand-over.** None; footer follows.
- **Phone.** A 232 px window holds the hole and her line; the form is plain DOM below, never over the canvas.
- **Reduced motion.** Hole open and still; success line printed.

## Decision log
| Decision | Options | Choice | Reason |
|---|---|---|---|
| Accent | orange #ff5a1f · gold #d9a441 | **gold** (`d-accent-ab`) | The accretion light the ring emits and the brass of her rings: one material. 8.74 : 1 on body vs 6.31; orange-on-black is the set's most common dark register. Cost: one copy word, the OG image. |
| Display | 500/104 (A) · 300/84 · 400/72 (synthesis) | **300 at 84, H2 56** | Light weight lets the canvas be the loud element; 84 keeps German to one extra line; 72 looked timid beside a 300 px ring. |
| Screens | 10.3 (A) · 6 · 4 | **6, nine stations** | ADR-001 §2; the gauge keeps the nine beats as chapters at anthropic/runway length. |
| Canvas framing | full-viewport world · windows onto one fixed canvas · a canvas per section | **one fixed canvas, three windows** | One context, one rAF, native scroll; the hand-over is the same object through the next window, so "no second guide" is structural. |
| Guide placement | docked badge · over text · rim cols 10–12 · left of the form | **rim, cut by the frame; absent 04–08** | Never over text; present only where the canvas is; the marker-ring stands for her elsewhere (O1 fallback is the same device). |
| Picker | hero · own screen · porcelain screen | **porcelain, station 06** | The one verb, chosen after the proof, still warm at the form; gives the light screen a reason beyond a flip. |
| Gauge | 64 px margin ruler · the 24 px gutter | **gutter** | Keeps the inset exact; the window's left edge is the ruler's baseline. |

## Performance plan
- **Loads when.** Prerendered HTML, `stage-poster` still behind the hero window, CSS rings: first paint needs no script. After idle and `canRunWorld()`, the world mounts: ring shader (one quad), the grid-well (one shader on a plane), Astraía GLB ≤ 2 MB (head-and-shoulders cut, arms removed at adopt time, draco, 1k textures). Three woff2 fonts.
- **Intel UHD budget.** dpr ≤ 1.5; scissor to the visible windows; `frameloop="demand"` outside the hold, invalidated by scroll, cursor and the picker. Target ≤ 6 ms GPU per frame: grid 1, ring 1.5, bust 2.5 (no shadows, one rim light + env), hair ≤ 0.3. One rAF (gsap ticker drives Lenis and R3F); layout read only in `onReflow`.
- **Phone fallback.** No three.js under 768 px or without a capable GPU: her rendered still, CSS rings, static SVG grid-well and orbits. Lighthouse mobile ≥ 90 is measured on this path.

## Accessibility
| Pair | Ratio | Use |
|---|---|---|
| porcelain #ece9e2 on body #0b0b0d | 16.22 | display, body |
| warm grey #8a8781 on body | 5.49 | lede, mono |
| gold #d9a441 on body / panel #121216 | 8.74 / 8.31 | eyebrow, readouts, caret |
| body on gold (Send) | 8.74 | button |
| porcelain on panel | 15.41 | form |
| body on porcelain | 16.22 | light screen |
| grey-on-light #5f5c56 on porcelain | 5.50 | light-screen secondary |
| gold / orange on porcelain | 1.86 / 2.57 | never text, never a control; the marker turns ink |

Focus: 2 px porcelain ring with a 2 px body gap on every control (≥ 3 : 1 on both surfaces); pills are buttons, the picker a radiogroup. Reduced motion: the HTML is the final state, the canvas shows the still, nothing types or scrubs, sticky holds become flow. Reader order: nav → H1, lede, CTA → stations in page order with real headings → form; the canvas, gauge, grid and orbits are `aria-hidden`; her line is text after the station heading, labelled "Navigator".

## Open risks
1. **Gold vs copy.** navigator.lines.proof says "orange stitch": gold needs the owner's one-word change in four locales, or orange wins on continuity.
2. **Astraía at ≤ 2 MB.** The source is a full six-armed figure; the cut, textures and rig are judged on the frame. Fallback: the ring alone.
3. **Sticky windows + fixed canvas on Safari.** The scissor rect must refresh on resize and font load only.
4. **Dark for four of six screens.** If the owner reads "dark AI", the proof screen can flip to porcelain without changing the system.
5. **German.** "Wir bauen, was Ihren Betrieb trägt." fits at 84; "Sieben Ebenen. Ein Team." fits at 56; the manifesto H2 needs a check in cols 1–5.

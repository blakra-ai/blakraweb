# Three visual systems for blakra.us (art direction, 2026-11-01)

Inputs: direction.md (spine kept, with changes noted), awwwards-survey.md, concepts.md, charter.md, en.ts (all copy and facts as is). Style frames: `A-hero.html`, `B-hero.html`, `C-hero.html`; mood sheets: `A-mood.html`, `B-mood.html`, `C-mood.html`; renders `*.jpg` at 1440×900. Fonts are the project's self-hosted Geist, Geist Mono and Newsreader italic, copied next to the HTML. Contrast ratios computed (WCAG 2.2 relative luminance); the lit-layer (chakra) colours are measured too, but they are never used as text in any system.

The story spine is the nine chapters of direction.md: 01 Hero · 02 Manifesto ("A product is only as strong as its weakest hand-off.") · 03 Mission (the picker, "What do you need built?") · 04 Systems ("Seven layers. One team.") · 05 Proof (five cases, outcomes as written) · 06 Checklist ("Exact before expensive.") · 07 Payload (the skin-analysis AI, under NDA) · 08 Crew (three principals, roles only) · 09 Contact (three doors). One improvement applied to all three: the Mission picker is the page's one verb, and whatever the guide is, it reacts to the picker and the form, nowhere else.

Shared rules, not negotiable in any system: Geist for display and text, Geist Mono for one label style, three radii (pill, 14 px card, 4 px tag), words in columns 1–6/7 and the subject in 7/8–12, one motion per beat, transforms and opacity only, text never animated through partial opacity, no scroll-jacking, no new facts, four languages (en/de/fr/es; German headlines are ~25% longer, which every display size below tolerates by one extra line).

---

## A. Observatory

**Thesis.** An instrument-grade dark world: the black hole is the one rendered object, the page is a measured descent with a depth gauge, and the guide bust stands at the rim.

**Who it convinces.** Jury first (the one WebGL object, the dark cinematic register of Oryzo/Igloo); client CTO second (the instrument language reads as engineering); product buyer and partner studio third (dark sites read "studio", not "vendor"). Weakest for a conservative operations buyer who associates dark with games.

**Palette.** Ink #07070b, Bone #e9e6df, one accent Orange #ff5a1f. Lit layers: root #e8352b, sacral #f57a1f, solar #f7c21b, heart #2fb35a, throat #2a9fe0, third eye #4248c2, crown #9a4fd0, used only as dots and glows on the spin axis and in her irises. Argument for keeping #ff5a1f rather than a hotter orange: on ink it passes AA as *text* (6.45:1), which no other system can offer, so readouts may be orange here; a hotter #ff6a2e gains 0.6 but loses brand continuity with the other two systems and the OG image.

| pair | ratio | |
|---|---|---|
| Bone on Ink | 16.13 | AA |
| Bone 2 #c9c5bb on Ink | 11.67 | AA |
| Mute #9a978f on Ink | 6.89 | AA |
| Orange on Ink | 6.45 | AA |
| Ink on Orange (button) | 6.45 | AA |
| Bone on Ink 2 #101016 | 15.21 | AA |

**Type.** Geist 500 display, Geist 400 text, Geist Mono 500 readouts; no serif. Ratio 1.5 (perfect fifth): 18 → 27 → 40 → 64 → 104. At 1440: display 104 / 0.94 / −0.035em, H2 64, lead 22, body 18/1.5, readout 11 at .14em caps. At 390: 52, 36, 18, 16, 10. Body measure 50 ch.

**Grid and whitespace.** 12 columns, 64 px margin, 24 px gutter, 87 px column, 8 px baseline. A 20 px depth gauge lives in the left margin. Header 72 px, readout strip 80 px; the hero holds 748 px between them.

**Surfaces and rhythm.** Every chapter is ink; panels and the form are Ink 2 #101016 with a hairline. Rhythm (screens): 1.0 / 1.0 / 1.2 / 1.6 / 1.3 / 1.0 / 1.0 / 1.0 / 1.2 = 10.3 screens. Chapters are separated by the gauge ticking over, not by colour.

**Hero composition (12 columns).** Header: wordmark (1), nav (4–8), EN · Motion, ghost pill (12). Columns 1–6: orange eyebrow "BLAKRA — Software with gravity.", H1 in 4 lines, lede, orange pill "Start a project" + mono cue. Columns 7–12: the lensing ring (520 px: black disc, bright Einstein ring, a second faint photon ring, a warm accretion crescent at 200°, lensed arcs of the background grid), the spin axis through it with the seven layers labelled root to crown (01–03 lit at the hero), and the guide bust at the lower-right rim, cut by the readout strip. Readout strip: facts, seven layer readouts, "Scroll to descend 01 — 09".

**Signature device.** The depth gauge: the left margin is a ruler; the orange marker is the reader; every chapter is a station with a depth. The ring recedes 8% per station, so the page is measurably a descent.

**Motion grammar.** Moves: the ring (scale, tilt, one beat per chapter), the gauge marker, the bust (gaze, breath, blink), the lit dots on the axis. Never: body text, headline position, text opacity, backgrounds. Hand-over: the gauge ticks over at each hairline. Hover: a card lifts 4 px and its layer dots light; a readout re-types once. Click (the picker, a door): the ring tilts toward the choice, the layers it takes light on the axis and in her eyes.

**The guide.** Head and shoulders at the rim, columns 10–12, rim-lit by the ring, eyes holding the seven-band disk. Present in 01, 04, 07, 09; the ring alone carries 02, 03, 05, 06, 08. Reacts to cursor (eyes, head at a third), scroll (hair), the picker and the form (systems light). Never waves, never docks in the header, never crosses a text box; her line is the mono readout in the gauge, typed once per station.

**Honesty.** Only en.ts copy; the gauge reads station numbers, not fabricated depths with units.

**Performance.** 3D: the ring (one quad with a lensing shader, or the existing disk shader) and the bust; everything else, including the axis, the gauge and the arcs, is CSS/SVG. Phone: the hero ring as a rendered still with the bust frame, the rest CSS; no three.js under 768 px or without a capable GPU (existing governor and poster path).

**Accessibility.** All text ≥ 6.4:1 in the still state; readouts in orange allowed (6.45). Reduced motion: still ring, gauge shows the index, nothing re-types. Focus rings in Bone, 3:1 against Ink 2.

**Biggest risk.** Dark + instrument reads "security startup" (Darkmoon) and the ring is the one object every space site has; the originality must come from the gauge and from her, so without the bust it is a generic dark hero. Second risk: ink everywhere for 10 screens tires the eye; the owner rejected "dark AI" moods before.

---

## B. Paper and Mass

**Thesis.** A warm paper document; the hole is never drawn. The bust is the mass, and the proof of gravity is that real display type and real layout bend toward her, then settle and light.

**Who it convinces.** Client CTO and product buyer first (it looks like a document a serious firm would sign); jury second (the device is new: a 3D figure whose gravity acts on live DOM text; the restraint is Lusion/Terminal-class); partner studio third (quiet, may read as "editorial agency").

**Palette.** Paper #f2f0eb, Ink #0b0b10, Orange #ff5a1f as one dot and one button state; Ink 2 #3a3a40 is the bust and secondary text. Lit layers appear only in her irises and as list ticks.

| pair | ratio | |
|---|---|---|
| Ink on Paper | 17.24 | AA |
| Ink 2 #3a3a40 on Paper | 9.92 | AA |
| Mute #5b5a57 on Paper | 6.06 | AA |
| Paper on Ink (ink chapters) | 17.24 | AA |
| Orange on Paper | 2.74 | fail, so orange is never text and never a text-bearing button here; the button is Ink |
| Paper on Orange | 2.74 | fail (same consequence) |

**Type.** Geist 400 display with Newsreader italic 300–500 for the accent phrase ("organizations / run on." is the existing `human` slot in en.ts); Geist 400 text; Newsreader italic 400 for her voice; Geist Mono one label. Ratio 1.25 (major third) 19 → 24 → 30 → 37 → 47 → 60; the display size is free. At 1440: display 118 / 0.92 / −0.04em, H2 60, voice 21/1.35, body 19/1.5, label 11. At 390: 56, 34, 18, 17, 10.

**Grid and whitespace.** 12 columns, 64/24. Words in 1–7, the mass in 8–12, her head 30% of the viewport height, cut by the section's bottom hairline. Her voice sits in the slot above her head (columns 8–11), never tailed to the mouth. Document furniture: a top rule, a bottom rule, a folio "01 Hero · Paper · She is here".

**Surfaces and rhythm.** Paper 01 03 05 06 08 09, Ink 02 04 07. Rhythm: 1.0 / 0.8 / 1.1 / 1.3 / 1.3 / 0.9 / 1.0 / 0.9 / 1.1 = 9.4 screens.

**Hero composition.** Columns 1–7: mono eyebrow with the one orange dot; H1 in three lines whose words bow toward her (weight 380 → 520 across the first line, rotation 0 → 2.2° down the lines, the serif phrase leaning 1.1° and 2.2°); lede; Ink pill + mono cue. Columns 8–12: her voice (station + Newsreader line with an orange caret), the bust, the dashed guide label on the cut. Bottom: folio left, facts right.

**Signature device.** Type that bends toward a body. The bow is set per word with `font-variation-settings` (Geist has wght only; no wdth, so the width illusion is letter-spacing and rotation) and a transform, computed from distance to her head; no canvas copy of the page.

**Motion grammar.** Moves: display words within her radius (wght 300→600, rotate ≤ 2.5°, settle in 600 ms ease-out), the case row (straight → lensed arc as the ring passes), her gaze, blink, breath and hair, the thin ring that stands in for her when she is off-screen. Never: body text, lede, form, backgrounds, text opacity. Hand-over: the ring crosses the paper/ink hairline and inverts. Hover: the cursor is a second, weaker mass; the nearest display word bows two weight units. Click: the chosen need lights its bands in her irises root to crown; Send: one slow blink, the ring closes to the orange dot.

**The guide.** As direction.md: head and shoulders, present in 01, 04, 07, 09, three-quarter in 04, profile in 07, facing the form in 09; the ring carries the other five. Never over text, never a badge, never gestures. Phones: a rendered frame in the hero only.

**Honesty.** Nothing beyond en.ts; the folio is structure, not a claim.

**Performance.** 3D: the bust only (26k now, a higher-detail head later). CSS: everything else, including the bend (one rAF loop touching ≤ 20 display words, display sizes only, so layout thrash stays bounded). Phone: still frame of her, words straight, no loop.

**Accessibility.** All text ≥ 6:1 still and moving (weight changes do not affect contrast). Reduced motion: the prerendered HTML is the final state; bands lit, words straight.

**Biggest risk.** Too quiet for the owner's "ambition in every section" ask: five of nine chapters have only a ring on paper. And the bend is near commodity (cursor-proximity weight demos); it is only ours if the words bend to *her*, which means the hero cannot ship before the bust is excellent.

---

## C. Signal

**Thesis.** A bright Swiss grid that is the spacetime: the page draws its own 12 columns and 40 px rows, and in columns 7–12 those lines bend into the well. One orange thread runs the whole site; the guide is a one-eyed instrument that rides it.

**Who it convinces.** Jury first (format/Obys-class typographic clarity with one true physical idea: the grid is the embedding diagram); partner studio second (it reads as design literacy); client CTO third (clean, diagrammatic, no character to argue about); product buyer last (the probe may read as a mascot if it emotes).

**Palette.** White #fbfbfa, Ink #121214, Orange #ff5a1f for the thread and the iris, Orange deep #d9430c for the one large accent phrase, grid hairlines at 11% ink.

| pair | ratio | |
|---|---|---|
| Ink on White | 18.07 | AA |
| Mute #5c5c60 on White | 6.43 | AA |
| Orange on White | 3.01 | AA large only (≥ 24 px) |
| Orange deep on White | 4.26 | AA large; used for "run on." at 112 px |
| White on Ink (chapters 04, 07) | 18.07 | AA |
| Orange on Ink | 6.00 | AA |

**Type.** Geist 600 display, very tight (−0.05em), Geist 400 text, Geist Mono one label; no serif. Ratio 1.414 (√2) 18 → 25 → 36 → 56 → 112. At 1440: display 112 / 0.9, H2 56, lead 20, body 18/1.5, label 11 at .12em. At 390: 54, 32, 17, 16, 10.

**Grid and whitespace.** The grid is visible: 12 columns 64/24, horizontal rows every 40 px, 8 px baseline. Words in 1–7 on white plates so hairlines never cross a text box; the well occupies 7–12; the seven bands sit in column 12 as 3 px spectrum bars with labels.

**Surfaces and rhythm.** White 01 03 05 06 08 09; Ink 04 and 07 with the grid inverted and the thread white. Rhythm: 1.0 / 0.9 / 1.2 / 1.5 / 1.2 / 0.8 / 0.9 / 0.8 / 1.0 = 9.3 screens.

**Hero composition.** Header with an orange dash before the wordmark (the thread's origin). Columns 1–7: eyebrow "01 — 09", H1 with "run on." in orange deep, lede, Ink pill + cue. Columns 7–12: the warped grid (Gaussian well, σ 150 px, pull 120 px, centred in column 10), the thread running at row 100 from the margin into a spiral at the well, the probe at the lip, the event horizon as a 30 px ink dot at the centre, the seven bands in column 12 with AI lit. Footer: facts, "Station 01 / 09 · the well is the grid", scroll cue.

**Signature device.** The grid that bends. Every chapter's columns are drawn, and wherever the probe stops, the nearest lines warp toward it; in 05 the five case cards sit on those lines and are carried into the arc by the grid, not by their own transforms.

**Motion grammar.** Moves: the thread (draws on, one beat per chapter), the probe along it (its eye follows the cursor), the grid lines nearest the probe, the seven bands on choice. Never: text, backgrounds, text opacity; the warp never enters a text plate. Hand-over: at an ink chapter the grid inverts and the thread turns white. Hover: the probe turns its eye to the hovered item and that item's grid line bends 6 px toward it. Click: the thread re-routes through the chosen need; the bands it takes light.

**The guide.** The Probe: a 3D instrument, a lens housing with one iris, no limbs, no mouth. It looks at what the reader looks at, blinks once per station, and tilts toward the picker and the form. Its voice is a mono line on the thread. It never emotes beyond the eye.

**Honesty.** Only en.ts; the bands and stations are structure, not metrics.

**Performance.** 3D: the probe only (tiny, could be a single textured sphere); the well is an SVG path set regenerated per station (≤ 30 paths, precomputed), the thread an SVG stroke-dashoffset. Phone: no 3D; the probe is an SVG, the well a static warp.

**Accessibility.** All text ≥ 6.4:1; orange only at large sizes. Reduced motion: thread fully drawn, grid warped statically, probe still. The drawn grid stays decorative (aria-hidden).

**Biggest risk.** A one-eyed object with a brow is one expression away from a mascot; and a white, gridded, typographic site is the most crowded register on Awwwards, so the warp must be visibly physical (not a background pattern) or it is "another Swiss site".

---

## Comparison

| | A Observatory | B Paper and Mass | C Signal |
|---|---|---|---|
| Design (40) | 8 — cinematic, but the dark ring is a known hero | 8.5 — editorial, warm, the only one that looks like no other agency | 8 — clean, but a crowded register |
| Usability (30) | 7 — dark for 10 screens, orange readouts help | 9 — a document; every text ≥ 6:1; no overlay ever near text | 8.5 — grid is drawn, text on plates, two ink chapters |
| Creativity (20) | 7 — gauge is good, ring is familiar | 9 — gravity on live DOM text toward a figure: unseen | 8.5 — the grid as the embedding diagram: unseen on a company site |
| Content fit (10) | 8 | 9 — "Exact before expensive" reads best on paper | 8 |
| Owner's ambition ask | strong | at risk in 5 of 9 chapters | medium |
| Guide | bust at the rim (humanoid) | bust as the mass (humanoid) | probe (object) |
| Jury prior-art | Oryzo, Igloo, Darkmoon | Exat/Text-Pressure for the bend, but not toward a figure | Format (Obys), Swiss templates |
| Screens | 10.3 | 9.4 | 9.3 |
| 3D cost | ring + bust | bust | probe |
| Phone | still ring | still frame | SVG |
| Accessibility ceiling | AA, dark | AA, best | AA, orange at large sizes only |
| Biggest risk | generic dark hero | too quiet | mascot / crowded register |

## Recommendation (ranked)

1. **B, Paper and Mass**, with one transfusion from A: the depth gauge in the left margin (mono station readout) so chapters without her are not empty, and the ink chapters (02, 04, 07) carry a faint lensing ring as their one object. This is the system the jury has not seen, it is the most usable (the document is the fallback, not a degraded mode), and it reads premium to a CTO. Ship order as direction.md: hero, 04, 05, 09. Kill criteria stand.
2. **C, Signal**, if the owner will not accept a human figure, or if the bust cannot reach the quality bar in time: the probe is cheap, the warp is physical, and it answers "the hole must be felt" with the grid. It is also the best phone system.
3. **A, Observatory**, if the owner's first reaction to B is "too quiet": it delivers ambition in every section, but it is the one most likely to be scored "seen before" and it is the hardest to keep legible for ten dark screens.

Decision needed from the owner: the figure (bust, as in A/B) or the object (probe, C). The paper document is the right page either way; A's palette can be adopted for a single chapter (07 Payload) without changing the system.

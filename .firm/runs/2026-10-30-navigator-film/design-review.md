# Design review: the whole page as one site (2026-10-30)
Evidence: review/desktop-gl-*, desktop-still-*, phone-gl-*; src/components/*.module.css, global.css (tokens: --paper #f2f0eb, --ink-0 #0b0b10, --radius 14px, --step-*).

## Findings
| P | Issue | Where / evidence | Fix |
|---|---|---|---|
| P0 | Figure covers the systems copy and layer list; layer list, canvas labels (06 LAUNCH..., 05 WEB...) and the figure stack on the same pixels, so the list is unreadable. | systems: desktop-gl-03 (ears and head across the intro paragraph), -04, -05 (rows 04-01 under the torso; "Gartner" note under the legs) | Figure owns columns 7-12 (right), list owns 1-6, as the grid rule says. Move the 3D layer labels to the right of the figure, or drop them and use the list as the only labels. Keep the figure's head below the intro (y > 360 px) only if it sits at the right. |
| P0 | No-GPU/still state: ink sections render as pale paper with near-invisible light text (headline, list, layer list). | desktop-still-01, -03 | The ink background must be CSS (`background: var(--ink-0)` or a slate token on the section), not only the canvas. The canvas then paints over it. Test with `?gl=0` in e2e (contrast check). |
| P0 | Speech card collides: in the hero it runs past the viewport edge (right 1424 of 1440, over the figure's face); in contact it sits over the "Name" input; in 02-08 it is clipped under the header with its top cut off and the 56 px badge hidden behind "Start a project". | desktop-gl-00, -09, -10, -01..-08 | Dock the card below the header (top: header + 12 px), full right margin = page gutter (67 px), max-width 360 px. Contact: dock left under the intro, never over a field. Move the badge left of the language switch (or into the header's left cluster); it must not touch the CTA. |
| P0 | Hero: figure (30% head, torso, arms) runs behind the "Founded 2024" card and the headline ("WHAT" crosses the left arm); the card cuts the legs. | desktop-gl-00 | Hero figure only in columns 7-12, head 30%, cut by the bottom edge, not behind the headline. Drop the "Founded 2024..." card to the footer strip, or move it to columns 1-6 under the CTAs. |
| P1 | "Ink" is a flat slate (about #3a3a46), not black; a black-hole site never gets dark. Paper-to-slate is a mid-grey jump and the contours are the only depth. | all ink sections | Use --ink-0 (#0b0b10) for ink bands; let the contours glow in --ink-2 at 12% and the orange/chakra light be the only colour. This is also what makes the figure's disks read. |
| P1 | Radii: 999 / 50% / 24 / 20 / 14 / 12 / 9 / 6 / 4 px all in use. Cards: speech 14, checklist 24, product 28ish, crew rotated cards 20. | css grep; desktop-gl-07, -08, -09 | Three radii only: 999 (pills, buttons), --radius 14 (cards, inputs), 4 (tags). Tokenise. |
| P1 | Type: ~20 distinct font-sizes (0.66, 0.68, 0.72, 0.74, 0.75, 0.86, 0.9, 0.92, 0.93, 0.95, 1.02, 1.05, 1.1 rem) plus 5 different headline clamps. Headlines are 3 sizes (hero ~11rem, manifesto, section 4.6rem) but section H2s span 2-3 lines with different measure. | css grep; desktop-gl-03/06/08/09 | Collapse to the --step scale: mono label (one size, 0.72rem, 0.14em), body (step-0), lead (step-1), H2 (one clamp), display (hero and manifesto only). |
| P1 | Italic serif is used for five jobs: hero accent, "gravity.", card quotes, "Twelve stores...", footer notes, the Skin AI title, "Read by an engineer". | desktop-gl-00, -06, -08, -10 | Reserve Newsreader italic for ONE job: the orange accent word of a headline, plus the Navigator's voice. Quotes/notes go to Geist. |
| P1 | Orange is both CTA fill and accent text and mono-dot; on paper the small orange text (01/02/03 numerals, 0.66rem) is about 3:1. | desktop-gl-01, -07 | Orange as fill or as >= 24 px text only; small numerals use ink-2 with an orange rule. Verify #ff5a1f on #f2f0eb: needs 4.5:1 for text under 24 px. |
| P1 | Section rhythm: systems 2340 px is 2.6 screens and the sticky list has dead right half (figure is the only content); proof 1115 and crew 1145 are the same "headline + three/five cards" form; manifesto (980) and payload (900) have ~250 px dead space top and bottom. | desktop-gl-08 (260 px empty above, 270 below the card) | Payload: centre the card on the hole, add the sealed-capsule scene (the world's X-ray) instead of empty paper. Systems: cut the hold to ~1.6 screens, one layer per 20%. Keep the two-surface alternation, but never two paper sections adjoining without a hairline contour break (mission to systems works; proof to checklist works). |
| P1 | Chakra badge circles: 8 mission icons and 5 proof icons are identical heavy rings with full-saturation 6-colour strokes, shadows and square halos (visible squares behind them). | desktop-gl-02, -06 | Remove the square drop-shadow box (a drop-shadow on a rect, visible at 130/270 px). One ring weight, colours only of the layers used; unlit = grey. |
| P1 | Crew cards tilt 3-5 deg with the text inside tilted; mono role line wraps in 2 lines ("HEAD OF OPERATIONS AND CORPORATE COMPLIANCE,") and is clipped below the fold. | desktop-gl-09 | Tilt the frame only, keep text upright, or no tilt; sentence-case roles (mono is for labels, not titles). |
| P1 | Header: 5 nav items + pause + EN + CTA + docked badge is crowded; badge behind CTA. Mobile: badge overlaps the BLAKRA wordmark (phone-gl-04). | desktop-gl-01; phone-gl-04, -13 | Badge slot between wordmark and CTA only on desktop; on phone replace the head badge with a 24 px orange dot and let the card carry the voice. |
| P2 | Mixed label systems: "NAVIGATOR · 01" (mono, ink dot), "WORKING · OPEN TO OFFERS", "LAYERS / ON OFFER", "01 · RETAIL". | desktop-gl-00, -08, -06 | One label spec: mono 0.72rem, 0.14em, uppercase, 6 px dot in orange only for live items. |
| P2 | Contact: "Privacy" link is nearly invisible on ink-card (2:1); radio card descriptions grey at ~3:1. | desktop-gl-10 | Use --ink-2 at >= 4.5:1. |
| P2 | Hero: headline starts at y 650, leaving 300 px of empty paper below the CTAs with only the oversized figure. | desktop-gl-00 | Raise the headline or place the figure so the whole sentence and figure share the first viewport. |

## Phone (390)
- Hero (phone-gl-00): speech card and the figure's head share the top 280 px; the head is cut by the card. Put the card under the headline, not over her face. Paragraph sits on a translucent panel; use solid paper.
- Systems (-04): the list is readable (good), but the docked badge covers the wordmark and the card covers the first row. Card height 90 px on every beat eats 10% of the screen: show it only for 3 s after a beat starts, then collapse to the dot.
- Contact (-13): the card covers the headline ("TELL US WHAT" cut off). Same fix.
- Targets and widths hold at 320-390; no horizontal scroll seen.

## Motion balance (code and shots)
- Too much layered at once in systems and hero: sticky list, 3D labels, figure poses, typing card, contours. Rule: per beat at most one hero motion (the figure's pose or the list), others static.
- Too little reason to move in proof, payload, crew (static cards, tilts, no state change). Give each one trigger: proof = orange thread stitches patch to patch; payload = lens over the capsule; crew = card hover turns her gaze.
- Typing: 34 cps with the cursor block is fine, but it restarts every beat while the reader reads the section; type only when the beat is entered and hold the finished line.
- Reduced motion exists in Process, Manifesto, global only; add it to Hero, Engine, People (tilt) and the speech card.

## Innovation (generic spots)
- Section heads (all H2s, the same 3-line shout): let each H2 begin from the hole. A mono "depth" gauge in the margin (e.g. "LAYER 04 OF 07" or "STATION 03 OF 09") shows the descent; it uses existing beats, no new facts.
- Cards (checklist, product, crew): rounded paper cards are generic. Give every card one gravity cue: a thin contour ring that bends toward the hole on hover, same ring as the contour field.
- Proof badges: replace identical rings with the layers it used lit in their chakra colour, the rest grey; the Navigator's thread stitches them.
- Contact: the card above the form should be the Navigator's end line only ("BLAKRA - Software with gravity.") after Send; never during typing.

## The one system
1. Two surfaces only: paper #f2f0eb and ink #0b0b10; the ink section is CSS first, canvas second (works with no GPU).
2. Colour: orange = action and the single accent word; chakra colours = only layers, only when lit; everything else is paper/ink/ink-2.
3. Type: Geist (UI/body), Geist Mono (labels, one size), Newsreader italic (one accent word per H2 plus the Navigator's voice). Sizes only from --step-*.
4. Shape: three radii (999, 14, 4); one card style; one hairline weight; one label style.
5. Columns: words in 1-6, subject (figure, card, form) in 7-12; the figure never goes behind text; the speech card sits in the gutter column, never over inputs.
6. One motion per beat: figure OR list OR cards; every beat has one reason to move; reduced motion removes all.
7. Rhythm: each section 1 to 1.3 screens (systems <= 1.8); no more than 150 px of dead space top or bottom.
8. Contrast: text >= 4.5:1 on both surfaces, in the still state too.

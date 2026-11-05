# Direction: blakra.us redesign (strategist, 2026-11-01)

STATUS: DONE_WITH_CONCERNS (one asset decision is the owner's)

Inputs: awwwards-survey.md, concepts.md, charter.md, design-review.md (2026-10-30), spec.md (2026-10-29), screenplay-v2.md, the current `src/features/navigator/*` pipeline. Jury weights: Design 40, Usability 30, Creativity 20, Content 10.

## 1. Logic check

**The brief contradicts the concepts on one point.** The owner still wants a 3D guide ("any kind; a bust is enough"); all three concepts drop it. That reads his rejection of *this* figure as a rejection of *any* figure. What failed is in design-review.md: a full body floating over text, a speech card tailed to the mouth colliding with inputs, a header badge, five motions per beat. The winners' pattern (fact: survey, 2026-11-01) is *one object carries the story*, so the figure must stop decorating every section and become the one object. Scores (0-10, inference):

| Concept | Design | Usability | Creativity | Content | Verdict |
|---|---|---|---|---|---|
| Unseen Mass | 7.5 | 8 | 7.5 | 7 | Best motion grammar (real type and layout bend, no WebGL, reduced-motion is the HTML). Too quiet for this owner on its own; "the hole is never drawn" fails his 10-28 ask for ambition in every section. Character entry: she *is* the mass. |
| Seven Lines | 6.5 | 8 | 6.5 | 7.5 | Honest and on-brand, but it is an infographic with a scrollbar; it wears thin by chapter 6 and no screen is Awwwards-Design 8. Character entry: none that is not a mascot beside a gauge. Keep its one good part: the mono station gauge in the margin (design-review already asked for it). |
| Flight Plan | 7 | 6.5 | 7.5 | 8.5 | Best use of the copy ("Exact before expensive" enacted). But it is a structure, not a film: the owner will see a form. In-place reorder of a nine-screen page risks disorientation (NNG). Character entry: she could react to the choice, which the current pipeline already does (layers light root to crown). Keep the picker as the one interaction verb. |

Riskiest assumption in all three: that a face reads as a mascot (concepts.md: speculation). Messenger (SOTY 2025) and Navigate (SOTD 2025) won with characters. Mascot is a behaviour (waving, selling, floating over text), not a face. Fix the behaviour.

## 2. Prior-art risk

- Unseen Mass: cursor-proximity variable-font weight is now a commodity (Framer "Text Pressure", 21st.dev components; the Exat microsite by Studio Size, 2026-04-16, https://abduzeedo.com/exat-variable-font-microsite, does seven rings of weight and colour around the cursor). Not an award winner, but jurors have seen it. The non-commodity part is the mass *leading the scroll* and bending *layout* (a card row into a lensed arc), not only glyphs.
- Seven Lines: depth-gauge long scrolls exist (neal.fun/deep-sea, 2019). Too quiet to be noticed.
- Flight Plan: gov.uk smart answers, Huffduffer sentence form; nobody has done it as the homepage, but it would not be *seen* as design.
- Figure: no 2025-26 SOTD with a sculptural bust as hero found (search 2026-11-01; Monogrid's "3D statue scroll" element is undated and unawarded). No SOTD with a black hole (only a cursor element and a live-show promo). Black hole + guide + software company is still open ground (survey, section 4).

## 3. Options and recommendation

- **Use** Unseen Mass as written (S-M): ignores the owner's figure wish.
- **Extend** Unseen Mass with the existing figure pipeline as the mass (M): recommended.
- **Build** Flight Plan structure with Unseen Mass type (M-L): best content, least film.
- **Leap** a navigable world with the figure, Messenger-style (L): kills WPO on an Intel UHD and gives no product narrative.
- **Not now**: not available; the live site is rejected.

**Recommendation: "The Mass".** The black hole is never drawn. The guide is a sculptural bust at its rim; her eyes hold the hole (the existing seven-band disk shader in the irises). She is the mass: real headlines and real layout bend toward her, then settle and light. What she pulls, she builds. Borrowed from the runners-up: the picker as the one verb (Flight Plan), the margin gauge "STATION 04 / 09" as her voice's slot (Seven Lines).

**Edge (the one thing nobody has):** a 3D guide whose gravity acts on the page's real text and layout, not on a canvas. Jurors can see the words bend; a business buyer needs no explanation.

**One world:** a paper document with ink chapters; one bust; one thin Einstein ring that stands in for her when she is off-screen. Nothing else in 3D: no helmet, contours, yantras, patches, X-ray, lens.

**Spine (nine chapters, existing en.ts copy; she appears in the four chapters about BLAKRA itself, the ring carries the other five):**
01 Hero "We build what organizations run on." Dark; her seven systems power on root to crown, eyes open last; the headline bows toward her, then stands. 02 Manifesto "A product is only as strong as its weakest hand-off." Ink; the ring finds the weakest word and it sags. 03 Mission (the picker): the layers it takes light, in the list and later in her eyes. 04 Systems "Seven layers. One team." She returns three-quarter, watching the list; each named layer flares its band in her irises. 05 Proof: five cases straighten into a lensed arc as the ring passes; the one nearest the chosen need is pulled closest. 06 Checklist "Exact before expensive." Three steps on the ring's path. 07 Payload: she in profile, looking into the sealed capsule; her disks reflect in its window. 08 Crew: three names at three distances from the ring. 09 Contact: she faces the form from the left column; each choice lights a system; Send: one slow blink, the ring closes to the orange dot, the end line types.

**Motion grammar:** one motion per beat. Moves: display words within her radius (Geist wght/wdth, display sizes only), the ring, card positions, her gaze/blink/hair/breath. Never: body text, backgrounds, text opacity. Pull is the first half of every beat, build (settle, light) the second. Reduced motion: the prerendered HTML is the final state; she is a still frame.

**Palette and type:** paper #f2f0eb, ink #0b0b10, orange #ff5a1f for action and one accent word; chakra colours only as lit layers. Geist variable, Geist Mono one size, Newsreader italic for the accent word and her voice. Three radii.

**The figure, concretely:** head and shoulders only, columns 7-12 (left of the form in 09), head 30% of viewport, cut by the section's bottom edge, never behind text, never docked as a header badge, absent in 02/03/05/06/08. Reacts to: cursor (eyes, head at a third), scroll (hair wind), the beat (yaw toward the list, the capsule, the form), the picker and the form (systems light). Never: waves, gestures, walks, sells, speaks over inputs, re-types while the reader reads. Her voice is the mono line in the gutter slot, typed once per beat, with the jaw moving; no card tailed to the mouth. Phones: hero only, as a rendered frame; the ring carries the rest.

## 4. MVP slice

**Hero first.** Paper, the headline in columns 1-6, the bust in 7-12, seven systems powering on, eyes opening, gaze following the cursor, twenty display words bowing toward her and settling, the mono line typed once. It must prove: the bend reads as *her* gravity (not a cursor gimmick), and the owner sees "premium", not "childish".
Kill if: under 60 fps on the owner's Intel UHD; two outside viewers call it a game character or a magnifier; the owner's first word is "childish"; Lighthouse mobile performance < 90 with the phone still.
Then: 04 Systems (list + her glance, the P0 collision fixed by columns), 05 Proof (the ring bends the row alone, proving a beat without her holds), 09 Contact (form + Send).

## 5. Keep and throw away

Keep: `figure/contract.ts` + `validateNames` (model swap stays one file), `loadFigure`, gaze/blink/breath (`living.ts`), `hair.ts`, the iris disk shader (`visor.ts` on the eyes), `poses.ts` with its glide, `director.ts` beats, `speech.ts` typing (re-slotted), `StageFallback` poster and the governor, the Pulse picker and its layer-to-case mapping, all copy and FACTS.md.
Throw away: the DOCKED pose and header badge, the speech card tail and its mouth projection, contours/backdrops, `lens.ts` X-ray, `yantra.ts`, the 3D layer labels in the canvas, patch rings, tilted crew cards, the slate ink, the 20 font sizes, full-body framing.

Asset: keep Cyber Girl (CC-BY, 26k) for the hero prototype; the bust framing exposes head detail, so a higher-detail head (shortlist #2, 74k, rig built by the existing script) may replace it after the hero passes. Owner decision; default: prototype with what runs today.

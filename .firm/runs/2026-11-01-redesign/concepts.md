# Redesign concepts — blakra.us (2026-11-01)

Inputs: charter.md, 2026-10-29 spec and reference study, screenplay-v2 (nine beats), design-review "one system" rules, en.ts (all facts and copy kept as is). Banned and avoided: 3D helmet hero, waving mascot, parallax, dark AI gradient, Lando clone, Stripe/Linear clone, floating glass cards.

Evidence behind the choices (fact unless marked):
- Full-page scroll takeover disorients; keep text out of it; short, functional holds are tolerated. NNG, 2023-08-06, https://www.nngroup.com/articles/scrolljacking-101/
- Award sites are heavy: 200–400 requests, up to 12 MB, 15–20 font files, video by default. Greenspector, 2022-10-05, https://greenspector.com/en/resources/blog/analysis_sites_nominated_mobile_excellence_awwwards/
- WebGL without a fallback "loses a third of the audience" (practitioner claim, unsourced). hontran.dev, 2026-07-10, https://www.hontran.dev/blog/webgl-website-examples
- Anonymous case studies are discounted unless specific and the NDA is stated plainly. everything-pr.com / centricdxb.com (practitioner opinion, 2025).
- Speculation (no evidence found): visitors to small agency sites distrust a character that "sells"; a figure with a face reads as a mascot.
Capabilities now cheap: same-document View Transitions, Baseline since Firefox 144 (2025-10-14, https://web.dev/blog/web-platform-10-2025); CSS scroll-driven animations (Chrome/Safari 26; Firefox status conflicting, use as enhancement); scroll-state container queries (Chrome 133, https://developer.chrome.com/blog/css-scroll-state-queries); variable fonts (Geist has wght) driven per word; WebGPU in Safari 26 and Firefox 141 (https://web.dev/blog/webgpu-supported-major-browsers) — none of the three concepts needs it.

---

## 1. The Unseen Mass

**Idea:** The black hole is never drawn. The site is a flat, printable paper document, and the only proof of the hole is what it bends: the headlines, the one orange line, the row of cases. What it pulls, it builds.

**Story arc:** 01 Hero: the headline stands straight; a thin ring of light (the Einstein ring, our guide) arrives from the right edge and the words nearest it bow toward it, weight and width swelling (variable Geist per word), then settle as it passes. 02 Manifesto: "A product is only as strong as its weakest hand-off": the sentence is set as one straight line; the ring finds the weakest word and it sags. 03 Mission: the seven needs are a stack; your choice pulls the layers it takes out of the stack toward the ring. 04 Systems: seven straight rules, foundation up; the ring draws them into one bent geodesic, the AI line last. 05 Proof: five cases in a straight row; as the ring passes, the row bends into an arc (a lensed galaxy), the one nearest your need pulled closest; hover opens before/now. 06 Checklist: three steps align on the ring's path; the free first conversation is the first point. 07 Payload: the ring closes to a sealed circle; inside, the product's one line; "under NDA" on the rim. 08 Crew: three names, three roles, held at three distances from the ring. 09 Contact: the ring parks on the form; Send collapses it to the orange dot, the end line types.

**Signature device:** real copy and real layout deformed by a mass that leads the scroll. Not a canvas copy of the page; the words themselves.

**Motion grammar:** moves: only what is within the ring's radius (font axes, the orange line, card positions), plus the ring. Never moves: body text, backgrounds, opacity of any text. Hand-over: the ring crosses the hairline between paper and ink and inverts (ink ring on paper, paper ring on ink). Hover: the cursor is a small second mass; a display word nearest it bows 2 units of weight. Click: the ring snaps to the clicked object.

**Structure and rhythm:** nine screens of 1–1.2; paper/ink alternate; five sizes only (display, H2, lead, body, mono label); three radii.

**Guide:** the ring. No face, no limbs. Its voice is the mono line typed on its tangent (navigator.lines, rewritten without "my eyes").

**Honest, fast, accessible:** no new facts; no WebGL, no canvas: SVG + CSS + one rAF loop touching only visible display words. Reduced motion: ring static per chapter, words straight, line fully drawn; the prerendered HTML is the final state.

**Cheap test:** the hero only: headline, ring, twenty words bowing, on the owner's Intel GPU at 60 fps. Kill if it reads as a hover gimmick or a magnifier.

**Risk:** per-word font-variation updates can thrash layout; limit to display sizes. The hole-never-shown idea may be too quiet for the owner's taste.

**Borrows:** cursor-proximity variable-font weight with gaussian falloff (21st.dev, https://21st.dev/@cnippet.dev/components/m-variable-font-cursor-proximity-1); refracting a snapshot of the page behind a lens (liquidGL, https://liquid-glass.ybouane.com/). New: the mass is the guide and leads on scroll, the deformation is the story (pull, then build), and it acts on real text and layout, not a texture.

---

## 2. Seven Lines

**Idea:** The page is the survey log of a descent: the seven layers are a seven-band spectrum strip (root to crown, chakra colours, correct order) that runs the full height of the left margin, is the scrollbar, and is the depth gauge; every chapter is a depth, and the five cases are read as absorption lines.

**Story arc:** 01 Hero (surface, depth 0): the strip is black; "We build what organizations run on." 02 Manifesto: the first band (cloud) lights; the gauge reads STATION 02/09. 03 Mission: your choice lights the bands it takes; the strip is the answer, no icons. 04 Systems: the reader descends through the seven strata, each band widening to full viewport width with its text for 20% of the hold (1.6 screens). 05 Proof: five thin cores side by side; each shows which strata it cut through (its layers lit, others grey); hover: before/now card. 06 Checklist: three depth marks: scope, build, run; "Exact before expensive" is the drilling plan. 07 Payload: a sealed core in a tube, only the crown band lit. 08 Crew: three names placed at the depths they own (inference from roles in en.ts; no new facts). 09 Contact: the bottom of the hole; the message is the sample you send up.

**Signature device:** the brand's product model as the page's own scroll indicator and depth gauge. Cases become spectra: proof without logos, honest under NDA.

**Motion grammar:** moves continuously: the strip and the gauge only, via CSS `animation-timeline: scroll()` (JS fallback). Content enters by transform from below; never by opacity. Hand-over: a band widens to fill the viewport, so paper/ink alternation is the band itself. Hover a case: its bands pulse; click: the card opens with a same-document View Transition. Optional, off by default: "Listen", the NASA Perseus sonification pitched by depth (https://chandra.si.edu/sound/perseus.html).

**Structure and rhythm:** nine screens of 1; systems 1.6; the strip is 24 px on desktop, a 4 px rail on phones; mono gauge one size.

**Guide:** no figure. The gauge's mono line is the voice ("Station 04. Each one rests on the one beneath it.").

**Honest, fast, accessible:** outcomes and roles only from en.ts; zero canvas; reduced motion: all bands lit statically, gauge shows the index, no audio.

**Cheap test:** the systems section alone, pure CSS: strip + seven strata on scroll. Kill if the strip reads as a loading bar.

**Risk:** reads as an infographic; the stratum trick wears thin by chapter 6 unless screen forms vary; Firefox may need the JS path.

**Borrows:** a depth counter and labelled depths on one long scroll (neal.fun/deep-sea, 2019, https://neal.fun/deep-sea/); data turned into sound (Chandra, 2022, above). New: the strip is the product model, the scrollbar and the proof format at once; cases read as spectra.

---

## 3. Flight Plan

**Idea:** The visitor is the navigator. One choice at the top ("What do you need built?") rewrites the homepage into their plan: build order, nearest case first, who leads, the door preselected; the page gets shorter as the scope gets exact, and after Send an honest 24-hour reply clock keeps running when they return.

**Story arc:** 01 Hero: the sentence form "We need [a choice]"; before any choice the page is the complete plan ("A complete system, from the ground up"). 02 Manifesto: counts the hand-offs avoided (n layers, one contract). 03 Mission: on choice, the whole page morphs in place (View Transitions): 04 Systems reorder to build order, unneeded layers collapse to one grey line each. 05 Proof: the case sharing most layers moves first (mapping exists in shared.ts). 06 Checklist: unchanged, "first conversation free" leads. 07 Payload: collapses to one line unless "Sponsor or buy" is chosen, then expands. 08 Crew: the principal whose role covers the need is first (inference from roles; no invented names). 09 Contact: door preselected, placeholder matched. After Send: the header shows "Reply by HH:MM tomorrow", stored locally, still counting on return. The site runs while the user sleeps.

**Signature device:** the page enacts "Exact before expensive": it shrinks from nine screens to about seven as the scope becomes exact; the hole in the header grows with the layers chosen (gravity = scope).

**Motion grammar:** moves only on choice (View Transitions) and on scroll (an orange dot along the plan's margin). Never: backgrounds, text opacity. Hand-over: chapters are numbered lines of one document. Hover a layer name: every chapter that mentions it highlights. Click: reorder.

**Structure and rhythm:** default nine screens of 1; chosen plan ~7; two surfaces; one card style.

**Guide:** a voice only (mono line) and the dot. No body.

**Honest, fast, accessible:** only reorders and filters existing copy; no estimates, no prices, no "quote". Pure HTML/CSS, no canvas, prerendered default. Reduced motion: instant reorder with a live-region announcement.

**Cheap test:** a plain page: the picker, systems reorder and proof reorder with View Transitions. Kill if fewer than roughly a third of visitors choose (then the page is only its default).

**Risk:** the default page must already be excellent; in-place reorder can disorient (NNG: keep text out of motion); must never imply a quote.

**Borrows:** the sentence form (Huffduffer sign-up, https://huffduffer.com/signup); composing a result from answers (gov.uk smart answers, https://www.gov.uk/check-uk-visa). New: the result is the homepage itself, rewritten in place, and the only persistent state is the honest reply clock.

---

## Dropped (novelty check failed)
- "Hear the hole" (scroll-pitched sonification): scroll-sound tools exist (PageTone/SonicScroll add-ons); audio fails reduced-motion and silent contexts.
- Engineering-drawing sheet with title block/revision table: Framer "Titleblock" template exists (https://www.framer.com/marketplace/templates/titleblock/).
- One continuous line drawn on scroll as the sole device: Framer "Threadline" component exists; kept only as a sub-element of concept 1.
- X-ray cursor and lensed-visor hero: already tried (spec 2026-10-29) and banned.

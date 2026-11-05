# ADR-001 — Direction for the blakra.us redesign: "Observatory", refined

Date: 2026-11-01. Status: accepted (owner delegated the choice to the lead: "decide yourself").

## Decision
Deepen system **A "Observatory"** (systems/systems.md): a near-black instrument-grade world, the
black hole as the one rendered object (a lensing ring), a calm porcelain android guide at its rim,
a depth gauge as the page's spine. Refined by the 25-site reverse-engineering synthesis and by the
best element of system C:
1. **Framed canvas, not a full-viewport world** (Anthropic, Runway, Stripe, Locomotive): the 3D stage
   sits in an inset frame; the document around it keeps native scroll, real headings, hairline grid.
2. **Short**: 6 screens on desktop (hero · the seven-layer stage, held for 2 · proof · one porcelain
   screen (people + product) · contact as the closing stage), not 10. The nine content beats remain
   as chapters; several share a screen.
3. **Type**: light display (Geist 300–400) at 72–96 px, mono metadata at 12–13 px (8–15× ratio),
   Newsreader italic only for the guide's one spoken line per chapter.
4. **Palette**: body #0b0b0d, porcelain #ece9e2, warm grey #8a8781, 12 % hairlines, ONE accent.
   Accent colour (orange #ff5a1f vs gold #d9a441) is decided in round 2 on side-by-side frames.
5. **From C**: the ground of the stage is a hairline grid that bends into the gravity well toward
   the ring (the "well is the grid" device), rendered in the canvas, not in the DOM.
6. **Guide**: the Astraía bust (Quentin Otani, CC BY) at the rim of the ring, head-and-shoulders,
   eyes holding the hole, orbiting rings as her own lensing; never docked as a badge, never over
   text, speaks one italic line per chapter beside her, reacts to cursor (gaze), scroll (rings'
   orbit speed), the picker and the form (layers light). Fallback if the model fails on the frame:
   the ring alone (direction.md O1).

## Alternatives rejected
- **B "Paper and Mass"**: the most usable, but it is the rejected site with a new face (pre-mortem
  O1/O5); the word-bend is a Format/Text-Pressure commodity.
- **C "Signal"** whole: freshest device, but a one-eyed probe guide risks mascot/cartoon and the
  owner wants a high-quality figure; its grid-well is kept.
- **Single-viewport WebGL world** (Lusion/Obys class): no native scroll, no product narrative, kills
  WPO on the Intel UHD.

## Why
The owner's bar is the Awwwards jury (design 40, usability 30, creativity 20, content 10) plus
"extremely modern, story- and motion-driven, a high-quality 3D guide". A framed dark observatory
with one object and one guide scores design and creativity; the document around it keeps usability
and content; the six-screen length and framed canvas are what the premium references actually do.

## Prediction and review
Prediction: the round-2 storyboard (six screens, desktop + phone) is approved by the owner without
a change of system, and the hero prototype holds 60 fps on the owner's Intel UHD with the framed
canvas. Review by: 2026-11-15. Confidence: medium. What would change it: the owner calls the dark
frames "seen before" or Astraía cannot be rigged/lit to premium on the frame → revisit C.

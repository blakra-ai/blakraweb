# Observatory build plan (lead, 2026-11-01)

Branch `observatory` (from `launch-fixes`). Design: `.firm/runs/2026-11-01-redesign/ADR-001-direction.md`,
`storyboard/storyboard.md` + `revision-1.md` (binding), `systems/systems.md` (system A), the frames
`storyboard/*.html` + `sb.css` (reference implementation of the look; copy values, not the code).
House rules: `.claude/agents/proj-art-direction.md`, `proj-motion-3d.md`, `proj-frontend.md`; `.firm/charter.md`.

## Architecture
- `src/features/observatory/` is the new world: `World.tsx` (ONE fixed canvas, R3F, mounted once after
  idle on capable GPUs, `frameloop="demand"` + invalidate on scroll/pointer), `shaders/well.ts` (the
  hairline grid bent into the gravity well; CSS-pixel grid, gold/grey lines), `shaders/ring.ts` (the
  lensing ring: dark disk, accretion glow in gold), `windows.ts` (registry of framed windows: each
  `<Window>` registers its page rect on reflow; the world renders each window with a scissor rect
  and its own camera framing; nothing per frame reads layout), `Window.tsx` (the DOM frame: 24 px
  inset, 16 px radius, min-height 100svh, height auto; aria-hidden canvas behind; children are real
  DOM), `Gauge.tsx` (the depth gauge in the 24 px gutter: stations 01…09, marker, mono readouts;
  phone: a 2 px progress rule + "04 / 09" chip in the nav), `state.ts` (the shared `obs` object:
  station, progress, windows, picker, pointer, still).
- The figure pipeline is reused from `src/features/navigator/figure/*` (loader, contract, Figure,
  living, speech, hair): the guide is mounted inside the world at the ring's rim; eyes hold the hole
  (visor shader). Model: Cyber Girl until Astraía arrives (`scripts/navigator-adopt.mjs`).
- Sections are rebuilt in `src/components/*` on the storyboard: Hero (window), Stage (held window,
  2 screens, words scroll over it; closes with the picker), Proof (DOM, hairline rows, no canvas),
  Porcelain (light screen: one large object + products + people in hairline rows), Contact (window).
  Copy stays in `src/content/locales/*` (one word changes: "orange stitch" → gold, four locales).
- Tokens: `src/styles/global.css` is rewritten to the Observatory system (body #0b0b0d, porcelain
  #ece9e2, grey #8a8781, hairline 12 %, gold #d9a441 for state only; Geist 300 display 84/56, mono 12,
  Newsreader italic 26 for the guide's line; three radii). Old Navigator-era CSS goes.
- Motion: native scroll, no pins (the held stage is `position: sticky` inside a CSS-height section);
  the only autoplay is the rings' slow orbit and the hair spring; everything else is scrubbed by
  scroll position (one easing); the hero's load device: the grid bends into the well over 900 ms.
  Reduced motion / no GPU: the prerendered HTML with a rendered still per window is the final state.

## Work packages (single writer per set of files)
- **WP-A foundation** (engineer A): global.css tokens + base, `Window.tsx`, `Gauge.tsx`, `state.ts`,
  the header (nav, language menu, motion toggle, compact CTA), the hero section markup with the
  window and a static still fallback. Files: src/styles/*, src/components/{Header,Hero,Section}.*,
  src/features/observatory/{Window.tsx,Gauge.tsx,state.ts}, src/content/* (the one word), tests.
- **WP-B world** (engineer B, parallel): `src/features/observatory/{World.tsx,windows.ts,shaders/*}`,
  the figure mount from the navigator pipeline, the scissor rendering, the load device, `?profile`
  timing. Owns src/features/observatory/* except the three files above.
- **WP-C hero live** (after A+B): wire Hero's window to the world, the guide's line, the readout,
  the gauge marker; measure 60 fps on the Intel UHD, Lighthouse mobile ≥ 90, scrub probe; specialist
  review; owner approval.
- Then WP-D stage (+picker), WP-E proof + porcelain, WP-F contact + form states, WP-G phone/tablet
  pass, WP-H cleanup of the Navigator-era code and e2e update.

## Done when
Owner approves the hero on the real page; all six screens match the revised storyboard on desktop
and phone; vitest, typecheck, build, e2e pass; Lighthouse mobile ≥ 90 / 100 / 100 / 100; 60 fps on
the owner's GPU with `?profile`; three specialists' reviews closed.

# ADR-003: A three.js world with screen-space lensing, smooth scroll without pins, and sticky sections
Date: 2026-10-26 · Status: accepted (supersedes ADR-002)
Confidence: medium
Prediction: on the owner's Intel UHD (Alder Lake GT2) laptop and similar integrated GPUs the world holds 60 fps when still; scrolling never jumps (no pins, no snapping, page height fixed after load); Lighthouse mobile performance stays ≥ 90 because three.js loads only after the page is up and lab tools get the static symbol.
Review by: 2026-12-15 (or after the first 1,000 real visits, with field INP/LCP data if available)
Outcome: pending

## Context
The owner rejected v4 as unclear, jumpy and low quality, then chose "a full 3D world (Igloo Inc / Lusion level), black hole and chakras both full and 3D", and allowed customizing ready-made resources with commercial licenses. ADR-002's single ray-marched shader drew 2D mandala planes, cost ~150 ray steps per pixel, and on the real GPU the governor dropped it to a blurry resolution. GSAP pins with snapping took over the scroll and changed the page height after load.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| Keep and extend the ray-marched shader (ADR-002) | exact lensing for everything | every new object multiplies per-pixel cost; flat symbols; already too slow on the target GPU |
| Port a ready-made lensing renderer (ebruneton/black_hole_shader, BSD-3; rmarchet/blackhole-ts, MIT) | physically careful | lookup-table pipeline or per-pixel marching to integrate; still heavy; no lotus geometry |
| three.js scene, two layers (behind the hole: lensed in screen space; in front: unbent), real geometry, postprocessing (bloom, AgX, grain, vignette) | real 3D petals and rings, cheap lens, standard ecosystem, every state a uniform | lensing is an approximation; ~160 KB gzipped more JS (loaded lazily) |

## Decision
The three.js world in `src/motion/world/`, loaded with a dynamic import after load. The black hole is a screen-space point lens over the "behind" layer plus a shadow; the disk and the moving orbits are drawn as far and near halves so the far half arches over the shadow. Procedural noise is baked once into textures (`bake.ts`). The seven centres are instanced petal meshes with traditional petal counts, a gem and a base plate (dial and yantra ribbons). Smooth scroll stays (Lenis, `?smooth=native` to compare), but nothing pins or snaps: long sections hold the screen with CSS `position: sticky` and read their progress from cached measurements (`src/motion/sticky.ts`). The camera follows a smoothed scroll position with frame-rate-independent damping, rests at each station, and eases between them with smootherstep. Render buffers are 8-bit (half the memory traffic of half-float); the governor settles quality in the first seconds while still and afterwards only steps down. A still rendered by the world itself shows from the first paint and the live world crossfades over it. No `backdrop-filter` over the canvas (it is recomputed every frame).

## Consequences
The scene cost was measured with vsync off on the owner's GPU: about 7–9 ms per frame at 1425×900. With 8-bit buffers at 0.85 pixel ratio, synthetic wheel scrolling shows the same share of slow frames as the page with WebGL disabled, so the 3D adds nothing measurable to the page's floor in that test. Lensing of objects in front of the hole is intentionally not computed. Software GPUs still get the static symbol; `?gl=force` previews the world anyway, and `?profile`/`?q=` exist for measuring on real hardware.

## Revisit if
Field data shows poor INP on mid-range phones, the approximation shows visible artefacts the owner rejects, or WebGPU becomes the better default.

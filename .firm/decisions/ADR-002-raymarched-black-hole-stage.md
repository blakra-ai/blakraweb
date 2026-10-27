# ADR-002: One raymarched WebGL2 shader for the black-hole and chakra stage, with a governor and a static fallback
Date: 2026-10-26 · Status: accepted
Confidence: medium
Prediction: on mid-range laptops and recent phones the stage holds about 60 fps after the governor settles; lab tools (Lighthouse, PageSpeed Insights) score performance ≥ 90 because they get the static symbol; no user reports of a hot or slow page.
Review by: 2026-12-15 (or after the first 1,000 real visits, with field data from CrUX if available)
Outcome: pending

## Context
The owner asked for intricate 3D tied to black holes and chakras, with no idle scroll. The site must stay fast and accessible.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| three.js / React Three Fiber scene | ecosystem, real meshes | ~150–250 KB more JS; true gravitational lensing still needs a custom shader |
| Pre-rendered video or image sequence | predictable cost | heavy downloads; can't react to scroll, pointer or state; not "live" |
| One fragment shader (ray integration with bending, emissive mandala planes) | about 6 KB, fully bespoke, lensing for free, every state a uniform | expensive per pixel; needs quality control and a fallback |

## Decision
The custom shader (`src/motion/engine3d/shader.ts`), rendered below native resolution. A governor steps quality between 5 levels based on frame intervals relative to the display's refresh rate. Software rasterizers never compile it: the inline SVG symbol shows instead. The shader compiles with `KHR_parallel_shader_compile` where available.

## Consequences
GPU cost scales with screen size, handled by the levels. The stage can't be checked visually in CI without a GPU; `?gl=force` exists for manual previews on such machines.

## Revisit if
Field data shows poor INP or LCP on mid-range Android, or WebGPU becomes the better default for this kind of effect.

---
name: navigator-figure-decisions
description: Architecture decisions for the Navigator GLB figure (elf-android) in src/features/navigator — asset contract, placeholder pipeline, hair, living-systems pattern; blueprint at .firm/runs/2026-10-30-navigator-film/blueprint.md
metadata:
  type: project
---

Decided 2026-10-30 (blueprint for the lead, run 2026-10-30-navigator-film):
- Placeholder GLB is built by a Node script with three's `GLTFExporter` (verified under Node 24: skins and node names round-trip; needs a `FileReader` shim). No `@gltf-transform` dependency in the repo; its CLI only via `npx` for the commissioned model.
- The asset contract is on glTF **node names** (`Eye_L/R`, `Face`, `Hair`, `Inner_*`, `Sys_01..07`, bones `Hips…Head`, hair chains `Hair_NN_k`), validated by a pure `validateNames()` shared by the loader and a Vitest contract test that parses the GLB JSON chunk. Metrics (head height, eye/mouth Y) are measured at load, so a model swap is file + `GLB_URL` only.
- Eyes must be rigid meshes under `Head` (the eye ShaderMaterial has no skinning); the eye shader is `visor.ts` re-aimed, not new.
- Hair = bone-chain Verlet in a pure module; shader sway is the named fallback if > 0.3 ms on the Intel UHD.
- One `stepLiving()` per frame writes `nav.perf`; both figure instances (world canvas, dock canvas) only apply it. All steppers pure, in `tests/`.
- The "dive into the eye" (brief delta / screenplay v1) is deferred: screenplay v2's nine beats glide to the dock instead.

**Why:** owner wants a commissioned realistic model (2–4 weeks) while the pipeline must ship now; charter forbids heavy deps, first-paint cost and scroll takeover.
**How to apply:** when later tasks touch the navigator, extend the contract/steppers rather than adding three code in components; keep anything the commission could change behind `contract.ts`.

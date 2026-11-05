# Blueprint: the Navigator as a GLB figure (architect, 2026-10-30)

Supersedes `Helmet.tsx`. Implements `character-brief.md` (asset contract) and `screenplay-v2.md` (living systems, nine beats). Keeps `nav`, the director, `withLens`, the Dock and Transmission's typing; extends them.

## 1. Options

| Question | Option | Pros | Cons | Verdict |
|---|---|---|---|---|
| Placeholder GLB | **A. Node script, three `GLTFExporter`** (`scripts/navigator-placeholder.mjs`) | No new dependency; verified today under Node 24 (skins + named nodes round-trip; needs a 6-line `FileReader` shim); reuses three geometry, so the stand-in looks like today's Navigator, not a mannequin; reproducible by `npm run navigator:glb` | Exporter is browser-first: no textures in Node (none needed) | **Chosen** |
| | B. `@gltf-transform/core` script | Purpose-built for Node, also compresses | New dev dependency; skin weights and inverse-bind matrices by hand; a second geometry vocabulary | Use its **CLI only**, via `npx`, to optimise the commissioned model |
| | C. Lab page + `GLTFExporter` download | Fully supported path | Manual download-and-commit; not reproducible in CI | No |
| Hair | **A. Bone-chain Verlet in code** (`hair.ts` pure, adapter sets bone quaternions) | Real lag on a head turn and lift on scroll (acceptance 3); capsule collisions; the commissioned model only has to skin its cards to the named chain bones | Solver cost (budgeted ≤ 0.3 ms, tested) | **Chosen** |
| | B. Vertex-shader sway | Near-free | No lag, no collisions; another `onBeforeCompile` layered on the lens patch | Fallback if the budget fails on the Intel UHD |

Obvious choices, not compared: node-name contract (glTF nodes are what `GLTFLoader` exposes as names); the eye shader is `visor.ts` re-aimed, not a new shader; all steppers are pure and run once in the ticker, both figure instances (world, dock) only *apply* the result.

## 2. Change map

| Path | Responsibility |
|---|---|
| `scripts/navigator-placeholder.mjs` (new) | Builds the stand-in from three geometry (ceramic head, two eye spheres, lids, ear fins, collar, torso, limbs, `Inner_*` skull plate/vertebrae/core, `Sys_01..07` emissives, 7 hair chains of 5 bones with skinned cards) → `src/assets/navigator/navigator.glb`. `npm run navigator:glb` |
| `src/assets/navigator/navigator.glb` (new, committed) | The asset. Commission replaces this file. |
| `src/features/navigator/figure/contract.ts` (new, pure) | `FigureContract`, `validateNames()`, `GLB_URL`, `FIGURE_TEXTURES` constants |
| `src/features/navigator/figure/loadFigure.ts` (new) | `GLTFLoader` + `MeshoptDecoder` (+ `KTX2Loader` behind the constant); resolves nodes, clones and lens-wraps materials, installs the eye shader, measures metrics → `Figure` |
| `src/features/navigator/figure/Figure.tsx` (new) | R3F component replacing `Helmet`; applies `nav.perf` to bones/materials; runs hair (world variant) ; writes `nav.anchor` |
| `src/features/navigator/living.ts` (new, pure) | Gaze, blink, ears, breath, systems ignition/mission lights → `Perf` |
| `src/features/navigator/hair.ts` (new, pure) | Verlet chains on `Float32Array`, capsules, fixed step |
| `src/features/navigator/speech.ts` (new, pure) | `placeCard()`, `jawOpen()` |
| `src/features/navigator/poses.ts` (new, pure) | Beat → `PoseKey`; `glide()` |
| `src/features/navigator/visor.ts` (modify) | Split the hole GLSL into a shared chunk; add `eyeFragment` (UV at pupil, 12° tilt, gold limb, `uBright`, `uBand`) |
| `src/features/navigator/state.ts` (modify) | Add `perf`, `anchor`, `line`, `enter`, `prevBeat`, `hover`, `pointer` |
| `src/features/navigator/director.ts` (modify) | Write `enter`/`prevBeat`; delegate `pointerover` on `main [data-layer]`/`[data-patch]` → `nav.hover` |
| `src/features/navigator/World.tsx` (modify) | Mount `Figure`; `Poses` uses `poses.ts`; `LensRig` anchors callouts to `rig.systems[i]`; `stepLiving` in the ticker next to the director |
| `src/features/navigator/Dock.tsx` (modify) | `Figure variant="dock"` (SkeletonUtils clone, head framing from metrics, no hair sim) |
| `src/features/navigator/Transmission.tsx` (modify) | Writes `nav.line`; positions the card from `nav.anchor.mouth`; "Look closer" on eye hover; 2.2 s rest then `data-phase="rest"` |
| `src/styles/global.css` (modify) | `.nav-type` placed by `--cx/--cy` transform, tail `::before` rotated by `--tail`; `rest` phase |
| `src/components/Hero.tsx`, `Hero.module.css` (modify) | Still: a drawn face (two disks, ears) in the same `.still` box |
| `src/content/types.ts`, `locales/{en,de,fr,es}.ts` (modify) | New nine lines, `navigator.lookCloser` |
| `package.json` (modify) | `navigator:glb` script |
| `tests/navigator-{contract,hair,living,speech,poses}.test.ts` (new) | See §6 |
| Delete after WP6 | `Helmet.tsx`; in `figure.ts` keep `glowTexture`, `collarTexture`; drop `SUBSYSTEMS`, `EXPLODE*`, `PART_BASE`, `finGeometry`, `bentPlate` (moved into the script) |

## 3. GLB contract and validation

Names are glTF **node** names; one scene; Y-up metres; figure 1.6–1.9 m; eyes are **rigid** `Mesh` nodes under `Head` (not `SkinnedMesh`: the eye `ShaderMaterial` has no skinning). Materials shared across outer and `Inner_*` nodes are cloned before wrapping.

```ts
// figure/contract.ts
export const CONTRACT = {
  meshes:  { required: ['Face', 'Eye_L', 'Eye_R', 'Hair', 'Collar', 'Torso'],
             optional: ['Arm_L', 'Arm_R', 'Leg_L', 'Leg_R', 'Lid_L', 'Lid_R'] },
  inner:   /^Inner_/,                     // at least one; lens 'inside'
  systems: ['Sys_01','Sys_02','Sys_03','Sys_04','Sys_05','Sys_06','Sys_07'], // all; emissive material
  bones:   { required: ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'],
             optional: ['Jaw', 'Mouth', 'Ear_L', 'Ear_R'] },
  hair:    /^Hair_(\d\d)_(\d)$/,          // chains 01..08 × bones 1..5; optional set
  morphs:  { optional: ['Blink_L', 'Blink_R', 'MouthOpen'] }, // on Face, used when Lid_*/Jaw absent
} as const

export interface ContractReport { ok: boolean; missing: string[]; hairChains: number; blink: 'lids' | 'morph' | 'none'; jaw: 'bone' | 'morph' | 'none' }
export function validateNames(nodes: Set<string>, morphs: Set<string>): ContractReport

export interface Figure {
  root: Group; bones: Record<'Hips'|'Spine'|'Spine1'|'Spine2'|'Neck'|'Head', Bone> & Partial<Record<'Jaw'|'Ear_L'|'Ear_R', Bone>>
  eyes: [Object3D, Object3D]; eyeMats: [ShaderMaterial, ShaderMaterial]
  blink: (closed: number) => void; jaw: (open: number) => void            // drivers resolved from lids/morphs
  mouth: Object3D; systems: Object3D[]; sysMats: MeshStandardMaterial[]
  hair: { bones: Bone[][]; rest: Float32Array } | null
  metrics: { height: number; headHeight: number; eyeY: number; mouthY: number; headZ: number } // measured from bones at load
}
```

Loader: collect names by `scene.traverse`, run `validateNames`; on failure throw in dev, `console.warn` and keep `gl-off` (the still) in production. Metrics are measured, so a commissioned model changes **no** constant; the only constants are `GLB_URL` and `FIGURE_TEXTURES: 'none' | 'ktx2'` (flipping it copies `basis_transcoder.{js,wasm}` to `public/basis/`).

## 4. Interfaces

| From → to | Contract |
|---|---|
| World ticker → `living.ts` | `stepLiving(input: LivingInput, dt, out: Perf)` once per frame; `LivingInput = { pointer, anchor, beat, progress, spokeAt, typingUntil, transmitAt, mission, hover, still, clock }` all read from `nav`. `Perf = { eyes:{yaw,pitch}, head:{yaw,pitch}, body:{yaw}, lids, jaw, ears:{prick,turn,glow}, breath, sys: Float32Array(7), bright, band }` stored at `nav.perf` |
| Figure (both variants) ← `nav.perf` | Applies: eye nodes rotate (±25° clamp already in Perf); `Head`/`Neck`/`Spine2` yaw-pitch; `blink(lids)`; `jaw(jaw)`; `Ear_*` z-rotation + `Sys_05` glow; `Spine2` forward 4 mm × breath; `sysMats[i].emissiveIntensity`; `eyeMats.uBright/uBand/uTime`; Collar map offset |
| Figure (visible one) → `nav.anchor` | `{ eyes:{x,y}, mouth:{x,y}, headPx, on }` in CSS px; writer = dock when `nav.atDock`, else world |
| `FigureRig` (renamed `HelmetRig`, same fields) | `{ group, systems: Object3D[], explode, assembled, float }`; `explode` now means "callouts open" (0..1), parts no longer move |
| Transmission → `nav.line` | `{ text, typed }` each tick; `jawOpen(text, typed, clock)` in `speech.ts` gives the jaw target (4 Hz envelope on vowel groups, 0 at `.`) |
| `nav.anchor.mouth` → card | `placeCard(mouth, viewport, card:{w,h}, mode:'hero'|'dock'|'phone') → { x, y, tail: deg }`; Transmission sets `--cx/--cy/--tail` |
| Director → poses | `nav.enter` (screens scrolled since the beat's top), `nav.prevBeat`; `poseFor(beat, ctx) → PoseKey { x, y, s, yaw, look: 'visitor'|'layers'|'patches'|'capsule'|'form', docked }` with `s = share·vhUnits / metrics.headHeight`; `glide(prev, next, smoothstep(enter/0.6))`; `still` snaps |
| Hair | `createHair(rest: Float32Array, chains, capsules) → HairState`; `stepHair(h, dt, headWorld: Float32Array(16), wind: [x,y,z])`; adapter in Figure writes bone quaternions from consecutive points. Wind = scroll velocity × −y + a 0.3 Hz noise |

## 5. Work packages (one engineer, in order)

| WP | Goal | Owns | Depends | Done when |
|---|---|---|---|---|
| 1 | Contract + placeholder GLB | `figure/contract.ts`, `scripts/navigator-placeholder.mjs`, `src/assets/navigator/navigator.glb`, `package.json`, `tests/navigator-contract.test.ts` | — | Test parses the GLB's JSON chunk, `validateNames` → `ok`, 7 hair chains, file < 1 MB, ≤ 40k tris |
| 2 | Pure performance modules | `living.ts`, `hair.ts`, `speech.ts`, `poses.ts`, `visor.ts` (eye GLSL), their tests | — (parallel-safe with 1) | Tests: eye clamp ±25°; eyes lead head; blink 70/120 ms and suppression; ear spring settles with one overshoot; 8×5 hair × 1000 steps < 300 ms, no point inside a capsule, rest lengths kept ±1%; `jawOpen` is 0 at `.` and > 0 on vowels; `placeCard` keeps the card on screen at 320–2560 px and the tail aims at the mouth; `poseFor` puts hero eyes at (0.70, 0.36) and head at 0.30 vh; `glide` monotone |
| 3 | Loader + Figure in the world | `figure/loadFigure.ts`, `figure/Figure.tsx`, `state.ts`, `World.tsx` (mount, ticker step) | 1, 2 | Hero shows the GLB with lens cut-away to `Inner_*`, systems ignite root→crown then eyes open; typecheck + build pass; first paint unchanged (Lighthouse unchanged) |
| 4 | Dock + speech card | `Dock.tsx`, `Transmission.tsx`, `global.css`, locales ×4, `types.ts` | 3 | Card tail points at the mouth at any size; lips move while typing; docked gaze follows the cursor; `locales.test` passes |
| 5 | Nine beats | `poses.ts` wiring in `World.tsx`, `director.ts` (enter, hover), `LensRig` callouts on `rig.systems` | 3 | Scroll through nine beats: places and glides per the v2 table, no jump (e2e: screenshot per beat) |
| 6 | Hair + still + cleanup | hair adapter in `Figure.tsx`, `Hero.tsx`/`.module.css`, delete `Helmet.tsx`, trim `figure.ts` | 3 | Hair lags a turn and lifts on scroll; `?profile` shows hair ≤ 0.3 ms; reduced motion = still; all four commands pass |

## 6. Test strategy

Pure modules under Vitest (node env, `tests/`): the done-when list above. Contract test guards the asset file itself, so a commission swap fails loudly before a browser opens. Integration via `npm run e2e`: one screenshot per `data-beat` with `?gl=force`, plus the hero with `film=off` (still). Perf: `?profile` prints hair/living step time.

## 7. Risks

| Risk | Mitigation |
|---|---|
| GPU cost: skinned 120k tris + two canvases | Dock clone loads once (cache by URL); dock skips hair; `Sys_*` glows are sprites, no post; governor `?q` lowers DPR first |
| Skinning + lens discard | Fragment-only patch is skinning-safe; eyes rigid by contract; shared materials cloned per outer/inner set; `customProgramCacheKey` keeps `lens-${keep}` |
| Uncanny eyes at 100 % height | Not in v2's nine beats (the dive is deferred); `uBright` capped; style-frame gate stays the owner's call |
| Hair over budget on Intel UHD | Fixed step, ≤ 3 substeps, 2 constraint passes; if `?profile` > 0.3 ms, drop to 6 chains, then the shader fallback |
| Copy in four locales | Nine new lines + `lookCloser` typed in `Dict`; `locales.test` enforces parity; the lead approves de/fr/es before WP4 lands |
| Placeholder shapes decisions the model later breaks | Only node names and measured metrics are relied on; the contract test runs on the commissioned file first |
| Rollback | Figure is behind `NavigatorStage`'s lazy import; `?film=off` keeps the still; keep `Helmet.tsx` until WP6, so WP3–5 can revert by one import |

## 8. Decision record

- ADR-1 **Placeholder via three `GLTFExporter` in a Node script** (reversible): zero new deps, reproducible; revisit if textures are needed in the stand-in.
- ADR-2 **Node-name contract, metrics measured at load** (one-way for the commission brief): swap = file + `GLB_URL`; what would beat it: VRM humanoid metadata, if the artist delivers VRM.
- ADR-3 **Eyes are rigid meshes under `Head`** (one-way, in the brief): avoids skinned custom shader; revisit only if the model needs eyelid-eye co-skinning.
- ADR-4 **Hair as bone-chain Verlet in a pure module** (reversible): shader sway is the named fallback.
- ADR-5 **One `stepLiving` per frame writes `nav.perf`; figures only apply** (reversible): both canvases perform identically, logic testable without WebGL.
- ADR-6 **The dive into the eye is deferred**: v2's nine beats glide to the dock; the eye shader keeps `uShow` as the seam.

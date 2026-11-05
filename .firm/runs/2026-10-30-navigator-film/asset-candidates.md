# Sourcing the Navigator's model (researcher, 2026-10-30)

Result: no ready-made realistic elf-android with a clear commercial licence exists on the
marketplaces searched (Sketchfab, CGTrader, TurboSquid, Fab, RenderHub, Superhive). Marketplace
pages are JS-rendered, so prices, licences and poly counts there are unverified.

## Routes, with the lead's recommendation

| Route | What | Cost / time | Fit |
|---|---|---|---|
| **A. Commission (recommended)** | A character artist builds to `character-brief.md`: GLB, ≤120k tris, 2k PBR, rigged, named eye meshes, inner set for the X-ray, seven `Sys_0i` emissives. | Owner's budget; typically 2–4 weeks | Exact |
| B. Licensed base + rework | A rigged elf body (Sketchfab "Free elf rigged and animated", CC BY 4.0, 25.7k tris; or "The elf girl", 15.7k tris, 4k PBR, licence unstated) reworked in Blender: add joints, plating, white hair, separate eyes. CC BY needs attribution somewhere on the site. | Blender time, no purchase | Partial: faces are game-stylised |
| C. MetaHuman | Licence now allows any engine/DCC (CG Channel 2025-06; free under $1M revenue). Hyper-real face, but heavy: needs strong decimation, and the web Creator is reported to close 2026-11-05 (unconfirmed). | Free + heavy Blender work | Face yes; risk of uncanny valley |
| D. AI generation (Meshy, Tripo, Rodin) | Paid tier for commercial rights; output needs retopology, rigging and eye separation in Blender. | ~$20–60/month + Blender | Quick look-dev only |

Ready Player Me is closed (2026-01-31). Character Creator 4 has no native glTF export.

## Pipeline (three 0.186)
- Decoders are already in `node_modules/three/examples/jsm/libs/` (draco, basis, meshopt).
- `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp`
  (check `optimize -h`: the meshopt flag on `optimize` is unconfirmed; `meshopt` also exists as its
  own command). Exclude the eye meshes from `simplify`/`weld`; simplify before rigging.
- Load with `GLTFLoader` + `MeshoptDecoder` (+ `KTX2Loader` if KTX2). Nothing breaking for
  GLTFLoader/SkinnedMesh in r181–r186; r181 brightened rough PBR surfaces, so check the white plates.
- Budget: head, neck and shoulders at 60–100k tris with 2k maps lands under 8 MB.

## Lead's note on realism
The researcher found no marketing site shipping a realistic rigged head, and warns that a realistic
face under a black-hole eye shader risks the uncanny valley. Mitigation already in the brief: a
porcelain, made-not-born face with visible seams, and the style frame as the gate.

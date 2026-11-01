# The Navigator's model

**Cyber Girl** by Rotmill, Sketchfab, CC Attribution 4.0 —
https://sketchfab.com/3d-models/cyber-girl-46640796f0dd4fbab5eba5262d542e25
(adopted 2026-11-01; the credit line is on the legal page).

`navigator.glb` is built from the Sketchfab glTF download (`cyber_girl.glb`, not committed: 28 MB)
with the intake script, which renames the Unreal-style bones to the contract, drops the second
copy of the figure the export carries, injects the hole-eyes on the eye bones, the lids, the seven
system lights and the X-ray inner set, re-encodes the textures as WebP and compresses the mesh:

```bash
node scripts/navigator-adopt.mjs ~/Downloads/cyber_girl.glb src/assets/navigator/source/cyber-girl.names.json \
  --drop '^(WhitehairPreview2?|Whitehair_|whitehair_)' --augment --eye-forward 3.0 --webp 80 --optimize
npx vitest run tests/navigator-contract.test.ts
```

The code-generated placeholder is still one command away: `npm run navigator:glb`.

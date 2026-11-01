# The Navigator's model

**Astraía** by Quentin Otani, Sketchfab, CC Attribution 4.0 —
https://sketchfab.com/3d-models/astraia-c0f37ac567d34fa8881ed7a79b335c4d
(adopted 2026-11-02; the credit line is on the legal page). Required credit:
This work is based on "Astraía" (https://sketchfab.com/3d-models/astraia-c0f37ac567d34fa8881ed7a79b335c4d)
by Quentin Otani (https://sketchfab.com/quentinotani) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

`navigator.glb` (3.1 MB) is built from the Sketchfab glTF download (`scene.gltf` + `scene.bin` +
`textures/`, not committed: 4K PNGs, 240 MB) with the intake script. The model is a porcelain
figure with six Biped-rigged arms, gold wire, floating shards and instruments, one clip
("Slow Mvt", 26.7 s, the arms' sway) and no humanoid skeleton for the head: the script

- drops the background sphere and the hand dummies, turns the scene 62° so she faces +Z,
- builds the Hips…Head chain with the Head pivot at the neck (`--head x,y,z`), parents the brain,
  mouth and eye sockets to it through bridge nodes (their own animation keeps working) and skins
  the one body shell, the skeleton and the neck muscles between Spine1 and Head across the neck
  band (`--skin-head`, `--neck`), so the head turns at the neck under the gold wire,
- replaces her eyeball meshes with the hole-eyes on their sockets, adds the lids, jaw, the seven
  system lights (hidden in the Observatory) and the X-ray inner set,
- moves the baked emissive maps into the base colour (`--bake-look`), drops transmission and
  clearcoat, warms the blue bake to porcelain and makes the organs and bones monochrome (`--tint`),
- names the four far arms, their bracelets, the compass and the two held spheres `Far_*`, which
  the Observatory hides for the bust crop (Guide.tsx / windows.ts),
- re-encodes the textures as WebP (body 2048, the rest 1024) and compresses with meshopt.

```bash
node scripts/navigator-adopt.mjs ~/Downloads/astraia/scene.gltf src/assets/navigator/source/astraia.names.json \
  --drop '^(FOND ROND001|Main Low0)' --yaw 62 --augment --head 0.017,0.22,0.05 --neck 0.16,0.27 \
  --head-meshes '^(Cerveau Low|Bouche_low001|Group005|EyeSocket_)' --skin-head '^(Face|Retopo 001|Crane Low uv|Muscles00[4-7])' \
  --eye-forward 0.75 --bake-look --tint '1.85,1.55,1.17:Body_Ext|Bras_Ext;grey:Organes|material|body_Int|Muscle_Int|Bras_Int' \
  --webp 80 --tex-max 2048 --tex-hi 'Body_Ext' --optimize
npx vitest run tests/navigator-contract.test.ts
```

The earlier model, Cyber Girl by Rotmill (CC BY 4.0), keeps its name map in `cyber-girl.names.json`.
The code-generated placeholder is still one command away: `npm run navigator:glb`.

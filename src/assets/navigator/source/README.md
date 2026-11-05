# The Navigator's model

**Mecha roe deer** by Osho, Sketchfab, CC Attribution 4.0 —
https://sketchfab.com/3d-models/mecha-roe-deer-6c25867eda6a4dafb274eb9efd37ebfd (adopted 2026-11-02; the
credit line is on the legal page). Required credit:
This work is based on "Mecha roe deer" (https://sketchfab.com/3d-models/mecha-roe-deer-6c25867eda6a4dafb274eb9efd37ebfd)
by Osho (https://sketchfab.com/Crysis007-94) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

`navigator.glb` (1.0 MB) is built from the Sketchfab glTF download (`scene.gltf` + `scene.bin` +
`textures/`, 4K PNGs): seven rigid meshes, no bones, no clips. The script cuts the head off the body
and strip meshes by a plane just above the top neck vertebra (`--split`), turns her −135° so she
stands three-quarter facing the words, builds the Hips…Head chain with the pivot at the neck top
(`--head`), parents the head parts and lenses to it (`--head-meshes`), puts Eye_L/R empties on her
lenses (`--eyes-at`: the gaze turns only the head), makes every emissive material gold with a
monochrome mask (`--glow`; the bottles go dark and graphite), lowers the chrome to 0.6 metalness
so it reads silver (`--metal`), and encodes the body's maps at 2048, the rest at 1024.

```bash
node scripts/navigator-adopt.mjs ~/Downloads/mecha-roe-deer/scene.gltf src/assets/navigator/source/mecha-deer.names.json \
  --split '^(Face|Strips)$=0,2.555,0,0,1,0' --yaw -135 --augment --head -0.562,2.58,0.477 --head-meshes '^(Head_|Face|Strips_Head|Lenses)$' \
  --eyes-at '-0.997,2.65,0.474;-0.559,2.65,0.912' --glow '#d9a441:^(E_Neck|E_Head|E_Eyes|Material\.002)$:8.75;off:^Bottles$' \
  --metal '0.6:^Material\.001$' --tint '0.2,1,0.2:^Bottles$' --webp 80 --tex-max 2048 --tex-hi 'Material\.001' --optimize
```

The earlier models, Astraía by Quentin Otani and Cyber Girl by Rotmill (both CC BY 4.0), keep their
name maps in git history and `cyber-girl.names.json`. The code-generated placeholder is still one
command away: `npm run navigator:glb`.

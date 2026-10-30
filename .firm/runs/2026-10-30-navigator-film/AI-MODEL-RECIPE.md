# Generating the Navigator with an AI 3D tool (Meshy / Tripo / Rodin)

Owner's route, 2026-10-31. The tool gives one rigged body mesh; `scripts/navigator-adopt.mjs`
injects what the site needs (eyes, lids, jaw, the seven lights, the inner set) and renames the bones.

## 1. Account and licence
Use a **paid tier** (commercial rights). Free tiers are CC-BY or non-commercial depending on the
tool and month; read the current terms once.

## 2. The prompt (text to 3D, or image to 3D with the four references)
Prefer **image to 3D** with the reference portraits you sent me (the white-haired elf in the white
room is the best single reference), plus this text:

> Full-body humanoid android woman, elf. Realistic porcelain-pale face, calm neutral expression,
> closed mouth, eyes open looking straight ahead. Long pointed elf ears swept back and up. Long
> straight white-silver hair with a soft fringe, falling behind the shoulders. Slim, tall frame.
> Mechanical neck with exposed graphite vertebrae and a white ceramic ring collar; chrome ball
> joints at the shoulders; white ceramic armour plates over a dark graphite body with fine panel
> lines; a small round window at the solar plexus. A-pose, arms slightly away from the body, feet
> together. Clean studio lighting, no background, PBR materials, game-ready.

Negative / avoid: helmet, visor, weapons, wings, open mouth, dynamic pose, cape, background.

## 3. Settings
- Style: **realistic**, not stylised/cartoon. Symmetry on.
- Topology: **quad**, target **60k–120k triangles** (the site's budget is 150k).
- Textures: **PBR** (base colour, normal, metallic-roughness), **2048**. No baked lighting.
- Pose: **A-pose**. Rigging: turn on the tool's **auto-rig** (humanoid / Mixamo-compatible).
- Export: **GLB**, with textures embedded, Y-up, metres (scale ≈ 1.75–1.80 m; the script checks).

## 4. Pick the best of several
Generate 4–8 variants; judge the face at the tool's closest zoom: eyes open and even, ears long,
mouth closed, hair not fused to the shoulders in a blob. Ignore colour, we can tune materials.

## 5. Send me the file
Put it anywhere and tell me the path, or drop it at `src/assets/navigator/incoming.glb`. Then:

```bash
node scripts/navigator-adopt.mjs src/assets/navigator/incoming.glb --dry
```

prints the bones found (Mixamo names are mapped automatically), the triangle and texture counts,
the auto-placed eyes and lights. If the eyes land wrong, give me the correction and I pass
`--eyes "x,y,z,r"` offsets; then the real write:

```bash
node scripts/navigator-adopt.mjs src/assets/navigator/incoming.glb --augment --optimize
npx vitest run tests/navigator-contract.test.ts
```

## 6. What the AI route cannot give (and what we do instead)
- **Moving hair**: the tool's hair is part of the body mesh. The site's hair simulation stays
  off for this model (no `Hair_XX_n` chains); a later Blender pass can add card strips on chains.
- **Blink and lips**: injected lids and a jaw node work, but the jaw moves nothing on a
  single mesh, so lips stay closed; blink works (lids are separate shells).
- **Ear flicks**: no `Ear_*` bones, so ears stay still (the tip glow is on the crown light).
- **Inner set (X-ray)**: the lens shows an injected inner skull and spine, not the tool's model.

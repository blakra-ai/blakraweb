# The Navigator, second design: the elf-android

Owner, 2026-10-30 (evening): five references, "design our model like this: professional, beautiful,
every size right, fitting the site." The references are an elf-android: a realistic humanoid face,
long pointed ears, white hair, a mechanical neck and shoulders under sleek white and silver plating
(Elf Xuan 2.0; elf-cyborg concept art; a full-android head).

Decisions (owner, 2026-10-30, after the lead's options):
1. **Production:** a real rigged 3D model (GLB) loaded into the existing three.js stage. Not
   procedural geometry (a realistic face cannot be drawn in code), not rendered stills (the film
   needs a live turn, the X-ray lens and the dive).
2. **Where the hole lives:** in the eyes. The visor is gone; the irises are the lensed disk and
   the pupils the shadow. The film enters through an eye and leaves through it.

Confidence: high on 1 (the stage, the lens and the rig are already 3D). Medium on 2: the dive into
an eye is a stronger image than a visor, but it costs two screenplay beats. What would change it:
if the eye close-up reads as uncanny in the style frame, fall back to a helmet with an open visor.

## Character sheet

| Part | Direction | From reference |
|---|---|---|
| Face | Realistic, androgynous-leaning-feminine, porcelain skin with a faint ceramic sheen, calm mouth, no expression at rest. Fine seam lines at the jaw hinge and temple, so it reads as made, not born. | 1, 4 |
| Eyes | Large, slightly wide-set. Iris = the seven-colour accretion disk, pupil = the hole's shadow, a thin gold limb (the rim). Blinks, follows the cursor. **Separate eye meshes required.** | site identity |
| Ears | Long, swept back and up at ~35° from horizontal, 1.1 head-heights long, tip slightly outward. Lit at the tip in the crown's violet (the comms, as now). | 2, 4, 5 |
| Hair | Straight, white-silver, long at the back (to the shoulder blades), parted or a soft fringe. Cards, not strands: ≤ 8k triangles, alpha-tested, no transparency sorting. | 4, 5 |
| Forehead | A fine circlet or inlaid line (the crown's mark), brass-gold. | 1 |
| Neck | Mechanical: a ceramic ring collar, then exposed graphite vertebrae with a chrome rod, pistons at the sides. The seven yantras engraved on the collar (keep the current collar texture). | 2, 3 |
| Shoulders | Chrome ball joints exposed, white ceramic pauldrons set a little apart from the body. | 2, 4, 5 |
| Torso | White ceramic plates over a graphite body, panel lines, a core window at the solar plexus (yellow), the control unit above (the heart, green). Slim, long frame (an elf's). | 2 |
| Arms, hands | Ceramic sleeves over chrome bones, jointed hands, at rest. | 2 |
| Legs | Long; pointed boots. Rarely in frame: low detail. | — |

**Palette**, the site's tokens: ceramic `#e7e4de`, graphite `#2a2a30`, chrome, brass-gold accents,
the orange thread `#ff5a1f` only as the light trail and the eye's limb, the seven chakra colours as
the seven subsystem lights (root at the pelvis … crown at the ear tips and circlet).

**Proportions** (measured against the site, not guessed): 8 heads tall. In the hero the head is
the subject: eyes at (0.70, 0.36) of the viewport, the head 30% of the viewport's height, the
figure cut at the chest by the headline's top edge: it never crosses the headline's box
(screenplay rule). Phones: head 24% of height, centre (0.5, 0.30).

## The asset, technically

| Requirement | Value |
|---|---|
| Format | glTF 2.0 binary (GLB), Y-up, metres, 1 unit = 1 m, figure 1.78 m |
| Budget | ≤ 120k triangles total (face ≤ 30k, hair ≤ 8k), ≤ 8 MB on the wire after meshopt + KTX2 |
| Textures | PBR metal-rough; face 2k, body 2k, hair 1k; no baked lighting |
| Rig | Skeleton with at least: head, neck, jaw (optional), eyes (L/R bones or separate meshes), clavicles, shoulders, elbows, wrists, spine (3), hips. Humanoid naming (Mixamo or VRM) so idle clips can be retargeted |
| Separate meshes (named) | `Eye_L`, `Eye_R`, `Hair`, `Face`, `Collar`, `Torso`, `Arm_L/R`, `Leg_L/R`, and an **inner set** `Inner_*` (skull plate, vertebrae, core, control unit) for the X-ray lens |
| Lights | Seven emissive meshes or materials named `Sys_01` … `Sys_07` (root … crown), so the code can light them per layer |
| Pose | A-pose or relaxed idle, eyes forward, mouth closed |
| Clips (bonus) | `Idle` (breath, 6 s loop), `Blink` |
| Licence | Commercial web use, modification allowed, no attribution on the page required |

## The code's side (unchanged contracts)

- `HelmetRig` keeps `group`, `parts[7]`, `explode`, `assembled`, `float`. `parts[i]` becomes the
  group of `Sys_0i` plus its plate; the explode offsets stay.
- The lens: every outer material is wrapped with `withLens(mat, 'outside')`, every `Inner_*`
  material with `withLens(mat, 'inside')`. The eye shader keeps its own `uLens` test.
- The eye shader is the current `visor.ts` lensed-hole shader, mapped onto a sphere: UV centred on
  the pupil, the disk tilted 12°, the limb in gold.
- Loading: `GLTFLoader` + `MeshoptDecoder` + `KTX2Loader` (all in three's examples); preload after
  the page is idle, as `NavigatorStage` already does; the drawn-still fallback stays for no-GPU.
- The dock badge becomes the head only (the face in a circle).

## Screenplay deltas

| Beat | Before | After |
|---|---|---|
| 01 Suit up: power-on | The helmet assembles: shell, collar, visor slide home. | The figure arrives already whole, in darkness; the seven systems power on root to crown, the eyes open last (lids 0 → 1 over 0.4 s) and the disk ignites in them. Hair settles. |
| 01: the look | The helmet turns to face you squarely. | She turns from the cursor to face you; her gaze lands on the centre. |
| 01: the dive (0.35–1.10) | Dolly into the visor until it fills the screen. | Dolly into the **right eye**: the iris grows from 4% to 100% of the screen's height; the gold limb sweeps past the edges; at s = 1.0 we are inside. The far eye and the face fall out of focus (depth of field in the composite, not the GPU). |
| 04: the exit (3.50–3.95) | Pull back out through the visor; the helmet re-forms. | Pull back out through the eye; the face re-forms around it; a blink as we leave. |
| 04: the patch wall | Helmet glides left, 34% of height. | Head and shoulders glide left, head 24% of height, centre (0.24, 0.50). Hover a patch: the systems light on her collar and chest. |
| 08: your mission | The patch on the helmet's chest. | The patch on the chest plate, under the control unit. On Send: the ear tips light, she closes her eyes, the thread rises. |

Everything else (the pull, the layers, the launch, the flight plan, the crew) is what she sees and
does not change.

## Open items

- Asset source: see `asset-candidates.md` (researcher, pending): a licensed model to adapt, or a
  commission. The prototype uses a placeholder humanoid to prove the pipeline.
- Uncanny-valley check on the style frame: eyes at 100% of the screen must read as a cosmic image,
  not a medical one. Falls back to the open-visor helmet if it fails.

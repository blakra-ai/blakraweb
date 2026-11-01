# Guide-figure model search (2026-11-01)

Method: Sketchfab public API, 37 queries (downloadable, CC0/BY/BY-SA, 20k-150k faces; second pass with animated=true), about 530 unique hits, 47 thumbnails viewed. Thumbnail dir T = /tmp/claude-1000/-home-ashen-Documents-projects-blakraMain/ff8ff7fc-6220-4163-9f6a-f5f95d216b2c/scratchpad/model-search/thumbs/ (file = first 8 chars of uid + .jpg).

Important data limits:
- Sketchfab's API does not expose `isRigged` in search or in the model endpoint I could reach. "Anim" below is `animationCount`. Anim 0 does NOT prove unrigged; it is UNCONFIRMED until the GLB is opened (check for `skins` / JointNodes).
- Texture size is not in the API. The glTF archive size is a proxy (over 40 MB almost surely means 4K maps; resize to 2K needed).
- Every Sketchfab hit here is CC Attribution (BY 4.0). Attribution on the site is required. No CC0 hit passed the quality bar.
- "Cyber Girl" by Rotmill (46640796) is already adopted in the repo, so it is excluded from the ranking.
- Quality scores are from thumbnails only, not from inspecting the mesh.

## Ranked table

Columns: Q-s = sculpt, Q-t = textures, Fit = calm guide (all 1-5).

| # | Name | Author | Link | Licence | Faces | Rig / anim | Textures (glTF zip) | What | Q-s | Q-t | Fit | Risks | Thumb |
|---|------|--------|------|---------|-------|-----------|----------|------|-----|-----|-----|-------|-------|
| 1 | Astraia | Quentin Otani | https://sketchfab.com/3d-models/c0f37ac567d34fa8881ed7a79b335c4d | CC-BY | 111,626 | 1 clip, rig UNCONFIRMED | 27 maps, 205 MB zip (likely 4K) | Porcelain android with a human face and six arms, armillary rings. Meditative. | 5 | 4 | 4 | Heavy download, must downsize to 2K. Arms and rings float and may be loose pieces. Bust crop is natural. 2021. | T c0f37ac5.jpg |
| 2 | BOT VIPE | Oscar Creativo | https://sketchfab.com/3d-models/240c1f80db55416a99fa2ccd33da0efc | CC-BY | 37,582 | 1 clip, rig likely | 21 maps, 11 MB | Orange spherical drone with a screen face (eyes, mouth). Original design. | 4 | 4 | 5 | Cute rather than serious. Face is a texture, so the eyes are easy to replace. 2018. Author also posts many licensed-look "free" models, so check this one is original. | T 240c1f80.jpg |
| 3 | Robot (A-T-A-D-M) | dangry | https://sketchfab.com/3d-models/c46bd21f1d284ae0b4bda7ac577448c2 | CC-BY | 67,748 | 1 clip | 29 maps, 104 MB (4K likely) | Weathered black and gold robot, round head with two glowing eyes. | 4 | 5 | 3 | Moody and battered, not warm. The two eye lights are an ideal swap point. Pose is leaning. 2019. | T c46bd21f.jpg |
| 4 | An Unsatisfactory Upgrade (RIGGED) | Olumide | https://sketchfab.com/3d-models/1ff39d706599443e951bb743a9324234 | CC-BY | 37,242 | 0 clips, title says rigged | 6 maps, 18 MB | Steampunk robot with a CRT box head showing glowing eyes. | 4 | 4 | 4 | Angry eye preset in the thumbnail. Swapping it fixes that. Rig needs checking. 2021. | T 1ff39d70.jpg |
| 5 | Robot / 2020 | Ulises Alvarado | https://sketchfab.com/3d-models/c0dadae4d1884bf48615f1ee301fe7e6 | CC-BY | 75,728 | 0 clips, rig UNCONFIRMED | 3 maps, 49 MB (4K) | Riveted steel Iron-Giant-style robot, round face plate with two dot eyes. | 3 | 4 | 4 | Likely static. Needs rigging if unrigged. Full body, bulky. 2022. | T c0dadae4.jpg |
| 6 | To the Stars (Astronaut) | dark_igorek | https://sketchfab.com/3d-models/9c55bc97e009454cb768e3c9c84dbac4 | CC-BY | 124,946 | 0 clips, rig UNCONFIRMED | 28 maps, 95 MB | Retro space-patrol woman, bubble helmet, white hair. Fits a space/gravity theme. | 4 | 5 | 4 | Real human face, so eyes cannot be swapped without uncanny effect. Sexualised styling is mild. 2025. | T 9c55bc97.jpg |
| 7 | Gynoid 2000 Series | Loves_Art | https://sketchfab.com/3d-models/56993f528d7041f9b734c0221f5dffe0 | CC-BY | 24,148 | 1 clip | 9 maps, 11 MB | White android, blue glass visor with a drawn face. | 3 | 4 | 3 | Hyper-feminised proportions, off-brand for B2B. Visor is a good eye host. 2025. | T 56993f52.jpg |
| 8 | 360 Sphere Robot | mikeramos | https://sketchfab.com/3d-models/a0bd28b7133648848427a5c27975611b | CC-BY | 30,188 | 1 clip | none (material colours), 0.5 MB | White orb robot, black visor with cyan expressive eyes (EVE/BB-8 feel). | 3 | 3 | 4 | Simple surfaces. Clean and calm. No body for a bust crop but a drone is fine. 2020. | T a0bd28b7.jpg |
| 9 | Employee | Dotflare | https://sketchfab.com/3d-models/9d1098bc72a74bb1b6371aef4b987100 | CC-BY | 34,718 | 4 clips | 4 maps, 29 MB | Stylised gas-mask hazmat worker, orange suit. | 5 | 5 | 3 | Face hidden behind a mask. Eyes would sit in the goggles. Industrial feel. 2023. | T 9d1098bc.jpg |
| 10 | Animated Astronaut Character | LasquetiSpice | https://sketchfab.com/3d-models/8fe5c8d3365e4d87bb7bc253d53a64e1 | CC-BY | 58,312 | 4 clips | 8 maps, 22 MB | Realistic NASA-style EVA suit. Gold visor could reflect the black hole. | 3 | 4 | 3 | Generic. Several near-duplicate uploads by the same author (same 58,312 faces). 2022. | T 8fe5c8d3.jpg |
| 11 | Gynoid 1000 Series | Loves_Art | https://sketchfab.com/3d-models/69fe1348d12c4338b2d32b7f3f3393d3 | CC-BY | 41,276 | 1 clip | none (material), 0.8 MB | Chrome mannequin android, blank black oval face. | 3 | 3 | 3 | Hyper-feminised, walking pose. Blank face is an ideal eye host. 2024. | T 69fe1348.jpg |
| 12 | Robo Bun | futaba@blender | https://sketchfab.com/3d-models/88b7c991fb1f40fd87af4141c923fecb | CC-BY | 38,350 | 1 clip | 31 maps, 48 MB | Robot bunny with gold armour, red eyes. | 4 | 4 | 2 | Furry/anime flavour, gaudy palette. 2022. | T 88b7c991.jpg |

Seen and rejected: Ghost in the Shell Cyborg Head, K-2SO, Among Us, Chappie, BT-7274, 2B, Detroit RK900/RK200, Wall-E, Spartan (all licensed IP); Maschinenfrau5000 (nun, odd), BS-V1 Cyborg 147k (35 maps, 336 MB, unrigged, heavy), Cyborg model 001 (20k, stylised, anim 0, tiny textures), Medical Android (faceless block head), Lost robot (thumbnail is a scene), Roxxy (animatronic fan style), Cute Robots (flat colours), Comic Drone (no face), Sci-Fi Helmet/B.E.N. head (no rig, no face).

## Other sources

- **Mixamo** (Adobe ID required): Adobe FAQ states characters and animations are royalty-free for personal, commercial and non-profit use (https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html, found via search snippet; the page fetch timed out so UNCONFIRMED against the live page). Cannot be redistributed standalone, only inside a project. Auto-rigs and animation clips are the strength. Sci-fi-leaning characters, from memory (UNCONFIRMED, library was not browsable without login): Y Bot, X Bot (neutral mannequin robots), Vanguard (armoured soldier), Swat, and the sci-fi suited variants. Poly counts are about 10k-30k and textures are modest. Quality bar probably not met except as a rigging fallback.
- **Quaternius** (CC0): Sci-Fi Essentials Kit has animated robot enemies, glTF/FBX (https://quaternius.com/packs/scifiessentialskit.html). Low-poly, below the 20k and detail bar. Useful only as a CC0 fallback.
- **Khronos glTF-Sample-Assets**: BrainStem robot is under the Poser EULA (Smith Micro), not a free commercial licence. Excluded.
- **Fab**: search showed paid or unconfirmed listings (MOD android, Robot Beepo, RL1). No listing confirmed free. Fab is not queryable without the browser UI. UNCONFIRMED.
- **Poly Pizza**: not checked (low-poly CC0, expected below the bar).
- **Ready Player Me**: closed, as stated.

## Top 3

**1. BOT VIPE (240c1f80).** The best fit for a calm guide. It is an original drone with a round screen face, 37k faces, 11 MB, and one animation clip. A face on a screen means the two eyes are simply a quad or a texture to replace with the black-hole shader, so no uncanny risk and no human styling. It reads friendly and calm, and there is no body to crop. Risks: 2018 asset, medium sculpt detail, check that the rig exists.

**2. Astraia (c0f37ac5).** The highest sculpt quality found, and the mood matches "software with gravity": a serene porcelain android with orbiting rings. It has a real face, so you would replace the eyes inside a human-ish head. Fine for a bust. Risks: the 205 MB archive means 4K textures, which need downsizing, and the many floating arms and rings mean heavy mesh cleanup and a rig that may not be a normal humanoid skeleton.

**3. Robot A-T-A-D-M (c46bd21f).** Strong PBR detail and a head with two clearly separate glowing eyes, the cleanest eye-swap target among the detailed models. Darker and more battle-worn than the brief, so lighting must soften it. Fallback if you want a robot: Unsatisfactory Upgrade (1ff39d70).

Honest summary: Sketchfab's free, downloadable, rigged and high-detail pool is thin. Nothing found matches the quality of the adopted Cyber Girl, and no model is a verified rigged humanoid bust. Every pick needs a glTF open check (skin, texture size) before commitment.

# Model search 3: animated guide character (2026-11-02)

Method: Sketchfab API `/v3/search` (downloadable, animated, licenses=by+cc0, sort -likeCount), 72 queries, about 1,900 unique hits, filtered to animationCount >= 3, then `/v3/models/<uid>` for each pick. Sheet: `model-search-3-sheet.jpg`.
The model API returns **only animationCount, not clip names**. Names below come from the author's description where given; otherwise UNCONFIRMED (open the GLB to read them).
No CC0 hits passed the bar. All 9 are CC-BY 4.0, so the author must be credited.

| # | Name | Author | Link | Licence | Faces | Clips | Clip names | Look | Risks |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Rover | sidarthmenon | https://sketchfab.com/3d-models/c06453eb88544733b1d7f5b9ded70a19 | CC-BY | 19k | 10 | UNCONFIRMED ("pet / feed bones" game) | Big-eyed cartoon boxer puppy, very cute | Organic, not tech; would need a sci-fi re-skin |
| 2 | NORA | newyearstudios | https://sketchfab.com/3d-models/333f5adb95b340b19fc5a6113b247993 | CC-BY | 47k | 10 | UNCONFIRMED | White panelled mech quadruped, red sensor eyes | Face reads as insect-like; it is long and spidery, not cute |
| 3 | Sketchbot | e-toma | https://sketchfab.com/3d-models/37c871cbd9174f67bda4c10d19a97ed0 | CC-BY | 52k | 5 | base pose, computation (download/upload), error/caution, love, alert/alarm | Floating droid, dark visor with cyan pixel eyes, very expressive | No walk (it hovers); Sketchfab challenge mascot (brand-adjacent) |
| 4 | Robot "Courier-all-terrain" | Dmitry Blagodaryov | https://sketchfab.com/3d-models/2626b4a125ed4623936afc76c7a6483d | CC-BY | 27k | 13 | UNCONFIRMED | Orange dog-like head on a six-legged spider body | Goofy but busy silhouette; legs could read as creepy |
| 5 | Robot dog Unitree Go1 | C. Yamahata | https://sketchfab.com/3d-models/926627f69b194b6da4fbf8a31df49303 | CC-BY | 55k | 18 | UNCONFIRMED (Unitree demo gaits) | Real robot dog, grey and clinical | No face; it is a real company's product (trademark), and the CC-BY is a re-upload of Unitree's preview GLB, so the licence chain is doubtful |
| 6 | Magnetbot (Animated) | MMKH | https://sketchfab.com/3d-models/c4168ccda4dd4c10b5995bf824025007 | CC-BY | 5.9k | 5 | UNCONFIRMED | Smiling screen-face bot with magnet arms, toy-like | Biped, game-jam quality, saturated colours |
| 7 | M4-RTI | HighPolyDensity | https://sketchfab.com/3d-models/1c0e3f3f4e774f7fa9aa066ee1df4f9f | CC-BY | 7.5k | 5 | UNCONFIRMED | Lobster-like recon micro-droid, sleepy glowing eyes | The "spying" backstory; looks fleshy red in the thumbnail |
| 8 | Cute Robots - Low Poly | m1ch3lang3lo | https://sketchfab.com/3d-models/c9938d49af2d4bf7abe40e366d37a5d0 | CC-BY | 129k (3 bots) | 9 | Run, Jump, Idle (x3 bots) | Pastel capsule bots with dot eyes | Too simple for a hero; no walk or sit |
| 9 | Stylized Robot - Low Poly Game-Ready | CharlieCatling | https://sketchfab.com/3d-models/c783c82985ad40d5800530f95072f765 | CC-BY | 16k | 14 | UNCONFIRMED | Rusty iron robot with green goggle eyes and a neon tube | Grungy, not clean-futuristic; humanoid-ish biped; brand-new upload (2026-08) |

Rejected: Sox Lightyear and "Robotic Cat" (Mylom) are the same 69,664-face mesh of Pixar's Sox, so they are licensed IP. Excluded REPO Robot, FNAF, Murder Drones, Digimon and Animal Company as IP. Poddy M1 is a cute floating droid, but its author says its 6 "clips" are poses and it is "not really animated". Robo-wolf (victory_, 5 clips) is too aggressive. Tour IA (diegonachon, 5 clips, white droid with green eyes, https://sketchfab.com/3d-models/571baf9cfcd74cc69eaa22d423678b25) is an alternate if Sketchbot is rejected.

Quaternius (CC0): the Animated Robot (14 clips incl. idle/walk/run/sit/wave/yes/no, the base of three.js RobotExpressive), the Animated Mech Pack and the animals packs (idle/walk/run/jump/death) are clean and well animated. But they are flat-shaded low-poly and generic, which is **below the "high quality, attractive" bar** for a hero guide. They are fine as a stopgap or prototype rig.

## Top 3
1. **Sketchbot (#3)**: best face, very clearly visible and expressive, and fits dark windows with cyan on gold. 5 emotive clips, but it hovers, so there is no walk (a bob plus drift can substitute).
2. **NORA (#2)**: closest to the mech-animal brief, with 10 clips and a clean white look on paper sections. Its face is weak.
3. **Courier-all-terrain (#4)**: goofy, techy, 13 clips, and has a dog-like head. Check that its legs do not read as spider-creepy.

Honest gap: there is no free CC0/CC-BY **robot cat/fox with a cute face and walk+idle+sit** at hero quality on Sketchfab. The realistic options are a droid (Sketchbot) or a commission or re-skin.

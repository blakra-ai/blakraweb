# Delivering the Navigator's model

What the artist delivers: one `navigator.glb` to `character-brief.md` ("The asset, technically").
What we do with it, in order:

1. Report only: `node scripts/navigator-adopt.mjs path/to/their.glb --dry`
   Prints nodes, triangles, textures, and which contract names are missing, plus a
   `names.json` skeleton.
2. If names differ, fill `names.json` as `{ "theirNodeName": "Eye_L", ... }` and run again with it.
3. Write it (optionally compressed): `node scripts/navigator-adopt.mjs their.glb names.json --optimize`
   → `src/assets/navigator/navigator.glb`
4. Guard: `npx vitest run tests/navigator-contract.test.ts` (names, hair chains, lids/jaw, size).
5. Look: `npm run dev`, open `/?gl=force`; check `?profile` for the hair cost on the Intel UHD.
6. Tune only constants if needed (eye shader limb width, systems glow) — no code paths change.

Return to the placeholder any time: `npm run navigator:glb`.

## Adopted: Cyber Girl (2026-11-01)
The live model is "Cyber Girl" by Rotmill (Sketchfab, CC BY 4.0), adopted with the recipe in
`src/assets/navigator/source/README.md` (name map `cyber-girl.names.json`). Lessons that went into
the script: a rigged export's bind pose must be measured through its bones (eye sockets give the
head length), a Sketchfab glTF often carries a second copy of the figure (`--drop`), injected eyes
and lids need an upright world rotation and counter-clockwise winding, and the figure is recentred
on the Head bone so the poses' assumption (head at x = z = 0) holds.

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

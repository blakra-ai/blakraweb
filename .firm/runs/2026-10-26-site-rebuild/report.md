## Result
A new blakra.us, built in React and prerendered as 16 static pages in English, German, French and Spanish. Its symbol is a live black hole crowning seven chakras (BLAck hole + chaKRA). Every scroll moves the camera up the axis, and each of the seven sections wakes one chakra. The story: who we are → one working day of five real client systems → the seven-layer engine → how a project runs → our products → the people → three doors (commission, partner, invest).

## What changed
- New project in `/home/ashen/Documents/projects/blakraMain` (no git repo yet). See the README for the structure.
- `server/contact.gs`: hardened form endpoint. It saves to a Sheet first, caps mail at 40 a day, keeps a durable counter, strips control characters and sanitizes formulas.
- `deploy/nginx.conf.example` and `deploy/blakra-headers.conf`: serving, caching, CSP, HSTS, no framing, per-language 404s.

## Evidence
- AC1–AC9 verified; see `ledger.json` for each command and result.
- `npm test`: 89 pass. `npm run typecheck`: clean. `npm run build`: 16 pages + sitemap. `npm run e2e`: 102/102.
- Lighthouse mobile (simulated 4G, 4× CPU, vite preview without compression): `/` 92/100/100/100, `/de/` 93/100/100/100, `/investors/` 94/100/100/100. TBT 0–40 ms, CLS 0.002, LCP 2.6–2.7 s.

## Review
- Code review: 6 findings, all confirmed by reading the code and all fixed (anchors into pinned tracks, governor pauses and recovery, stale layer, redraw on hover, form timing). Two are covered by new e2e checks (F1, F5).
- Security review: 3 findings fixed (spam/quota, field forging, headers only in comments), plus logging and CSV hardening.
- UX review: 10 findings, 8 fixed (frosted header, plain eyebrow, partner and investor links, scroll hint, tick size, card text, engine pacing, map placement, tooltips). Open: U7, the doors are hidden when the build has no endpoint.
- Found during verification: with motion off on desktop, the day cards grew to thousands of pixels and were clipped. Fixed, and covered by a new AC2 check.

## Decisions made
- ADR-001: Vite plus a small prerenderer, no framework.
- ADR-002: one raymarched shader, a quality governor, and a static symbol on software GPUs (`?gl=force` to preview).
- Content: shared facts are kept apart from four locale files; placeholders are marked DRAFT.

## Not verified / risks
- The live 3D on real GPUs was only checked through software rendering (forced). Frame rate on real phones and laptops is unmeasured; the governor is designed to adapt.
- LCP 2.6–2.7 s was measured without gzip. nginx enables gzip, but that has not been measured.
- The form's real delivery is untested: it needs `contact.gs` deployed and one approved real submission.
- Placeholder products and the bench, seed-round and free-assessment lines need the owner's confirmation (FACTS.md).

## Next steps
1. Deploy `server/contact.gs` (new version of the same deployment), set `SHEET_ID` and `NOTIFY_EMAIL`, and send one test message.
2. Replace the DRAFT products and confirm the flagged lines in FACTS.md.
3. `git init` and commit; then `/firm:start refresh` to create the project specialists.
4. Deploy `dist/` behind the nginx config and check the headers with `curl -I`.

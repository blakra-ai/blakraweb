# blakra.us

The BLAKRA company site. Its symbol is a black hole crowning seven chakras (BLAck hole +
chaKRA), rendered live in WebGL2. The seven chakras are the seven layers of BLAKRA's engine.

The page has seven sections, one per chakra from root to crown, and every scroll moves the camera
up the axis: who we are → one working day of five client systems (proof) → the engine (expertise)
→ how a project runs (trust) → our products (the ecosystem) → the people → three doors:
commission, partner, invest. In English, German, French and Spanish.

## Commands

| | |
|---|---|
| `npm install` | install (Node 22+) |
| `npm run dev` | dev server at http://localhost:5173 (renders on the client; no prerender) |
| `npm run build` | client build, SSR build, then prerender every route into `dist/` |
| `npm run preview` | serve `dist/` at http://localhost:4173 |
| `npm test` | unit tests: palette contrast (WCAG), the scroll → day engine, the form rules |
| `npm run typecheck` | TypeScript |
| `npm run e2e` | builds nothing; run after `npm run build`. Drives system Chrome through the acceptance checks |
| `npm run og` | re-render `public/og.png` and `public/apple-touch-icon.png` |

## Editing content

- `src/content/shared.ts`: facts that are the same in every language. These are names, outcome numbers, stacks, products (name, stage, platforms, link), people (name, photo) and the engine layers each system uses.
- `src/content/locales/en.ts`: every English sentence. `de.ts`, `fr.ts` and `es.ts` mirror it, and the `Dict` type in `src/content/types.ts` makes a missing line a build error. Scene labels have character budgets (see the comments in `types.ts`; `npm test` checks them).
- `src/content/FACTS.md`: where each claim comes from, and the placeholders still to replace.
- Add a language with one file in `src/content/locales/` plus one line in `src/i18n.tsx`.

## Where things live

- `src/motion/`: `MotionProvider` (reduced motion, Lenis, the day engine, the sky), `dayline.ts` (scroll → time, sky, chapter), `sky/` (palettes and the WebGL2 shader).
- `src/scenes/`: the five scenes. Each one renders its final state as SVG, and `build()` adds the before → now animation.
- `src/components/`: sections. `Chapter` and `Engine` pin on wide screens (`layouts` in `src/motion/gsap.ts`) and flow on phones. Scenes keep running by themselves once built (`live()` in each scene), only while on screen.
- `scripts/prerender.mjs`: static generation. `deploy/nginx.conf.example`: serving and security headers.
- `server/contact.gs`: the contact form endpoint (Google Apps Script).

## The 3D stage

- `src/motion/engine3d/shader.ts`: one fragment shader. Each ray is bent by the black hole (Schwarzschild approximation), so the accretion disk, the stars and the chakras behind it are lensed. Seven mandalas (traditional petal counts and seed symbols) in three depth layers, with an energy channel rising into the hole.
- `stage.ts` / `path.ts`: sections register a camera pose and a chakra (`useStage`). The camera is interpolated between section centres by scroll, so no scroll is idle; each section wakes its chakra.
- `renderer.ts`: renders below native resolution; a governor in `MotionProvider` steps quality down when frames are slow and back up when there is headroom. On software GPUs (lab tools, VMs) the shader is never compiled and the static symbol (`StageFallback.tsx`) stays. Add `?gl=force` to the URL to preview the live engine on such a machine.
- The shader compiles in parallel where the browser supports it, so starting it never blocks the page.

## Motion rules

- Content never depends on motion. The prerendered HTML shows every final state, and animation only adds the "before".
- `prefers-reduced-motion` or the on-page switch (header on wide screens, footer everywhere) turns off Lenis, pinning, scrubbing and the shader drift.
- The hero H1 is never hidden on load (it is the LCP element). It only drifts away on scroll.

## Contact form: required before launch

1. Open the Apps Script project behind the current form, replace its code with `server/contact.gs`, and set the script properties `SHEET_ID` (every enquiry is saved here first) and `NOTIFY_EMAIL` (emailed for the first 40 a day, so spam cannot burn the account's mail quota).
2. Deploy → Manage deployments → edit the existing deployment → New version. The URL in `.env` stays valid.
3. Send one real test message from the built site and confirm it arrives.

The form shows "sent" only when the script answers `{ "ok": true }`. Until step 2 is done, visitors see an error with the email address instead. Each message carries its intent (commission, partner or invest) and language, which appear in the email subject and the sheet.

Optional, stronger spam protection: Cloudflare Turnstile on the form, verified in the script (see its header comment).

nginx: copy `deploy/blakra-headers.conf` to `/etc/nginx/snippets/` (CSP, HSTS, no framing), and serve each language's 404 with `location /de/ { error_page 404 /de/404.html; }`, and the same for `/fr/` and `/es/`.

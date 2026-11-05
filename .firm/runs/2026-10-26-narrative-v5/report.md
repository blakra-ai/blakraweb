## Result
blakra.us v5: one engineering company that builds complete digital products, told as a descent through a black hole. "Software with gravity." Eight stations, one visitor question each:
- hero
- why one team + "What do you need built?"
- proof (five real systems)
- the engine (seven 3D lotus chakras on the spin axis = the seven layers of a product)
- products on the jet + roadmap
- how we work ("Exact before expensive.")
- people on the photon ring
- contact at the event horizon

The 3D world is rebuilt in three.js (ADR-003, superseding ADR-002). Scroll is smooth (Lenis) but never taken over: no pins, no snapping. Prerendered in English, German, French and Spanish.

## What changed
- `src/motion/world/` (new):
  - three.js world, loaded lazily
  - screen-space lens over the layer behind the hole
  - disk, orbits, people lights and the moving bands drawn as far and near halves
  - real petal geometry with traditional petal counts (crown 24 + 36 + 48 = 108)
  - jets, infall filament, bloom, AgX, grain
  - noise baked once into textures
- Old ray-marched `shader.ts` and `renderer.ts` removed.
- `src/motion/sticky.ts`: held sections use CSS sticky and cached progress. The day track and the engine are rebuilt on it.
- `MotionProvider`:
  - smooth scroll that never pins or snaps (see the smoothness pass below)
  - in-page links glide, and yield to the reader's input
  - the pulse shapes the column
  - the governor skips redraws when nothing changes
- New `Pulse` section and `src/motion/pulse.ts`. One tap lights the layers a need takes, links its proof, marks the engine row and starts the contact message.
- Content model:
  - layers are now cloud, data, automation, design, apps, growth and ai
  - new copy in four languages
  - FACTS.md updated (approved defaults, sourced Gartner line, DRAFT roadmap and deck line)
- Removed the day-clock motif (header clock, sunrise mark and portraits). The new black hole mark is used in the header, favicon, touch icon and social preview. The social preview background is the site's own GPU render.
- `backdrop-filter` removed over the canvas. The CSS grain is hidden while the 3D world is live.

- Smoothness pass, after the owner reported jumps, freezes and a camera that did not move smoothly:
  - **Lenis is back on.** Nothing pins or snaps any more, so it can't jump; `?smooth=native` compares.
  - **The camera follows a smoothed scroll position** with frame-rate-independent damping. It rests at each station (a fifth of a screen either side of the middle) and uses smootherstep between stations.
  - **The governor settles in the first seconds and only ever steps down.** It uses absolute frame-time thresholds and a warm-up period. Before this, a single jittery frame made it think the screen ran at 120 Hz, and it kept resizing mid-scroll (about 117 ms hitches).
  - **8-bit render buffers.** They halve the memory traffic on an integrated GPU, with no visible loss.
  - **A still rendered by the world itself shows from the first paint**, and the live world crossfades over it. The hero opens formed, matching the still; the scattered orbits appear at the tipping point instead.
  - **The live interface previews are memoized**, so changing the active day card no longer re-renders them.

- Second smoothness pass (2026-10-27), traced on the owner's GPU. The proof track was the page's slowest stretch: 55–66% of frames over 20 ms there, with or without WebGL. Three causes, fixed in order of impact:
  - **Animations inside the cards repainted the moving layers every frame.** They now pause while the track moves and resume when it rests.
  - **Sub-pixel offsets made Chrome rasterize the moving cards again on every frame.** The track and the card interfaces are declared layers (`will-change: transform`), and offsets snap to whole device pixels.
  - **The active card's border-colour fade repainted the whole card.** The accent edge is now its own overlay that fades by opacity.
  - Result on the proof track: 6–7% of frames over 20 ms with the 3D world on, and no frames over 50 ms.
  - Separately, **the first scroll froze for about 77 ms**, because three.js uploaded the parts hidden on the first screen the moment they appeared. One warm-up render at load now does that before the world is visible.
- Startup pass, so the page answers input sooner on phones:
  - A tiny inline script sets the motion classes before the first paint (allowed in the CSP by its hash in `deploy/blakra-headers.conf`), so React no longer forces a second layout.
  - The GPU check runs before three.js is requested; devices that will not run the world never download it.
  - Reveals use one IntersectionObserver instead of a scroll trigger per element; SplitText is gone.
  - Each home station hydrates in its own Suspense boundary, so the first screen becomes interactive before the rest.
  - The Newsreader italic is preloaded with Geist.

## Evidence
Final build, 2026-10-27:
- typecheck clean; unit tests 92/92; build 16 pages + sitemap.
- e2e 106/106: no-JS copy on all 16 routes in four languages; reduced motion; form (endpoint mocked); overflow at 375 px; keyboard; 11.9 screens; pulse; no pins; short screens; software-GPU fallback; no console errors.
- Lighthouse mobile:
  - `/` 92
  - `/de/` 89, 93 and 91 over three runs
  - `/investors/` 95
  - accessibility, best practices and SEO 100 on all three
- No horizontal overflow on 64 pages (375, 768, 1440, 1920 × four languages × four pages).
- Real GPU (owner's Intel UHD, Vulkan):
  - every station renders, with no errors;
  - still frames at 60 fps (p95 16.7 ms) at the hero, engine, products and contact;
  - wheel scrolling: p50 16.7 ms, 8.7% of frames over 20 ms;
  - proof track alone: 6–7% of frames over 20 ms, none over 50 ms (55–66% before the second smoothness pass).
- e2e found two real bugs, both fixed and re-verified:
  - **Stale scroll positions after the pulse answer opened.** The page now re-measures when its height changes.
  - **A resting cursor took the highlight from a layer a link had just opened.** Only a cursor that actually moves picks a row now.

## Review
- **Code review** (independent): 6 findings, all fixed.
  - Day cards could not be reached on wide but short screens.
  - Redraws continued with motion off or throttled.
  - The pointer caused redraws, but the world never read it. It is now wired into the lens.
  - One section could clear another's layer highlight.
  - The progress rail kept a stale value after a resize.
- **UX review** (independent): 10 findings, 9 acted on.
  - Products and engine named systems by clock times; they now use system names.
  - Headings showed through the header; it is now solid.
  - Form fields lacked a visible boundary; they now have one at 3:1 contrast, 48 px tall.
  - Small engine text is now at least 12.5 px.
  - The commitments looked like buttons; they now read as a ✓ list.
  - The "All of it" option now has a tag.
  - On phones the crown sits above the engine list, and the 3D is dimmed behind text outside the hero.
  - Not taken: shortening the hero list. The owner asked for every capability to be named.
- **Found while verifying:**
  - Removing `backdrop-filter` from the cards also removed their containing block, so positioned scene parts widened the page on phones. The cards now set `position: relative`.
  - On software GPUs the world kept its WebGL context; it now releases it.
  - The owner's own dev server (`npm run dev`) hot-reloads on every save, which looked like scroll jumps. Review the build at `vite preview`.

## Decisions made
- ADR-003: three.js world with screen-space lensing, native-compatible smooth scroll, sticky sections (supersedes ADR-002).
- Positioning: one engineering company for the whole product; seven layers = cloud, data, automation, design, apps, growth, AI.
- Blueprint v5 default commitments approved by the owner (FACTS.md).

## Not verified / risks
- **Field performance.** Smoothness was measured in headless Chrome on the owner's Intel UHD (Vulkan). Even with WebGL off, about 12% of frames exceed 20 ms during synthetic wheel scrolling there, so that figure is the page's floor in this test rather than the 3D's. A real browser with a display has not been measured.
- **Lensing approximation.** Objects in front of the hole are not lensed (by design).
- **Owner input still needed:**
  - real products, roadmap next/horizon, the deck contents line
  - the bench line
  - deploying `contact.gs`

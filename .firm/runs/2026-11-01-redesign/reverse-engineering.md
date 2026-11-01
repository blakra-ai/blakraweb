# Reverse-engineering the reference sites

Source: `refs/<site>-0..3.jpg` (1440×900 at 0/25/50/75 % scroll), `refs/fingerprints.json` and `refs/fingerprints-2.json`, read 2026-11-01. All 100 frames (25 sites) were looked at. dogstudio and oryzo failed to load (no frames); whyzero and darkmoon are parked domains and carry no design evidence.

Capture caveat: headless capture stalls WebGL preloaders and lazy media. Where all four frames are a loader (igloo, activetheory, resn, lusion, obys, zentry 0–1) the card says what the loader itself reveals and what the fingerprint adds; nothing more is invented.

Legend: **one world** = a single canvas scene persists across the scroll; **document** = sections are DOM, media is per-section.

---

## 1. Cards

### igloo.inc — one world (unconfirmed; stalled in loader)
**Hero:** nothing but a loader: flat blue-grey (`#a0a5b1`) field, a 10-character ASCII progress string (`==+++===--`) dead centre, no nav, no logo. **Type:** monospace glyphs only. **Palette:** one colour plus white. **Rhythm:** docH = 900, 1 screen reported, canvases 0 at capture — the real site mounts WebGL after preload, so the fingerprint undercounts. **Motion:** the loader is already a motion system: characters mutate between frames (four different strings). **Signature:** typographic preloader as brand. **Generic:** nothing visible is generic. **Steal:** a loader that is itself the first beat of the film — our seven-layer count could tick up in Geist Mono. **Avoid:** a blocking preloader with no content behind it; a headless crawler (and a slow phone) sees only grey.

### terminal.industries — document (404 captured)
**Hero:** Vercel's 404 template: centred 24 px/600 heading, grey body, mono status line, mono footer links. **Type:** Geist + Geist Mono — the same pair BLAKRA self-hosts, so this frame is an incidental spec sheet: 24/600 heading, 16/400 body, 13 px mono caps with wide tracking. **Palette:** white, `#171717`, `#4d4d4d`; three colours. **Rhythm:** one screen. **Motion:** none. **Signature:** none (error page). **Generic:** entirely. **Steal:** Geist Mono small caps with tracking as metadata voice; `/`-separated mono footer links. **Avoid:** nothing to avoid; recapture the real site before using it as a reference.

### zentry.com — one world (WebGL + pinned stages)
**Hero:** frames 0–1 black (loader); frame 2 shows a lavender (`#dfdff2`) stage with a 144 px/900 condensed display face (ZentryScreamer) set hard left over 7 columns, black pill CTA "ENTER VAULT", a numbered mono index bottom-left (01/02/03). Frame 3: black stage, 180 px headline centred, 10 px mono body, a metric card. **Type:** two voices only — screaming condensed caps and Roboto Mono at 9–14 px; a 15× size ratio. **Palette:** electric violet body, lavender, black, acid yellow accent. **Rhythm:** 15.7 screens; sections of 3000/2335/2970 px are pinned stages. ScrollTrigger + Lenis. **Motion:** scroll-scrubbed stages, canvas world. **Signature:** display-caps against micro-mono. **Generic:** the metric card. **Steal:** the size ratio; numbered index as scroll map. **Avoid:** 16 screens; black-screen loader.

### cursor.com — document
**Hero:** nav full-width (logo left, five links centre, black "Download" pill). H1 is small — 26 px/400, 2 lines, cols 1–4 — two pills, then a full-width app screenshot over a painted landscape from y≈350. The product shot is the hero. **Type:** CursorGothic + EB Garamond inside mockups + Berkeley Mono; headings 22–36 px, never loud. **Palette:** warm off-white `#f7f7f4`, ink `#26251e`, one orange-red link colour, green/red diffs. **Rhythm:** 9 screens; a 3203 px pinned stage, then 700 px feature rows (mock left, text right) and a changelog grid; hand-over by card surface. **Motion:** none in frames; DOM. **Signature:** understatement — the smallest H1 in the set. **Generic:** feature-row rhythm. **Steal:** nav restraint; warm paper white. **Avoid:** screenshot-as-hero; BLAKRA has no app to show.

### linear.app — document
**Hero:** frame 0 is empty black under a hairline (hero is lazy, not captured). Nav: logo left, links right, white "Sign up" pill. **Type:** Inter Variable 510/590 weights, H1 64, H2 48 at 510, 20 px body; Berkeley Mono in code mock. **Palette:** `#08090a`, white, three greys, one periwinkle accent; dark. **Rhythm:** 11 screens of identical 1226 px sections, the most regular in the set: H2 left (cols 1–4), paragraph right (cols 7–12), "Learn more →", a product mock fading to black, a "Features +" index row, a hairline. **Motion:** DOM only. **Signature:** the fade-to-black bottom edge on every mock. **Generic:** the feature-row template is now the SaaS default. **Steal:** hairline + two-column heading/paragraph; near-black not pure black. **Avoid:** the template itself.

### raycast.com — document
**Hero:** floating nav capsule (1200 px wide, rounded, border); H1 64/600 centred at y≈440, 2 lines, ~6 columns of measure; 18 px grey sub; a single ghost-pill CTA at the bottom edge. Half a screen of air above the H1. **Type:** Inter 600 headline, 500 subheads, JetBrains/Geist Mono for eyebrows ("AI AGENT" in red) and figure labels ("FIG_03"). **Palette:** `#07080a`, white, greys, one coral red; dark. **Rhythm:** 16 screens of bento cards with 1 px borders on a dotted grid; sections hand over by card surface. **Motion:** none visible; DOM. **Signature:** mono "FIG_" labels and dotted-grid cards. **Generic:** bento everywhere. **Steal:** eyebrow mono in accent colour; centred H1 with generous top air. **Avoid:** 16 screens; card grids as the only rhythm.

### vercel.com — document
**Hero:** three-part row at y≈350–510: H1 "Agentic / Infrastructure" 64/400 cols 1–4, a black triangle logo dead centre, three short lines cols 10–12; two pills under the H1; logo strip at the bottom. **Type:** Geist Sans 400 at 64 px, H2 56/450, 14 px/500 labels, Geist Mono. The lightest-weight large H1 in the set — our fonts, proven at display size. **Palette:** `#fafafa`, `#171717`, greys, one blue; essentially monochrome. **Rhythm:** 5.9 screens, the shortest product site here; sections of 836/2363/718 px with 56–136 px breathers. **Motion:** DOM; mocks fade from white at their bottom edge. **Signature:** logo-as-hero-object between type. **Generic:** the "Recently shipped" card grid. **Steal:** Geist 400 at 64; 6-screen length; object between text columns. **Avoid:** greyed-out mocks that read as unloaded.

### stripe.com — document with a WebGL hero
**Hero:** a WebGL gradient ribbon (orange→magenta→blue) sweeps the top-right; H1 48/300 cols 2–9, four lines, with the second half tinted blue-grey; two CTAs; logo strip in a bordered band. 1 px vertical rules at x=88 and x=1352 run the full page. **Type:** Söhne 300 everywhere; 56/32/26 px headings; contrast by colour not weight. **Palette:** white, navy `#061b31`, slate, violet `#533afd`, the ribbon gradient; two sections flip to deep navy with gradient numerals. **Rhythm:** 17 screens; a 4610 px stage; surface flips white→lavender→navy. **Motion:** the ribbon is the only canvas; everything else DOM. **Signature:** gradient ribbon + framed rails. **Generic:** stats rows, customer tiles. **Steal:** the full-height rails; big numerals with a gradient fill. **Avoid:** 17 screens; light-weight headings on busy media.

### anthropic.com — document with a canvas hero
**Hero:** centred wordmark; pill-chip nav on both sides. Frame 0 shows a 1264×900 rounded card (`#f3f2ec`) with no content — the canvas (webgl true) did not paint; a pause button on the card in frame 1 confirms a looping scene. **Type:** anthropicSans 40 px H1, 52/600 H2, 21/700 card titles, 13 px/700 eyebrows; a serif reserved for editorial. **Palette:** paper `#faf9f5`, ink `#141413`, five warm greys; zero accent on the home page. **Rhythm:** 3.6 screens: card hero → three model cards → four illustrated tiles → footer. **Motion:** one contained canvas; DOM cards. **Signature:** the framed, rounded hero stage with a pause control. **Generic:** three-card row. **Steal:** a stage inside a padded frame; warm paper; 4-screen length. **Avoid:** cookie banner over content.

### runwayml.com — document
**Hero:** promo bar, then nav (logo left, seven links centre, three buttons right), then a full-bleed video card inset 20 px with a rounded corner; H1 56/400 white, 2 lines, bottom-left cols 1–6 over the video; 18 px sub; one ghost CTA. Logo strip under. **Type:** ABC Normal only; 56/400 H1 and H2, 24/500 H3. **Palette:** white page, near-black cards, greys; no accent. **Rhythm:** 5.7 screens; alternating white and full-bleed dark cards; three-column product columns. **Motion:** video cards; DOM. **Signature:** text over cinematic video in a 20 px-inset frame. **Generic:** three-column product triptych, news grid. **Steal:** the inset full-bleed stage with text in its lower-left; one weight. **Avoid:** promo bar; seven-item nav.

### framer.com — document
**Hero:** H1 54/500 cols 1–7 at y≈190, 18 px sub, two pills, "New:" link right; then a 1200 px rounded dark card (the editor, unrendered). **Type:** Inter + GT Walsheim; 54/44 px at 500; measure ~45 characters. **Palette:** pure black, white at 80/60 % alpha, one blue; dark. **Rhythm:** 13.7 screens; a 3117 px stage; "Trusted by" section is a whole empty screen with the H2 at the bottom (lazy media). **Motion:** Framer Motion; DOM. **Signature:** product UI as content. **Generic:** everything else. **Steal:** alpha-white type hierarchy (100/80/60 %). **Avoid:** pure `#000`; empty screens while media loads.

### activetheory.net — one world (stalled in loader)
**Hero:** black; an ASCII half-dome of `/` characters with a `/42 → /60` counter beneath, cyan-grey on black, dead centre. Nothing else in four frames. **Type:** mono only. **Palette:** black + one desaturated cyan. **Rhythm:** unmeasured (docH 900). **Motion:** the dome fills with digits as the count rises — the loader is a particle field in text. **Signature:** ASCII dome loader. **Steal:** a loader drawn in the same mono as the site's metadata, counting something meaningful. **Avoid:** a loader that never ends on weak hardware.

### resn.co.nz — one world (stalled)
All four frames pure black; fingerprint empty. No usable evidence. Noted only so the set is complete. **Avoid:** any design whose first frame is black.

### 14islands.com — document with a WebGL hero
**Hero:** white; wordmark top-left, six mono caps links; a two-line mono eyebrow at col 7 y≈270; the canvas (webgl true, Lenis, Next) is empty in capture. H1 is 16 px — deliberately tiny. **Type:** BentonSans + AftenScreen; 12–16 px caps and a 100 px H2 later; 26 px case titles. **Palette:** white, `#070707`, two greys; no accent. **Rhythm:** 11 screens; a two-column case grid (title — category) with 500 px media slots; later a hairline list. **Motion:** Lenis smooth scroll; canvas hero. **Signature:** text-only grid with media that arrives on scroll. **Generic:** cookie card. **Steal:** "Name — category" with the category in grey; list rows with hairlines. **Avoid:** empty slots on slow load.

### makemepulse.com — document (Lenis)
**Hero:** black; wordmark + six lowercase links; H1 105/300 Beatrice Display split into three staggered lines ("global / creative / studio.") stepping right across 9 columns, with two underlined 14 px annotations floating in the gaps; a three-dot pager. A video card follows. **Type:** Beatrice Display 300 at 105–160 px vs Biotif 16; serif-ish contrast. **Palette:** black, white, `#f0f0f0` grey band, two greens in images. **Rhythm:** 9.8 screens; black→grey→white→black surfaces; inset video and image cards. **Motion:** Lenis; frame 3 shows a headline mid-transition. **Signature:** stair-stepped display headline with annotations. **Generic:** cookie modal, newsletter block. **Steal:** stepped headline; annotations in the gaps. **Avoid:** three-dot pager with no referent.

### lusion.co — one world (single viewport, stalled in loader)
**Hero:** black, a grey loading bar centre, a "000" counter at ~120 px bottom-left. **Fingerprint:** docH 900, 1 screen, 3 canvases, webgl true; Aeonik only; H1 36/400, H3 38/400, H2 21.6/400 — a one-weight system where the whole story is in the canvas, not the type. **Palette:** white body (`#fff`), black, one blue `#1a2ffb`. **Rhythm:** none — a single viewport; navigation is in-scene. **Motion:** everything. **Signature:** the oversized counter anchored to a corner (type as instrument). **Steal:** the counter; one weight. **Avoid:** blocking preloader; a page that is one screen tall has no scroll story and no SEO body.

### immersive-g.com — one world (WebGL, 18 scenes)
**Hero:** light grey `#e8e8e8`; one centred serif line "Innovative digital experiences studio" (PSTimes, 56/400 reported; ~28 px rendered), wordmark left, a "9" counter right, all on one baseline at mid-height. **Fingerprint:** docH 900 but 18 sections of 1100–1650 px and 6 canvases — a virtual scroll: the document is one screen, the scenes live in the canvas. **Type:** PSTimes serif + Helvetica Neue; two faces, one weight. **Palette:** grey, near-black, link blue. **Motion:** WebGL scene changes drive the "page". **Signature:** serif one-liner as the whole first beat. **Steal:** a single Newsreader italic line as a beat. **Avoid:** virtual scroll (no native scrollbar, no anchor links, bad on phone).

### obys.agency — one world (single viewport, stalled)
**Hero:** black; a white rounded square with a circular cut-out (logo as aperture) centre; counter "45 → 50" at the right edge. **Fingerprint:** docH 900, 1 screen, 1 canvas, webgl true, one custom face "Obys", no headings in the DOM at all — the type is drawn in the canvas. **Palette:** white body, black, `#c9c9c9`. **Signature:** the circular aperture. **Steal:** aperture as loader — close to a black hole and cheap in CSS. **Avoid:** headings that are not DOM text; blocking loader.

### basement.studio — document
**Hero:** fixed 36 px nav with hairline; a black screen (hero media not captured); a "HUMAN / MACHINE" mono toggle pinned bottom-centre. Then a six-column bordered logo grid; "Featured Projects" at ~110 px/500 grey over a hairline, 50/50 rows (media left, 20 px paragraph, client name right); an eyebrow + 4-line 72 px/500 statement + four columns with tag chips. **Type:** Geist + Geist Mono (our pair) with a display face "flauta"; H1 87/600, H2 76/600, H3 20/600; grey `#c4c4c4` for display, white for body — inverted hierarchy. **Palette:** black, greys, white, one orange `#ff4d00`. **Rhythm:** 7.5 screens of hairline rows, no cards. **Signature:** HUMAN/MACHINE mode toggle. **Steal:** Geist at 600/76 as the loud option; inverted hierarchy. **Avoid:** logo wall.

### locomotive.ca — document (WebGL hero, Lenis)
**Hero:** full-bleed red-lit video portrait of a face; nav is four text groups on one line (wordmark, glyph, "Work, Agency, Careers, Store", "Let's talk") in cyan; H1 70/400 in a condensed serif (LocomotiveNew) bottom-left with inline mono badges ("OPS / DES / DEV"). **Type:** HelveticaNowDisplay for UI + the condensed serif for display; 70/26/15 at 400. **Palette:** white and black only, plus whatever the media brings. **Rhythm:** 7.3 screens; "Featured work" as centred serif titles on hairlines at ~130 px; a serif manifesto at 70 px; then a two-column hairline index (Culture / Store). **Motion:** 2 canvases; Lenis. **Signature:** serif titles between hairlines. **Steal:** hairline index; nav as sentences. **Avoid:** nothing — the tightest agency page in the set.

### unseen.co — one world (single viewport)
**Hero:** `#212121` field; one letter cycling at centre (N → E S → U → E, the studio name spelled by a scramble), "UNSEEN STUDIO®" and a three-line 13 px description beneath, a pink hairline at the bottom edge. **Fingerprint:** 1 screen, 1 canvas, webgl true; Neue Montreal + Saol Display; H1 28.8/700 and 57.6/400, H2 86.4/700. **Palette:** charcoal, greys, white, warm pink `#faf6f4`. **Motion:** letter scramble as loader. **Signature:** the one-letter scramble. **Steal:** a letter-scramble on the wordmark as the smallest possible intro. **Avoid:** text at 40 % grey on charcoal; a single-screen page.

### studiofreight.com — document that behaves as one world (Lenis, DOM only)
**Hero:** paper `#fefdfc`; a mono nav ("• Home", "Work, Info, News, Aeon", "Contact"); the serif H1 "Moving Missions Forward" 42/400 dead centre; thumbnails (192 px) accrete around it frame by frame — at 0 % three, at 75 % twenty-six — on a fixed grid of the margins. docH is 900 yet Lenis is on: scroll feeds the gallery, not the document. **Type:** Publico Mono + a Jannon serif; two faces, one size each. **Palette:** paper, black; colour only from the work. **Motion:** scroll-driven accretion, no canvas. **Signature:** thumbnails accreting around a still centre. **Steal:** this is our gravity metaphor done in DOM — content pulled in around a fixed body. **Avoid:** zero text beyond the H1.

### hellomonday.com — document (WebGL, Lenis)
**Hero:** white; frames 0–1 blank (loader), frames 2–3 show a stacked wordmark top-left, "1 day until Monday" top-right, and the centre: a 14 px eyebrow "We make digital (and magical)…" over a slab-serif word that cycles (Experiences → Products) at 80–90 px, the outgoing word at 20 % grey. **Fingerprint:** 1 screen, 2 canvases; NB International + Clarendon; H1 80/300, H3 90/400. **Palette:** white, black, grey. **Motion:** word cycle; canvas behind. **Signature:** the cycling noun with the ghost of the previous. **Steal:** cycling the object of one sentence; counter-as-copy ("1 day until Monday"). **Avoid:** 2 of 4 frames blank.

### whyzero.com — no site (parked)
GoDaddy auction page. No design evidence. Excluded from the tally.

### darkmoon.xyz — no site (parked)
Spaceship "domain for sale" page. No design evidence. Excluded from the tally.

---

## 2. Tally

| | one world | document |
|---|---|---|
| **sites** | zentry, igloo, activetheory, resn, lusion, obys, immersive-g, unseen (8) | cursor, linear, raycast, vercel, stripe, anthropic, runway, framer, 14islands, makemepulse, basement, locomotive, hellomonday, studiofreight, terminal (15) |
| **document height** | 900 px for six of eight (single viewport; scroll is virtual or absent) | 3.6–17 screens |
| **what we actually saw** | loaders; one real stage (zentry); one scramble (unseen) | full pages |
| **WebGL present** | all | stripe, anthropic, 14islands, locomotive, hellomonday (hero/stage only) |

Six "one world" sites are a single 900 px viewport with 1–6 canvases: no native scroll, no DOM headings (obys), virtual scroll (immersive-g's 18 scenes). studiofreight is the counter-example: one viewport, zero canvas, scroll-driven DOM accretion. Dark : light is 11 : 12. Nobody uses pure `#000` well except as a loader; the good darks are `#07080a`–`#212121`. Accents: at most one chromatic colour per site; nine sites run with none.

---

## 3. Synthesis

### The ten mechanisms that recur among the best

1. **One canvas, framed.** Working WebGL is contained — anthropic's card, runway's inset video, stripe's ribbon, locomotive's hero. Single-viewport worlds (lusion, obys, unseen, immersive-g) cost a loader and lose native scroll.
2. **Hairline grid, not cards.** linear, basement, locomotive, 14islands: 1 px rules carry structure; cards are the fallback for weak content.
3. **Two-voice type, wide ratio.** Display vs. mono metadata at 8–15× (zentry 144/10, makemepulse 105/14); mono carries eyebrows, counters, figure numbers.
4. **Light-weight display.** vercel 400, stripe 300, makemepulse 300, runway 400; 600+ only below 24 px.
5. **Heading left, paragraph right.** linear, basement, runway: H2 in cols 1–4, body in 7–12.
6. **Media fades into the surface** at its bottom edge (linear, vercel, framer); no hard crop.
7. **Near-black and paper, never `#000`/`#fff`**: `#08090a`, `#0c0c0c`, `#f7f7f4`, `#faf9f5`.
8. **One accent, for state only** — raycast red eyebrows, basement orange "Online".
9. **Mono counters and indices** as loader and scroll map (zentry 01/02/03, activetheory /60, lusion 000, hellomonday's "1 day until Monday").
10. **Short.** The premium ones are 4–6 screens (anthropic 3.6, runway 5.7, vercel 5.9); 15+ reads as a template.

### The combination BLAKRA should build

**Palette.** Body `#0b0b0d` (near-black, blue-shifted like raycast); porcelain `#ece9e2` for the android, type and one light section; warm grey `#8a8781` secondary; hairlines at white 12 %. One accent, accretion gold `#d9a441`, only for live state, the layer index and the CTA border. Five colours; no gradients outside the canvas.

**Type.** Geist 400 at 72 px H1 (vercel proves it), 56/400 H2, 20/400 body at 60–65 characters. Geist Mono 12–13 px caps, +8 % tracking, for eyebrows, layer counters (`01 / 07`), figure labels, footer — the only caps. Newsreader italic 28–36 px for one spoken line per section, the android's voice, never headings.

**Hero (12 columns).** Nav: wordmark col 1, four links, one ghost CTA, hairline beneath. Framed stage inset 24 px, 16 px radius (anthropic/runway), 100 vh minus nav: black hole centred, the android in cols 7–10 facing it, rings on an orbital plane. H1 "Software with gravity." 72/400 in cols 1–6 at 62 % height, one Newsreader line, one gold-bordered CTA. Mono `01 / 07` bottom-left. No logo strip.

**Section rhythm (screens).** 6 screens: hero (1) → the seven layers as a pinned 2-screen stage, counter ticking 01→07, one ring per layer snapping into orbit (zentry, framed) → three heading-left/body-right hairline rows, 0.6 each, media fading into the surface (linear) → one porcelain screen with a 160 px numeral stat row (stripe's flip, inverted) → closing stage, the hole filling the frame, Newsreader line, CTA (0.8). Hand-overs: hairline, hairline, surface flip, hairline, full-bleed.

**WebGL is and isn't.** One `<canvas>`, mounted once in the hero frame, re-pinned for the layers stage and the close; everything between is DOM. On weak GPUs it is the rendered frame of her already in the repo, with CSS rings.

**Motion grammar.** Scroll-scrubbed; only the rings' 40 s orbit and her hair spring autoplay. Scroll drives hole scale, ring snap-in, counter, media fade. One easing, `cubic-bezier(.2,.7,.2,1)`. No parallax on type.

**The one interaction verb: pull.** Hover pulls a ring 4 px toward the cursor, the CTA pulls its border inward, scroll pulls layers into orbit, the close pulls the viewer into the hole. No bounces, no slides.

**Phone.** Same film, portrait frame: android in the lower third, H1 40 px over 4 lines, stage pin 1.5 screens, CSS rings when WebGL is throttled, counter kept. No content hidden.

### Where the references disagree, and BLAKRA's choice

1. **Single-viewport world vs. document.** Six agencies are one 900 px screen with the story in a canvas: loaders, blank first frames, no native scroll. Product sites stay DOM and look like templates. **Choice: framed world** — a real document, one canvas in a frame, hairline rows between; studiofreight shows gravity can even be DOM accretion.
2. **Loud display vs. small H1.** zentry/makemepulse shout at 105–180 px; cursor whispers at 26. **Choice: 72/400.** Gravity is calm; the canvas is the loud element, so type stays light, like vercel.
3. **Dark vs. paper.** Half the set is paper and feels editorial; dark feels like software. **Choice: near-black with one porcelain screen.** A black hole needs black; one porcelain beat (her material, the stats) breaks the monotone, as stripe's navy flip does in reverse.

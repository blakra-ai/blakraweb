# Launch audit: blakra.us for a worldwide public launch (2026-10-27)

**Scope:** the built site in `dist/` (16 pages, four languages), its backend (`server/contact.gs`), the deploy config (`deploy/`), the domain's DNS and certificates, and the public accounts the site links to.

**Goal:** go public worldwide and compete with commercial technology companies.

**Method:**
- I ran the health signals myself.
- Five independent reviewers each took one area: security, law and licences, competition and trust, UX and accessibility, and browser and device robustness.
- One verifier tried to refute the main code-level findings.
- I checked by hand:
  - the social links, DNS, certificates, the SEO head tags and page weight;
  - a simulation of automatic page translation.

## Status update (later on 2026-10-27)
- **Fixed** in run `.firm/runs/2026-10-27-launch-fixes/` (committed after the owner approved the preview):
  - R1, R2, R5 and R6, plus the nginx parts of R3.
  - Footer link target sizes, the wordmark at 320 px, and the manifest.
- **R4 partly done:** the owner supplied BLAKRA LLC, the Sacramento address and the phone. They are on a new Legal notice page in four languages, in Privacy (with the GDPR Art. 13 items) and in the footer.
- **Still open:**
  - certbot for www on the server
  - R7 (DKIM and DMARC)
  - the remaining entity details
  - the "Next" and "Quick wins" items not listed above

## Health signals (executed 2026-10-27)
- **typecheck:** clean.
- **Unit tests:** 92/92.
- **Dependencies:** `npm audit` reports 0 vulnerabilities (prod and dev), and `npm outdated` lists nothing. Versions are pinned, and the lockfile has integrity hashes.
- **Same build as the final content-v6 verification:**
  - e2e 106/106.
  - Lighthouse mobile: `/` 92, `/de/` 89–93, `/investors/` 95; a11y, best practices and SEO 100.
  - No overflow on 64 page × width combinations.
- **First view:** about 330 KB compressed (HTML 16 KB, CSS 11 KB, JS 137 KB, locale 7 KB, three fonts 117 KB, poster 44 KB). The 3D chunk (159 KB) loads after that.

## Scorecard
| Area | Rating | One line |
|---|---|---|
| Trust and competitiveness | 🔴 red | Better written terms than most competitors, but nothing proves the company exists: no legal identity, drawn faces, no third-party proof, and social links that point to a stranger or to nothing. |
| Law and compliance | 🔴 red | No Impressum / mentions légales / aviso legal; the privacy page lacks the GDPR Art. 13 items; the Google processor terms are unconfirmed. |
| Operations (domain, mail, monitoring) | 🔴 red | The live `www.blakra.us` has a certificate error. The domain has no DMARC and no DKIM under Google's default selector. Nothing monitors the site or the form. |
| Security | 🟡 yellow | Strong static setup (tight CSP, no third parties, no secrets). One launch blocker: anyone can switch the contact form off for the day. |
| Browser and device robustness | 🟡 yellow | Modern browsers are covered. Three gaps hit real phones: see R6. |
| UX and accessibility | 🟡 yellow | Clear first screen, good form and 404. Phones have no section menu and no reachable pause switch; text spacing clips the case cards; some targets are too small. |
| Performance and global delivery | 🟢 green | Lighthouse 89–95 on mobile, a light first view, and immutable caching. One origin server and no CDN, so visitors far from it wait longer. |
| SEO and international | 🟢 green | hreflang with x-default, canonicals, a sitemap with alternates, JSON-LD and localized noindex 404s. Home descriptions are too long, and JSON-LD lists the wrong social accounts. |
| Code health and tests | 🟢 green | Typecheck, 92 unit tests, 106 e2e checks and 0 advisories. No CI and no linter. |

## Top risks (fix before launch)
Evidence was executed in this session unless marked otherwise.

### R1. The social links point to a stranger, or to nothing
Effort: S. No owner input is needed to remove them.
- **github.com/blakra** is a personal account named "Blaž". It was created in 2017 and holds one 2018 ESP8266 sensor repo (GitHub API).
- **linkedin.com/company/blakra** shows "Page not found".
- **x.com/blakra** shows "User Profile Not Found".
- These links appear in the footer (`src/content/shared.ts:20-22`) and in the JSON-LD `sameAs` (`src/head.ts:67`). That tells Google these accounts are BLAKRA.
- A careful buyer clicks them first.
- Fix: remove all three now, and add real accounts back once they exist.

### R2. Anyone can switch the contact form off for the day
Effort: S.
- The problem is `server/contact.gs:42`: the check `if (count > LIMITS.perDay) return reply(false, 'busy')` runs before anything is saved.
- The honeypot and the timing check are reported by the browser, so a script passes them.
- 500 scripted posts per UTC day make every real enquiry fail with nothing saved. After 40, no notification mail goes out.
- Fix:
  - Never reject because of volume.
  - Replace the per-submission mail with a daily digest, or mail only the first submission per sender.
  - Use a fixed mail subject and start the body with "Untrusted website submission". The subject and Reply-To are attacker-controlled today.
  - Use a stricter email pattern (it currently accepts `Name<x@evil.com>` and `a,b@evil.com`), the same in `src/lib/contact.ts:22`.
  - Return ok once the row is saved, so a mail error doesn't cause duplicate retries.
  - Make the formula guard survive a CSV export.
  - Turnstile is optional. It would add a third party and a CSP change.

### R3. www.blakra.us shows a certificate error today
Effort: S. The owner runs it on the server.
- The live certificate covers only `blakra.us` (curl error 60 on www).
- `deploy/nginx.conf.example` has no 443 block for www.
- Fix: run `certbot -d blakra.us -d www.blakra.us`, and add a 443 www server that returns 301 to the apex. Check every subdomain before relying on `includeSubDomains`.

### R4. No legal identity
Effort: M. Needs owner input, and a lawyer must confirm.
- No Impressum (DE §5 DDG; applies to a German-language commercial site), no mentions légales (FR LCEN), and no aviso legal (ES LSSI-CE).
- Procurement cannot sign an NDA or a contract with a brand name.
- The privacy page lacks the GDPR Art. 13 items:
  - the controller
  - the legal basis (Art. 6(1)(b), or (f))
  - recipients and the transfer mechanism to Google in the US (DPF and/or SCCs)
  - the rights, including withdrawal, objection and complaint to a supervisory authority
  - the nginx access logs (IP addresses) and how long they are kept
- **Google processor terms:** unconfirmed. If the Apps Script and Sheet live in a consumer Gmail account, there is likely no business DPA; move them to Google Workspace and accept the Cloud Data Processing Addendum.
- **Owner supplies:** legal name and form, a serviceable address, register and number, VAT ID, a representative, and an EU/UK representative if the entity is outside the EU/UK.

### R5. The case cards cut off their own text on common laptop screens
Effort: M. Verified.
- `.card` has `height: 100%`, `max-height: 46rem` and `overflow: hidden` (`src/components/DayTrack.module.css:102-119`).
- **At normal spacing:** the "Layers" links and the "Built with" row are clipped by 27–71 px at 1280×800, and by up to 160 px at 1280×720. The clipped part includes focusable links.
- **With WCAG 1.4.12 text spacing:** 11–14 text elements per card are cut off, by up to 414 px.
- Fix: let the card grow, and give the held panel a short-screen layout. The DayTrack is the page's main proof.

### R6. Phones and tablets
Effort: S–M each. All verified.
- **No section navigation at ≤1099 px,** and no pause switch in the header at ≤599 px (`Header.module.css:132-146`).
  - On a phone the only pause control is in the footer, about 12,000 px down (WCAG 2.2.2).
  - The Sponsors page is reachable only through a small hero link.
  - Fix: a menu button and a pause switch in the header.
- **If the main script never runs, content stays hidden.** Causes: a chunk 404 after a redeploy, a dropped download, or an old browser.
  - The inline script's `motion-on` class is never removed.
  - All seven Engine descriptions stay at `max-height: 0`.
  - The DayTrack shows card 1 and part of card 2; cards 3–5 are invisible.
  - This breaks "content never depends on motion".
  - Fix: a watchdog in the inline script (switch to `motion-off` if the app has not booted within about 5 s, or if the module errors), then update the CSP hash.
- **A 30 fps frame cap is read as a slow GPU** (`MotionProvider.tsx:339-355`). iOS Low Power Mode, every iOS in-app browser under it, and Chrome Energy Saver cap the frame rate.
  - Quality drops to the lowest level.
  - After about 17 s on a still page, the camera cuts instead of gliding until reload.
  - Fix: measure the baseline frame interval first, and use relative thresholds.
- **After a WebGL context loss, the 3D never returns** (`world.ts:118-122`, `MotionProvider.tsx:370-374`). This happens on iOS app switches and on low-RAM Android.
  - Fix: handle `webglcontextrestored` and restart the world, at most twice.
- **`viewport-fit=cover` without safe-area insets** puts text under the notch on an iPhone in landscape.
  - Fix: `max(var(--margin), env(safe-area-inset-left/right))`, or drop `cover`.

### R7. Replies from hello@blakra.us may land in spam
Effort: S. Owner, in DNS and Google Admin.
- The MX is Google, and SPF is present.
- There is no DMARC record, and no DKIM key under Google's default selector (`google._domainkey`). A custom selector can't be ruled out from outside.
- That undercuts "reply within 24 hours", and anyone can spoof the domain.
- Fix:
  - In Google Admin → Gmail → Authenticate email, generate and publish DKIM.
  - Publish `_dmarc` with `p=none` and reports, then move it to `quarantine`.

## Next: trust and competitiveness (owner input)
Competitors (Netguru, thoughtbot, Miquido, 10Clouds; fetched 2026-10-27) all show:
- a legal entity and address
- real people with LinkedIn
- third-party reviews (e.g. Clutch)
- insights or a blog

BLAKRA already beats them on written terms:
- the client owns the code and data
- fixed scope and price for the first system
- working software every two weeks
- a named engineer and a 24-hour reply
- an NDA first, and a "Not a fit" line

What's missing is proof that the company exists.

| # | Item | Effort | Owner input |
|---|---|---|---|
| N1 | Principals: photos, LinkedIn, work before 2024 | S | yes |
| N2 | Independent proof under NDA: a Clutch profile with identity-verified anonymous reviews from the five case clients, linked from each case | M | yes (clients agree) |
| N3 | Cases: year, duration, how 40% / 20% / 65% were measured. Label the animated scenes as illustrations (no input needed for the label) | S | partly |
| N4 | Security and data-handling page with only practices the owner confirms (no certificates not held) | M | yes |
| N5 | Skin AI: real name, platforms, 60-second demo, who owns the training data | M | yes |
| N6 | Price signal: starting price or minimum project size | S | yes |
| N7 | Measurement: an external uptime check for the site and the form, Search Console and Bing Webmaster at launch, analytics from server logs (e.g. GoAccess) to keep "no trackers" | S | partly |
| N8 | Native-speaker review of de / fr / es | S | yes (a reviewer) |

## Quick wins (S, no owner input)
- **Accessibility:**
  - Footer and social links at least 24 px (the "X" link is 8×18 px, WCAG 2.5.8).
  - The wordmark collides with the EN button at 400% zoom (320 px).
  - Repeated layer chips in the cases add about 15 extra Tab stops: give each chip context, or make only the first focusable.
- **Contrast:** check the hero headline where line 2 sits on the disc at 1440/1024 (about 2:1 at the worst sample, possibly a star speck); add a scrim if it is real.
- **SEO and sharing:**
  - Home meta descriptions are 219–268 characters; keep them at 160 or fewer. The French title is 72 characters.
  - `og.png` is 344 KB: re-encode it to a JPEG of about 100 KB. WhatsApp previews often fail above about 300 KB (moderate confidence).
- **nginx:**
  - Deny dotfiles (`location ~ /\.(?!well-known/)`).
  - `server_tokens off`, and set `ssl_protocols TLSv1.2 TLSv1.3` explicitly.
  - Add Cache-Control on the per-language 404 lines.
  - Set `build.manifest: false`: `dist/.vite/manifest.json` is served.
- **Licences:** ship a third-party notices file (MIT texts and the OFL texts for Geist, Geist Mono and Newsreader).
- **Sponsors page:** consider removing the securities disclaimer; no securities are offered. The URL still says `/investors/`.

## Later (strategic)
- 3–4 engineering notes: the skin AI built from scratch, AI that keeps data in-house, why software projects fail.
- A CDN in front of the single origin, for visitors far from the server.
- Skip the 3D chunk under `Save-Data` / `prefers-reduced-data`.
- A root error boundary that keeps the prerendered content. React 19 unmounts the page on an uncaught error. The translation test below did not trigger one, so this is insurance.
- CI that runs typecheck, tests, build and e2e; a linter.

## Accept (documented)
- **European Accessibility Act:** likely not applicable (B2B, and microenterprises are exempt for services); a lawyer should confirm. Keep WCAG 2.2 AA anyway.
- **The localStorage motion key:** strictly necessary for a choice the visitor made, so no consent is needed. It is disclosed.
- **US state privacy laws:** below their thresholds.
- **GSAP Standard licence:** free for commercial use. Its Webflow-competitor clause matters only if BLAKRA builds an animation-authoring product.
- **Licences overall:** MIT (react, three, lenis), Zlib (postprocessing), OFL (fonts). No conflict.

## Checked and sound
- **CSP:** the hash matches the inline script on all 16 pages. Zero violations on 10 pages with the real CSP injected, including `?gl=force&q=4&profile` and a mocked form submit.
- **No third-party requests at runtime.**
- **No XSS sinks:** URL parameters are whitelisted or only compared.
- **No secrets** in the repo, `dist` or git history; no sourcemaps.
- **Mail headers:** single-line fields are stripped of control characters, and lengths are checked on the server.
- **Supply chain:** exact versions, and lockfile entries from registry.npmjs.org with integrity hashes.
- **Caching:** HTML `no-cache`, and assets `immutable`.
- **Browser support:**
  - Top-level await (Safari 15+); the world chunk's class static blocks fail safe to the poster.
  - Guarded `localStorage`; native touch scrolling (`syncTouch` off).
  - Sticky without an overflow ancestor; canvas at `100lvh`; a WebGL2 probe before three.js loads.
- **Automatic page translation (simulated):** all 403 text nodes were replaced the way Chrome translation does, then the pulse options were clicked and the whole page was scrolled. No errors, and the page stayed intact at 1440 and 390.
- **UX:**
  - The first screen says what BLAKRA does and what to do next within 5 seconds.
  - Visible focus on 45 stops, in logical order.
  - Form errors in all four languages, focused and linked.
  - Localized 404 pages.
  - Correct `lang` attributes and landmarks; a heading outline with no skipped levels.

## Initiatives
1. **Remove what hurts trust today** (S, no owner input).
   - Covers: R1, the illustration labels, descriptions, the OG image, licence notices, target sizes.
   - First step: remove the social links from the footer and the JSON-LD.
2. **Launch-safe infrastructure** (S).
   - Covers: R2, R3, R7, the nginx hardening, an uptime check.
   - First step: patch `contact.gs` and `nginx.conf.example`. The owner then runs certbot and adds DKIM and DMARC.
3. **Phones and laptops first-class** (M).
   - Covers: R5 and R6.
   - First step: the case-card clipping and the mobile menu with pause, the two most visible.
4. **Prove we exist** (M, owner input).
   - Covers: R4, N1, N2.
   - First step: the owner sends the entity details; legal pages in four languages follow.
5. **Proof that sells** (M–L, owner input).
   - Covers: N3–N6, N8 and the engineering notes.
   - First step: case years and durations, and the skin AI demo.

Reviewer reports, scripts and screenshots: `/tmp/claude-1000/-home-ashen-Documents-projects-blakraMain/610a7134-2340-4c4d-86f3-fa7eb3c57194/scratchpad/audit/`.

# Compliance checklist — blakra.us (run 2026-11-02-compliance, branch launch-fixes)

Status: **pass** (already compliant) · **fixed** (changed in this run) · **owner** (needs a fact or action from the owner) · **lawyer** (legal judgement needed). Reports: `before/` and `after/` (axe.json, lighthouse.json + HTML reports, html-validate.txt, csp-check.txt, e2e.txt, vitest.txt, build.txt, typecheck.txt). Nothing deployed, nothing committed.

## 1. Privacy — GDPR / UK GDPR (Art. 13)
| Item | Standard | Status | Evidence |
|---|---|---|---|
| Controller identity + contact | Art. 13(1)(a) | pass | Privacy "Who we are": BLAKRA LLC, address, email |
| Purposes and legal bases (form 6(1)(b)/(f); logs 6(1)(f)) | Art. 13(1)(c),(d) | fixed · lawyer | Privacy "Why, and on what legal basis" (all 4 locales); logs basis added |
| Recipients (Google as processor; web host for logs) | Art. 13(1)(e) | fixed · owner | New "Who receives it". Owner: name the host; confirm a Google **Workspace** account with Google's Data Processing Addendum (a consumer Gmail account has no Art. 28 contract — contact.gs comments suggest a consumer quota) |
| International transfer mechanism | Art. 13(1)(f), Ch. V | fixed · lawyer | New "Transfers outside Europe": Google LLC in EU-US DPF (+UK, Swiss); Art. 49(1)(b) for the reply. Lawyer to confirm framing; re-check DPF listing |
| Retention (enquiries 12 months, logs 14 days) | Art. 13(2)(a) | fixed · owner | Text updated; `purge()` added to server/contact.gs (+ test). Owner: install daily `purge` trigger, delete inbox mails on the same schedule, set logrotate 14 days, confirm both periods |
| Rights incl. objection, complaint authority | Art. 13(2)(b),(d), Art. 21 | fixed · lawyer | Objection right added; complaint "where you live or work" (CNIL/AEPD named in fr/es) |
| Statutory/contractual requirement; automated decisions | Art. 13(2)(e),(f) | fixed | "voluntary" + "no automated decisions or profiles" |
| Art. 27 EU / UK representative | Art. 27 GDPR / UK GDPR | lawyer · owner | Not appointed. Exemption (occasional, low-risk processing) may apply; lawyer to decide. If needed owner supplies name+address and we add it |
| Last-updated date | good practice | fixed | 2 November 2026 in 4 locales |

## 2. Privacy — US
| Item | Law | Status | Evidence |
|---|---|---|---|
| CCPA/CPRA applicability | Cal. Civ. Code 1798.140(d) thresholds | lawyer | BLAKRA very likely below thresholds; section added anyway (cheap, harmless) |
| Notice at collection / categories / no sell-share / no sensitive PI / rights / non-discrimination | CCPA | fixed · lawyer | New "If you live in California"; form line "We use these details only to reply to you" + Privacy link = notice at collection |
| CalOPPA: categories, third parties, changes, effective date, Do Not Track disclosure | Bus. & Prof. Code 22575 | fixed | DNT/GPC sentence, "Changes" section, date |
| Children | COPPA / GDPR Art. 8 | fixed | "not directed at children under 16" |

## 3. Cookies / ePrivacy (Art. 5(3) ePrivacy, § 25 TDDDG)
| Item | Status | Evidence |
|---|---|---|
| No cookies, no analytics/ads/trackers | pass | grep: no `document.cookie`, sessionStorage, IndexedDB; Lighthouse/axe runs saw no third-party requests; fonts self-hosted |
| localStorage | pass | only `blakra:motion` = "off", written only when the user switches motion off → strictly necessary for a service the user requested (§ 25(2) Nr. 2 TDDDG) → **no banner needed**; disclosed in "In your browser" |

## 4. Contact form — data minimisation and wording
| Item | Status | Evidence |
|---|---|---|
| Fields: intent, name/company, email, message — all needed to reply | pass | Contact.tsx; no optional fields existed |
| Page path sent with each enquiry | fixed (removed) | src/lib/contact.ts, Contact.tsx; server stores '' and ignores `page` (test "stores no page path") |
| Hidden fields | pass | only the honeypot `website` + fill time: anti-spam, not stored; disclosed |
| Consent wording | pass | not consent-based (Art. 6(1)(b)/(f)), so no checkbox; notice line + link present |
| Sheet formula injection, header injection | pass | existing tests |

## 5. Legal notice (Impressum / mentions légales / aviso legal)
| Required item | DDG § 5 (DE) | LCEN art. 6-III (FR) | LSSI art. 10 (ES) | Present? | Status |
|---|---|---|---|---|---|
| Name + legal form | yes | yes | yes | "BLAKRA LLC" | owner: state of organisation (e.g. "a California limited liability company") |
| Address | yes | yes | yes | yes | pass |
| Email | yes | yes | yes | yes | pass |
| Second fast contact route | yes (CJEU C-298/07: a form suffices) | phone required | — | contact form line | fixed (DE); FR requires a **phone** → lawyer/owner (owner removed phone) |
| Authorised representative (manager/managing member) | yes | directeur de la publication | — | no | owner |
| Register + number (CA SOS entity no.) | yes, if registered | RCS if any | register data | no | owner |
| VAT ID / tax ID | if one exists | if any | NIF | no | owner (state "none" or supply) |
| Hosting provider name/address/phone | — | yes | — | no | owner |
| § 18(2) MStV editor | only journalistic content | — | — | n/a | lawyer to confirm not needed |
| EU ODR link | obsolete (platform closed 20 Jul 2025); B2B anyway | — | — | absent | pass |
| US | no general requirement | | | | pass |
| Phone number | not required (DE) | required | not required | removed by owner | lawyer (FR) |

## 6. Licences and credits
| Item | Status | Evidence |
|---|---|---|
| CC BY 4.0 "Mecha roe deer" by Osho: title, author, licence, links | pass | Legal page, 4 locales (axe/e2e) |
| Credits for unused models (Astraía, Cyber Girl) | pass | not on site; only in git history/name map |
| Fonts Geist, Geist Mono, Newsreader (OFL 1.1) | fixed | `public/fonts-license.txt` (notices + licence) served with the fonts |
| npm packages (MIT etc., GSAP standard licence) | fixed | Vite `build.license` → `dist/third-party-licenses.md` (17 packages) |

## 7. Claims
| Item | Status | Evidence |
|---|---|---|
| Gartner statistic | fixed (removed, owner) | crownText removed in 4 locales + type; FACTS updated |
| Unverifiable claims | pass | FACTS.md register; no figures, no client names |
| NDA wording consistent | pass | "details under NDA", "screens shown are representative", "An NDA before you share details" consistent in 4 locales |

## 8. Owner-approved cuts (coordinator, 2026-11-02)
| Cut | Status | Evidence |
|---|---|---|
| Guide lines only in hero + contact; porthole reads section heading elsewhere | fixed | Stage.tsx, Porcelain.tsx, types `lines: 'hero' \| 'contact'`; World.tsx readingPoint falls back to `main :is(h1,h2)`; unused mission/missionAll/lookCloser removed |
| Gartner paragraph removed, crownTitle kept | fixed | Stage keeps crownTitle (reads alone) |
| "Sponsors and buyers" out of header nav | fixed | Header.tsx; still in Products section + footer |
| One screenshot for Vitrin Console, Flowline, Nuvoq | fixed | kept 01 (overview/builder/live inspection); 02 files + captions deleted |
| Hero cursor hint | fixed | `prologue.hint` removed (was not rendered) |

## 9. Accessibility — WCAG 2.2 AA
| Item | Status | Evidence |
|---|---|---|
| axe-core 4.10 (wcag2a/aa, 21aa, 22aa, best-practice) on home, work, privacy, legal, 404 × en/de × 1440/390 + reduced motion at 1440 (30 runs) | pass | before 0 / after 0 violations (`after/axe.json`) |
| Contrast over imagery (axe "incomplete") | pass (manual) | tests/contrast.test.ts token checks; text on solid sheets |
| Lighthouse accessibility | pass | 100 on all four runs |
| Focus order/visible, reduced motion, lang, form errors | pass | e2e 158/158 (keyboard, reduced motion, form error summary checks) |

## 10. Web standards / SEO
| Item | Status | Evidence |
|---|---|---|
| Valid HTML (html-validate 9.5 standard; no Java for vnu) | pass | 52 files, 0 errors |
| Unique titles/descriptions, canonical, hreflang + x-default in head | pass | head.ts; e2e |
| Sitemap hreflang x-default | fixed | scripts/prerender.mjs (48 x-default entries) |
| robots.txt, 404 with status 404 | pass | nginx/preview config |
| Manifest, icons, theme-color, favicon set | fixed | site.webmanifest, icon-192/512, maskable, favicon.ico + svg + apple-touch |
| Structured data | pass | Organization: name, legalName, email, address, no persons, no phone |

## 11. Security
| Item | Status | Evidence |
|---|---|---|
| CSP matched to real sources | fixed | **existing CSP blocked the deer's textures** (blob: fetch, 14 violations/page); now `img-src`/`connect-src blob:`, `worker-src blob:`, `manifest-src`, `upgrade-insecure-requests`; 0 violations with the world running (`after/csp-check.txt`) |
| Inline script hash | pass | one inline script across all 52 pages, hash matches |
| HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors + X-Frame-Options, COOP | fixed | deploy/blakra-headers.conf (nginx), deploy/_headers (Netlify/Cloudflare), deploy/vercel.json |
| security.txt | fixed | public/.well-known/security.txt, Expires 2027-11-01 (renew yearly) |
| Source maps / secrets in build | pass | no .map files; Apps Script URL public by design |

## 12. Performance (Lighthouse 12.6, local preview)
| Page | Before (P/A/BP/SEO) | After |
|---|---|---|
| Home mobile | 77/100/100/100 | 91/100/100/100 |
| Home desktop | 100/100/100/100 | 100/100/100/100 |
| Work mobile | 94/100/100/100 | 93/100/100/100 (noise) |
| Work desktop | 100/100/100/100 | 100/100/100/100 |
Fix: phone hero still preloaded with `fetchpriority="high"` (LCP). Not done (design/pipeline): responsive `srcset` for work card phone shots (640px shown at 167px, ~60 KB) and a smaller hero phone still (~30 KB); pulse.js main-thread time.

## 13. Data minimisation sweep
| Datum | Where | Status |
|---|---|---|
| Phone +1 (279)… | shared.ts → shipped in pulse JS bundle | fixed (removed from code and bundle) |
| Names of the three principals | shared.ts `people` (unused) | fixed (removed) |
| Founder name "Hamid Reza Alizadeh (Ashen)" | Sponsors page note, 4 locales | owner (kept: business use; also likely needed in the Impressum as representative) |
| Page path in enquiries | form payload, Sheet | fixed (removed) |
| Address, email | legal, privacy, footer, JSON-LD | pass (legally required / business) |
| Image metadata | 20 images | pass: no EXIF/XMP/IPTC; only ICC colour profiles on 2 JPGs (not personal; kept for colour accuracy) |
| GLB metadata, local paths in dist | pass | generator string only; no /home paths |
| Placeholder names in screenshots ("Alex Chen", "Olivia Martin") | pass | fictional demo data |

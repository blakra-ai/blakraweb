## Result
The launch-audit fixes that needed no owner input are built and verified locally. The owner's company details are on the site: a Legal notice in four languages, the privacy page and the footer. The owner approved the preview and the change is committed. Nothing is deployed.

## What changed
- **Social links removed** (audit R1): the footer and the structured data no longer point to github.com/blakra (an unrelated person) or to LinkedIn and X pages that do not exist.
- **Contact form backend** (`server/contact.gs`, audit R2): volume never turns a valid enquiry away.
  - Every enquiry is saved before mailing.
  - The instant mail cap is backed by an hourly `digest` trigger that sends 50 at a time and marks only what it sent.
  - The mail subject is fixed, the body carries an "untrusted" banner, and the message is quoted line by line.
  - The client and server share a strict email pattern, and invisible and bidi characters are stripped.
  - The visitor hears ok once the enquiry is saved.
  - The formula guard survives a CSV export.
  - New tests: `tests/contact-gs.test.ts`.
- **nginx example**:
  - HTTPS server for www and the certbot line for both names.
  - HTTP redirect keeps the host.
  - Dotfiles denied, explicit TLS 1.2/1.3, per-language 404s, `server_tokens` and log-rotation notes.
  - `dist/.vite` is no longer shipped.
- **Case cards** (audit R5): a card never cuts off its text.
  - The layer row moved under the interface.
  - Two compact tiers for 700–940 px tall screens: a wider story column, a smaller interface and a smaller title.
  - If any card would still not fit (long translation, larger text, the reader's text spacing), the day switches to a list.
- **Phone and tablet header** (audit R6): a menu below 1100 px with the five sections. Below 600 px it also holds the languages and the motion switch, so pausing no longer needs a 12,000 px scroll to the footer.
- **Robustness** (audit R6):
  - If the app never starts, the still layout returns: at once on a script error, or 5 s after load. The CSP hash was updated.
  - The quality governor tells a 30 fps cap (Low Power Mode, energy saving) from a slow GPU by checking whether a step down helps.
  - A lost WebGL context that the browser restores brings the 3D back.
  - Side margins respect notch insets.
- **Legal details** (owner, mid-run): BLAKRA LLC, 901 H St Ste 120, Sacramento, CA 95814-1817, USA, +1 (279) 300-9011.
  - New `/legal/` page (Legal notice, Impressum, Mentions légales, Aviso legal).
  - Privacy additions: "Who we are", the legal basis, the US location, the full rights including complaint, and server logs.
  - Footer: "© 2024–2026 BLAKRA LLC" and a link to the Legal notice.
  - JSON-LD: legalName, address and telephone.
  - Facts register updated.

## Evidence
Final build, 2026-10-27:
- tsc clean; vitest 108/108.
- Build: 20 pages, sitemap with 16 URLs.
- e2e 126/126, including the four legal pages; the home page is 11.9 screens.
- Lighthouse mobile: / 90, /de/ 90, /legal/ 95; accessibility, best practices and SEO 100.
- Case cards: no clipping (0 px) at 1280×700 up to 2560×1440 in all four languages. The held layout stays at 1280×800, 1366×768 and 1536×730. With WCAG text spacing applied the day switches to the list with nothing cut.
- Header: no overlaps from 320 to 1280 px in four languages.
- Failed-script fallback: 0.3 s after a script error, 5 s after a silent failure; all content readable.
- WebGL restore: the world comes back.
- Real GPU (Intel UHD, Vulkan) with a 30 fps cap: quality stays at 0.85 and the animation keeps running. Before the fix it dropped to 0.55.
- Reviews:
  - Code review: 3 findings, all fixed.
  - Security re-check: the earlier S1–S5 are fixed. Of its 4 new minor findings, N1–N3 are fixed. N4 is fixed by stripping invisible and bidi characters; non-ASCII addresses stay accepted on purpose.

## Not verified / risks
- `nginx -t` was not run (nginx is not installed here); the config was reviewed twice.
- Safe-area margins were not tested on a real notched phone.
- The governor's "step didn't help" test assumes vsync-quantized frames. A GPU that is just too slow for 60 fps may now stay at 30 fps at higher quality instead of stepping down further.
- The German, French and Spanish legal and privacy text has not been reviewed by a native speaker or a lawyer.
- On the privacy page, the long right-hand column runs over the bright ring of the background; this was already the case before the change.

## Still the owner's
- `certbot -d blakra.us -d www.blakra.us` and the www server block.
- DKIM and DMARC in Google Admin and DNS.
- Deploying `contact.gs` as a new version with a new Sheet and the hourly `digest` trigger.
- Log rotation of 14 days on the server.
- The rest of the entity details: state of organization, entity number, representative, an EU representative if needed, and the hosting provider for the French page.

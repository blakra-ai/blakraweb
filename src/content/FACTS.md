# Facts register

Every claim on the site, where it came from, and its status. Change a claim on the
site only after updating its line here. "Live site" means the text of the previous
blakra.us read on 2026-10-26; "owner" means Ashen confirmed it (on the date given).

Where to edit: shared facts (names, numbers, stages, platforms, links, photos) in
`src/content/shared.ts`; wording in `src/content/locales/<language>.ts` (en is the
source; de, fr and es follow it). Dev builds (`npm run dev`) show a yellow DRAFT
badge on any product marked `draft: true` in `shared.ts`.

## Open items before launch (owner, 2026-10-27)

| Item | Where | What to supply | Until then |
|---|---|---|---|
| Legal entity, still missing: state of organization, entity (file) number, the manager or managing member who represents it; an EU representative (GDPR Art. 27) if one is needed; the hosting provider's name and address (France, LCEN) | Legal notice, Privacy | owner; a lawyer confirms which apply | Legal notice shows name, address, email and the contact form (phone removed by owner 2026-11-02) |
| Server log retention: 14 days | Privacy | set it on the server (logrotate, see deploy/nginx.conf.example) and confirm | shown as written (default, 2026-10-27) |
| The skin-analysis AI's product name and platforms | Products, Sponsors and buyers, structured data | LIOXSA, iOS, lioxsa.com (owner, 2026-11-02) | — |
| What a party receives under NDA: live demo, architecture walkthrough, code review | Products lede (offered to a sponsor or buyer) and card, Sponsors and buyers, contact door | confirm all three exist (owner confirmed the product is working and ready) | shown as written (writer default, 2026-10-27) |
| Enquiry retention: 12 months after the last exchange | Privacy | confirm the period | shown as written (default) |
| Photos and LinkedIn for the three principals; social accounts BLAKRA owns | People, footer, structured data | optional; add each account to `company.social` once it exists | drawn portraits; no social links |
| Cloud and backend tech (Node.js, Kubernetes, CI/CD, multi-cloud) | Seven layers | confirm it is still accurate | as on the live site |
| Launch and search layer: technical SEO, content and media for launch | Seven layers, pulse (online shop) | owner listed SEO and media (2026-10-26); no case study shows it | framed as part of launch, no standalone claim |

| Claim on the site | Where | Source | Status |
|---|---|---|---|
| No team size, client count, countries or uptime figures | everywhere | owner | confirmed: deliberately absent |
| Hamid Reza Alizadeh (Ashen); Mehdi Jannatipour; Habiburahman Karokhi (titles below) | Titles on People; of the names, only the founder's is on the site (Sponsors and buyers). The other two left in the compliance pass, 2026-11-02 (data minimization); names on People are the owner's open decision | live site team + owner | confirmed; no years of experience shown |
| Our leadership team (the three principals) leads each project; specialists are hired for the projects they fit, under BLAKRA's lead and contract; the team grows or shrinks with the work; everyone works remotely | People, hero (leadership team), About (remote: "Our teams work remotely"; it left the hero 2026-11-06) | owner, 2026-10-27 | confirmed |
| The first conversation and the technical assessment are free | How we work, About, Contact | live site ("free technical architecture assessment"); owner approved the blueprint defaults, 2026-10-26 | approved default |
| A fixed scope, a fixed price and an agreed bar for done for the first system; working software every two weeks | Hero facts, How we work, About | blueprint v5 default, approved by the owner 2026-10-26 | approved default |
| You own the code and the data; standard, documented tools, so the system stays yours to run and extend; a named account lead (the practices line below). This line says you own it, not from when, so the site gives no date ("from day one" removed 2026-11-06) | Hero facts, How we work, About | blueprint v5 default, approved by the owner 2026-10-26; account lead per owner brief, 2026-11-02 | approved default |
| "Best fit: software that runs a real process, from operations to AI." Nothing on the site says what the firm will not take on: the old "Not a fit: brochure websites" line and its FAQ twin are gone (owner's copy rule, relayed 2026-11-06) | llms.txt (`process.notFit`), About (FAQ) | blueprint v5 default, approved by the owner 2026-10-26; reworded under the owner's rule | approved default |
| Gartner statistic (agentic AI projects canceled by 2027) | not on this site | owner removed it 2026-11-02; the leftover `engine.crownSource` string was deleted 2026-11-06 | deliberately absent |
| References on request | (not on the site) | blueprint default: only if at least two clients agree | omitted until confirmed |
| Reply within 24 hours, from an engineer who would build it | Hero facts, Contact, How we work | live site ("We'll respond within 24 hours"); owner chose 24 hours, 2026-10-26 | confirmed |
| Contact: hello@blakra.us on the site; postal address on the Legal notice and Privacy pages and in the structured data | Contact, footer, Legal notice, Privacy, structured data | owner, 2026-10-26 (email) and 2026-10-27 (address, phone) | confirmed |
| Legal entity: BLAKRA LLC, 901 H St Ste 120, Sacramento, CA 95814-1817, USA | Footer, Legal notice, Privacy ("Who we are"), structured data | owner, 2026-10-27; phone removed from the site and the code 2026-11-02 | confirmed |
| Founded in 2024 (footer years, structured data foundingDate) | Footer, structured data | owner, 2026-10-26 (the live site says 2024 in its timeline and 2019 in its structured data) | confirmed |
| Social links: none | Footer, structured data | checked 2026-10-27: github.com/blakra is an unrelated personal account ("Blaž", one 2018 repo); linkedin.com/company/blakra and x.com/blakra do not exist | removed (the old site's links were wrong) |
| Titles: Founder and Chief Technology Officer; Senior Full-Stack Engineer and Backend Lead; Head of Operations and Corporate Compliance, United States | People, structured data (founder) | live site team section | confirmed |
| Live-site figures (35+ engineers, 48+ clients, 22 countries, 99.97% uptime, years of experience) | not on this site | owner chose no headline stats | deliberately absent |
| Start with one fixed-scope project; after launch, further work and support by agreement | How we work | owner, 2026-10-27 (support after launch: yes, by agreement) | confirmed |
| We monitor, fix and improve systems after launch, under a written support agreement ("design, build and run") | Hero, meta, How we work | owner, 2026-10-27 | confirmed |
| An NDA before you share details; client names stay confidential under our contracts | How we work, Selected client work, About, Contact | owner, 2026-10-27 (no right to publish client names or links) | confirmed as policy |
| Selected client work: eight projects delivered to private clients (Vitrin, Veyra, Vitrin Console, Flowline, Helya, Nuvoq, Tiravan, Raah); the client owns each product, details under NDA, screens representative; no client names and no user data on the screens | Selected client work, /work/* pages, llms.txt | owner, 2026-11-02; "no user data" cited as the owner's portfolio rule in run 2026-11-06-polish, no earlier record | confirmed framing; no client names, no figures; [CONFIRM] "no user data" |
| Skin-analysis AI: analyzes facial skin and recommends professional products; written from scratch with no third-party dependencies; images are never sent to outside services; working and ready | Products, Why one team, Sponsors and buyers | owner, 2026-10-27 | confirmed |
| On offer for our products: sponsorship, a license, or outright sale with the source code and IP | Products, Sponsors and buyers | owner, 2026-10-27 | confirmed |
| Other products of our own are in development, discussed under NDA | Products, Sponsors and buyers | owner, 2026-10-27 ("there are other products as well") | confirmed |
| BLAKRA = black hole + chakra | Seven layers (one caption) | owner, 2026-10-27 | confirmed |
| No seed round, data room, deck contents or revenue figures | not on this site | owner wants sponsors or buyers, 2026-10-27 | deliberately absent |
| The form sends what the visitor types plus the time and page language (no page path since 2026-11-02); delivered via Google Apps Script to the company inbox and a Google Sheet; Sheet rows deleted after 12 months by `purge`; no cookies, analytics or trackers; fonts self-hosted; only local-storage item is the motion choice | Privacy | this build (server/contact.gs, no trackers in code) | true of this build; `purge` trigger must be installed |
| Five practices: Engineering, Product Design, Data & AI, Cloud & DevOps, Delivery; QA and documentation standard in every delivery; a named account lead; projects staffed from a specialist network under one BLAKRA contract | People, About, How we work | owner brief relayed 2026-11-02 (run 2026-11-02-company-content, accepted as drafted) | [CONFIRM] before launch; no headcount, offices or practice heads |
| AI: any AI tool the client needs, on open source or platforms (the owner's binding instruction, 2026-11-02 and again 2026-11-06; it overrides the objection to "any" in run 2026-11-02-company-content, review.md): agents, document answers, OCR/extraction, vision, training and ML (data labeling, model training and fine-tuning, classic predictive models, MLOps), evaluation; open-source (Llama, Mistral, Qwen, Whisper), self-hosted incl. on client servers; platforms (OpenAI, Anthropic Claude, Google Gemini, Azure, AWS, Google Cloud AI services), named as tools, not partners | AI section | owner, 2026-11-02 | confirmed |
| Industries delivered for: retail and e-commerce, finance, logistics, manufacturing, education, healthcare and wellness, real estate, hospitality, professional services, media, public sector and non-profit, energy, AI products, robotics | About, Selected client work (short form) | owner, 2026-11-02 | [CONFIRM] strike any not delivered for |
| FAQ defaults: daily time-zone overlap fixed at kickoff; English or another agreed language; access limited to those who need it | About (FAQ) | draft defaults accepted by owner 2026-11-02 | [DEFAULT]/[CONFIRM] |
| Google LLC takes part in the EU-U.S. Data Privacy Framework (incl. UK and Swiss extensions) | Privacy (transfers) | dataprivacyframework.gov listing; re-check before launch | needs lawyer review with the rest of the Privacy text |

## Search and AI (run 2026-11-03-seo)

Structured data (src/head.ts), llms.txt / llms-full.txt (src/llms.ts) and the social previews
(public/og, `npm run og:pages` after `npm run build`) repeat only claims listed above. No ratings,
reviews, prices, phone or people are marked up. robots.txt allows every crawler, AI search and
training bots included (owner goal: be found and cited).

| Owner action | How | Until then |
|---|---|---|
| Google Search Console ownership | Add the property, choose "HTML tag", build with `VITE_GOOGLE_SITE_VERIFICATION=<token>` (or verify by DNS TXT, preferred) and submit https://blakra.us/sitemap.xml | no tag is emitted (no placeholder token ships) |
| Bing Webmaster Tools ownership | "Import from Google Search Console", or build with `VITE_BING_SITE_VERIFICATION=<token>` (msvalidate.01) | no tag |
| IndexNow (Bing, Yandex, Seznam, Naver) | Generate a key, put `public/<key>.txt` containing the key, ping https://api.indexnow.org/indexnow after each deploy | not set up |
| Google Business Profile | Only if BLAKRA serves customers at an address; the Sacramento address is a registered office, so a service-area profile with a hidden address is the only accurate option | not created |
| Social accounts | Create them, add to `company.social`; they become `sameAs` | no sameAs |
| OG images | Re-run `npm run build && npm run og:pages` after changing a page's headline or description, commit public/og | images match the copy as of 2026-11-03 |

## Illustrations
The film's old scene labels ("Store 04", "Line 3 · machine 4 stopped", the inbox messages) and its
numbers ("65%", "12 stores", "25 drivers") are gone from the code. The drawn LIOXSA phone is a
neutral recreation of the app's public look; it carries no claims and no user data.

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
| Legal entity: name, jurisdiction, registration number | Footer, Privacy ("Who we are"), structured data | the entity behind the site; the "United States" title implies a US entity | footer says "BLAKRA"; the Privacy page has no "Who we are" section |
| The skin-analysis AI's product name and platforms | Products, Sponsors and buyers, structured data | the real name; the platforms it runs on | descriptive name "Skin analysis AI"; the Platforms row is hidden |
| What a party receives under NDA: live demo, architecture walkthrough, code review | Products card, Sponsors and buyers, contact door | confirm all three exist (owner confirmed the product is working and ready) | shown as written (writer default, 2026-10-27) |
| Enquiry retention: 12 months after the last exchange | Privacy | confirm the period | shown as written (default) |
| Case sources: year, duration, BLAKRA's role, how each number was measured | Proof | optional; raises credibility | cards show the confirmed numbers without them |
| Photos and LinkedIn for the three principals; active social accounts | People, footer | optional | drawn portraits; social links as on the live site |
| Cloud and backend tech (Node.js, Kubernetes, CI/CD, multi-cloud) | Seven layers | confirm it is still accurate | as on the live site |
| Launch and search layer: technical SEO, content and media for launch | Seven layers, pulse (online shop) | owner listed SEO and media (2026-10-26); no case study shows it | framed as part of launch, no standalone claim |

| Claim on the site | Where | Source | Status |
|---|---|---|---|
| No team size, client count, countries or uptime figures | everywhere | owner | confirmed: deliberately absent |
| Retail chain, 12 stores; hand counts, stockouts and overstock, no view of supplier lead times | Proof 01 (retail) | live site, Selected Work 01 | confirmed (owner: all five case studies are real) |
| Inventory system with low-stock alerts, purchase-order drafting and sales trends, integrated with POS and QuickBooks | Proof 01 (retail) | live site, 01 | confirmed |
| 40% fewer stockouts; 3 hours saved daily | Proof 01 (retail) | live site, 01 impact | confirmed |
| React, Node.js, PostgreSQL, POS and QuickBooks integration | Proof 01 (retail) | live site, 01 technical approach | confirmed |
| Delivery fleet, 25 drivers; printed lists and phone calls; no live driver view | Proof 02 (logistics) | live site, 02 | confirmed |
| Dispatch dashboard, optimized routes, GPS tracking, driver app, proof of delivery | Proof 02 (logistics) | live site, 02 | confirmed |
| 20% more deliveries per shift | Proof 02 (logistics) | live site, 02 impact | confirmed |
| React, Mapbox, Node.js routing engine, React Native | Proof 02 (logistics) | live site, 02 | confirmed |
| Independent insurance brokerage; paper policies; no self-service | Proof 03 (insurance) | live site, 03 | confirmed |
| OCR digitization pipeline; secure portal for policies, uploads, messaging agents | Proof 03 (insurance) | live site, 03 | confirmed |
| 24/7 client self-service | Proof 03 (insurance) | live site, 03 impact | confirmed |
| Python OCR, React, AWS S3, SendGrid | Proof 03 (insurance) | live site, 03 | confirmed |
| Mid-size manufacturing plant; stoppages reported hours later | Proof 04 (manufacturing) | live site, 04 | confirmed |
| IoT sensors, live dashboard, machine status, cycle counts, alerts on stoppage | Proof 04 (manufacturing) | live site, 04 | confirmed |
| "Live: downtime seen as it happens" | Proof 04 (manufacturing) | live site, 04 impact ("real-time machine visibility") | confirmed (qualitative) |
| MQTT, TimescaleDB, React, WebSockets | Proof 04 (manufacturing) | live site, 04 | confirmed |
| E-commerce brand, 50,000 orders a month; peak-season flood of order-status and return questions | Proof 05 (e-commerce) | live site, 05 | confirmed |
| AI assistant: order lookup, starts returns, hands complex cases to people in Slack | Proof 05 (e-commerce) | live site, 05 | confirmed |
| 65% of questions answered automatically | Proof 05 (e-commerce) | live site, 05 impact | confirmed |
| Hamid Reza Alizadeh (Ashen); Mehdi Jannatipour; Habiburahman Karokhi (titles below) | People | live site team + owner | confirmed; no years of experience shown |
| The three principals lead each project; specialists are hired for the projects they fit, under BLAKRA's lead and contract; the team grows or shrinks with the work; everyone works remotely | People, hero ("Fully remote") | owner, 2026-10-27 | confirmed |
| The first conversation and the technical assessment are free | How we work | live site ("free technical architecture assessment"); owner approved the blueprint defaults, 2026-10-26 | approved default |
| A fixed scope, a fixed price and an agreed bar for done for the first system; working software every two weeks | How we work | blueprint v5 default, approved by the owner 2026-10-26 | approved default |
| You own the code and the data; standard, documented tools, no lock-in; a named engineer, never a ticket queue | How we work | blueprint v5 default, approved by the owner 2026-10-26 | approved default |
| "Not a fit: brochure websites, or software with no process behind it." | How we work | blueprint v5 default, approved by the owner 2026-10-26 | approved default |
| Gartner expects over 40% of agentic AI projects to be canceled by the end of 2027, because of escalating costs, unclear business value or inadequate risk controls | Seven layers (crown) | Gartner press release, 25 June 2025 (checked 2026-10-27) | sourced |
| References on request | (not on the site) | blueprint default: only if at least two clients agree | omitted until confirmed |
| Reply within 24 hours, from an engineer who would build it | Contact, How we work | live site ("We'll respond within 24 hours"); owner chose 24 hours, 2026-10-26 | confirmed |
| Contact by email only: hello@blakra.us; no postal address and no phone are published | Contact, footer, structured data | live site (email is the only channel); owner, 2026-10-26 | confirmed |
| Founded in 2024 (footer years, structured data foundingDate) | Footer, structured data | owner, 2026-10-26 (the live site says 2024 in its timeline and 2019 in its structured data) | confirmed |
| Social: LinkedIn linkedin.com/company/blakra, GitHub github.com/blakra, X twitter.com/blakra | Footer, structured data | live site footer | confirmed |
| Titles: Founder and Chief Technology Officer; Senior Full-Stack Engineer and Backend Lead; Head of Operations and Corporate Compliance, United States | People, structured data (founder) | live site team section | confirmed |
| Live-site figures (35+ engineers, 48+ clients, 22 countries, 99.97% uptime, years of experience) | not on this site | owner chose no headline stats | deliberately absent |
| Start with one fixed-scope project; after launch, further work and support by agreement | How we work | owner, 2026-10-27 (support after launch: yes, by agreement) | confirmed |
| We monitor, fix and improve systems after launch, under a written support agreement ("design, build and run") | Hero, meta, How we work | owner, 2026-10-27 | confirmed |
| An NDA before you share details; client names stay confidential under our contracts | How we work, Proof | owner, 2026-10-27 (no right to publish client names or links) | confirmed as policy |
| Also delivered: admin panels and online shops for organizations; an AI design assistant; an AI system on one organization's security-sensitive data; a shopping app; a smart-assistant app; warehouse management systems and databases; bots of many kinds | Proof (Also delivered), pulse | owner, 2026-10-27 | confirmed; no names, links or numbers |
| Skin-analysis AI: analyzes facial skin and recommends professional products; written from scratch with no third-party dependencies; images are never sent to outside services; working and ready | Products, Sponsors and buyers | owner, 2026-10-27 | confirmed |
| On offer for our products: sponsorship, a license, or outright sale with the source code and IP | Products, Sponsors and buyers | owner, 2026-10-27 | confirmed |
| Other products of our own are in development, discussed under NDA | Products, Sponsors and buyers | owner, 2026-10-27 ("there are other products as well") | confirmed |
| BLAKRA = black hole + chakra | Seven layers (one caption) | owner, 2026-10-27 | confirmed |
| No seed round, data room, deck contents or revenue figures | not on this site | owner wants sponsors or buyers, 2026-10-27 | deliberately absent |
| The form sends what the visitor types plus the time, page and page language; delivered via Google Apps Script to the company inbox and a Google Sheet; no analytics or ad cookies; fonts self-hosted | Privacy | this build (server/contact.gs, no trackers in code) | true of this build |

## Illustrations
Scene labels ("Store 04", "Line 3 · machine 4 stopped", the inbox messages) are illustrative
and carry no claims. The only numbers in scenes are the confirmed outcomes ("65%") and
the confirmed scale ("12 stores", "25 drivers").

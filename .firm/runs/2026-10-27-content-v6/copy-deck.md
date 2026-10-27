# blakra.us copy deck, content v6 (2026-10-27)

Source of truth: owner-answers.md, strategy.md, psych.md, FACTS.md, and the lead's decisions. English is the source locale; de, fr and es translate from it.

**Status legend.** CHANGED: new text. KEEP: unchanged (the text is repeated so the deck stands alone). NEW: a key to add. REMOVED: delete the key and its element. **[OWNER]**: this is the default and ships unless the owner corrects it. The questions are in section 5.

---

## 1. Preface

**Voice, in three rules**
1. **Literal first.** Name things in engineering words: admin panel, online shop, warehouse system, bot. The visuals carry the black hole and the chakra.
2. **Only what a buyer can check.** No "every", "always" or "end to end". Use numbers only with a confirmed source, and never write a plan as a status.
3. **Short and calm.** One idea per sentence, ending on a fact, with no exclamation marks.

**The pitch, in two sentences**
> BLAKRA designs, builds and runs the software organizations run on: operations and inventory systems, admin panels and shops, apps, bots, and AI that works on their own data. Three principals lead each project from the first scope to production, and we put the same engineering into products of our own.

---

## 2. Copy by key

### meta

| Key | Status | New text | Note |
|---|---|---|---|
| `meta.homeTitle` | CHANGED | BLAKRA — Operations software, apps and AI, built to run | |
| `meta.homeDescription` | CHANGED | BLAKRA designs, builds and runs the software organizations run on: operations and inventory systems, admin panels and online shops, web and mobile apps, bots, and AI on your own data. Three principals lead each project. | Also feeds the structured-data `description`. "runs": [OWNER] Q1 |
| `meta.investorsTitle` | CHANGED | Products for sponsors and buyers — BLAKRA | |
| `meta.investorsDescription` | CHANGED | Software products BLAKRA built at its own cost, open to a sponsor, a licensee or a buyer. Demo and code review under NDA. | [OWNER] Q7, Q8 |
| `meta.privacyTitle` | KEEP | Privacy — BLAKRA | |
| `meta.privacyDescription` | KEEP | What BLAKRA collects through this site, why, and what happens to it. | |
| `meta.notFoundTitle` | KEEP | Not found — BLAKRA | |
| `meta.ogAlt` | KEEP | BLAKRA: Software with gravity. | The tagline stays on the social image. |

### ui

| Key | Status | New text | Note |
|---|---|---|---|
| `ui.skip` | KEEP | Skip to content | |
| `ui.home` | KEEP | home | |
| `ui.nav.work` | KEEP | Work | Points to #day (Proof). |
| `ui.nav.engine` | CHANGED | Capabilities | Points to #engine. Matches the new section eyebrow. |
| `ui.nav.products` | KEEP | Products | |
| `ui.nav.people` | KEEP | People | |
| `ui.nav.investors` | CHANGED | Sponsors and buyers | Points to /investors (URL unchanged). |
| `ui.cta` | KEEP | Start a project | |
| `ui.pauseMotion` | KEEP | Pause motion | |
| `ui.motion` | KEEP | Motion | |
| `ui.on` | KEEP | on | |
| `ui.off` | KEEP | off | |
| `ui.language` | KEEP | Language | |
| `ui.newTab` | KEEP | opens in a new tab | |
| `ui.builtWith` | KEEP | Built with | |
| `ui.before` | KEEP | Before | |
| `ui.now` | KEEP | Now | |
| `ui.usesEngine` | CHANGED | Layers | The label before the layer chips on case and product cards. "Runs on" implied the shared engine. |

### prologue (hero)

| Key | Status | New text | Note |
|---|---|---|---|
| `prologue.eyebrow` | CHANGED | BLAKRA — Software with gravity. | The tagline becomes the small line above the H1. |
| `prologue.title.before` | CHANGED | We build what | Line 1, roman, 13 characters (the same as "Software with"). |
| `prologue.title.human` | CHANGED | organizations run on | Line 2, italic. About 20 serif-italic characters: at the current clamp() size this fits the 50rem column from 900px up. Check it at 900–1024px. |
| `prologue.title.after` | CHANGED | . | Full stop, no leading space. The H1 reads "We build what *organizations run on*." |
| `prologue.lede` | CHANGED | We design, build and run operations and inventory systems, admin panels and online shops, web and mobile apps, bots, and AI that works on your own data. Three principals lead each project, from the first scope to production. | 224 characters (the current lede has 232). "run": [OWNER] Q1 |
| `prologue.cue` | KEEP | What do you need built? | |
| `prologue.also` | CHANGED | Other ways to work with us: | It is followed by the links "Partner with us · Sponsor or buy a product" (the door labels). |
| `prologue.facts` | NEW | Founded 2024 · Fully remote · Reply within 24 hours | A one-line fact strip under the actions; all three facts are confirmed. Render it as three items separated by "·". |

### pulse (what do you need built)

| Key | Status | New text | Note |
|---|---|---|---|
| `pulse.eyebrow` | KEEP | Why one team | |
| `pulse.title` | KEEP | A product is only as strong as its weakest hand-off. | |
| `pulse.body` | CHANGED | Design from one agency, the app from another, the backend from a freelancer and the AI from a consultant. Each hand-off loses something, and when it breaks, each vendor points at the next. With us it is one contract and one team, led by the same three principals, answering for all of it. | Replaces "We build every layer ourselves" with a claim of responsibility, not headcount. |
| `pulse.note` | REMOVED | — | The orbit note and its element are removed. |
| `pulse.ask` | KEEP | What do you need built? | |
| `pulse.needs.ai` `.apps` `.automation` `.data` `.cloud` `.design` `.growth` | REMOVED | — | Replaced by work-type options keyed by a new `NeedId` (table in section 3). |
| `pulse.needs.panel.label` | NEW | An admin panel to run our operations. | The labels also start the contact message, so each one is a sentence in the client's voice. |
| `pulse.needs.panel.tag` | NEW | Admin panel | |
| `pulse.needs.shop.label` | NEW | An online shop, or a shopping app. | |
| `pulse.needs.shop.tag` | NEW | Online shop | |
| `pulse.needs.assistant.label` | NEW | An AI assistant that knows our business. | |
| `pulse.needs.assistant.tag` | NEW | AI assistant | |
| `pulse.needs.aidata.label` | NEW | AI that works on our own data, sensitive data included. | Supported by the owner's "AI on one organization's security-sensitive data". It promises nothing about where the data is hosted. |
| `pulse.needs.aidata.tag` | NEW | AI on your data | |
| `pulse.needs.app.label` | NEW | A mobile app for our customers or our team. | |
| `pulse.needs.app.tag` | NEW | Mobile app | |
| `pulse.needs.warehouse.label` | NEW | A warehouse, inventory or database system. | |
| `pulse.needs.warehouse.tag` | NEW | Warehouse and data | |
| `pulse.needs.bots.label` | NEW | Bots that take the repetitive work off our team. | |
| `pulse.needs.bots.tag` | NEW | Bots and automation | |
| `pulse.all` | CHANGED | A complete system, from the ground up. | The eighth option; it lights all seven layers. It still reads as the start of a message. |
| `pulse.allTag` | NEW | All seven layers | Replaces the reuse of `engine.title` as this option's tag. |
| `pulse.takes` | KEEP | What it takes | The label for the lit layer chips. |
| `pulse.verdict` | CHANGED | One team builds it, from the foundation up. | No `{n}` and no layer count. |
| `pulse.verdictAll` | CHANGED | All seven layers, one team, one named lead. | |
| `pulse.proof` | CHANGED | Where we've done it | "Proof in production" made a production claim for options that have no case. |
| `pulse.everyProject` | CHANGED | For clients under NDA: see Also delivered. | The fallback when an option has no case (shop, all). Link it to #delivered. |
| `pulse.tell` | KEEP | Tell us about it | |

### day (Proof)

| Key | Status | New text | Note |
|---|---|---|---|
| `day.srTitle` | KEEP | Five businesses, five systems | |
| `day.eyebrow` | KEEP | Proof | |
| `day.title` | CHANGED | Five businesses. Five systems we built and launched. | Replaces "that run on their own". "Launched" is supported by the measured results. It claims nothing about who runs them today. |
| `day.lede` | CHANGED | What each business had, what we built and what changed. Client names stay confidential under our contracts. | The confidentiality line, stated as policy. |
| `day.hint` | KEEP | Scroll to see all five | |
| `day.delivered.title` | NEW | Also delivered | A list under the five cards, anchor #delivered. |
| `day.delivered.note` | NEW | Client work we can describe but not show. Names and links stay with the clients. | |
| `day.delivered.items[0]` | NEW | Admin panels and online shops for organizations | One row each. Wording comes from the owner's list; no added detail, no numbers. |
| `day.delivered.items[1]` | NEW | An AI assistant for design work | |
| `day.delivered.items[2]` | NEW | An AI system on one organization's security-sensitive data | [OWNER] Q11: promote it to a sixth card? |
| `day.delivered.items[3]` | NEW | A shopping app | |
| `day.delivered.items[4]` | NEW | A smart-assistant app | |
| `day.delivered.items[5]` | NEW | Warehouse management systems and databases | |
| `day.delivered.items[6]` | NEW | Bots of many kinds | |

### chapters (the five case cards)

The `industry`, `sector` and `system` fields stay as they are for all five cases. The `moment` lines no longer refer to a time of day, and "every" is removed from the body text.

**h06 (retail)**

| Key | Status | New text |
|---|---|---|
| `chapters.h06.industry` | KEEP | Retail |
| `chapters.h06.sector` | KEEP | Retail chain, 12 stores |
| `chapters.h06.system` | KEEP | Inventory and reorder system |
| `chapters.h06.moment` | CHANGED | Twelve stores, counted by one system. The reorders arrive drafted. |
| `chapters.h06.before` | KEEP | Stock was counted by hand across twelve stores. Shelves ran empty while back rooms overflowed, and nobody could see supplier lead times. |
| `chapters.h06.now` | CHANGED | One inventory system covers all twelve stores, flags low stock and drafts the purchase orders. It connects to the point-of-sale and accounting software the team already used. |
| `chapters.h06.outcomes` | CHANGED | ['fewer stockouts', 'saved each day'] |

**h09 (logistics)**

| Key | Status | New text |
|---|---|---|
| `chapters.h09.industry` | KEEP | Logistics |
| `chapters.h09.sector` | KEEP | Delivery fleet, 25 drivers |
| `chapters.h09.system` | KEEP | Routing and dispatch platform |
| `chapters.h09.moment` | CHANGED | Routes are planned for each driver. Dispatch sees the fleet live. |
| `chapters.h09.before` | KEEP | Dispatch ran on printed lists and phone calls. Nobody knew where a driver was, or whether a delivery had landed, until someone called in. |
| `chapters.h09.now` | CHANGED | A dispatch dashboard assigns optimized routes and shows each driver live. Drivers get their stops in their own app and capture proof of delivery on the doorstep. |
| `chapters.h09.outcomes` | KEEP | ['more deliveries per shift'] |

**h13 (insurance)**

| Key | Status | New text |
|---|---|---|
| `chapters.h13.industry` | KEEP | Insurance |
| `chapters.h13.sector` | KEEP | Independent insurance brokerage |
| `chapters.h13.system` | KEEP | Document pipeline and client portal |
| `chapters.h13.moment` | CHANGED | A client needs their policy. They open the portal instead of calling. |
| `chapters.h13.before` | CHANGED | Policies lived on paper. Each client question meant a phone call, a search and a wait, and clients had no way to help themselves. |
| `chapters.h13.now` | KEEP | Documents are digitized and read automatically, then filed into a secure portal where clients view their policies, upload papers and message their agent. |
| `chapters.h13.outcomes` | KEEP | ['client self-service'] |

**h17 (manufacturing)**

| Key | Status | New text |
|---|---|---|
| `chapters.h17.industry` | KEEP | Manufacturing |
| `chapters.h17.sector` | KEEP | Mid-size manufacturing plant |
| `chapters.h17.system` | KEEP | Production line monitoring |
| `chapters.h17.moment` | CHANGED | A machine stops. The alert goes out as it happens, not hours later in a report. |
| `chapters.h17.before` | KEEP | Operators had no live view of the machines. A stoppage surfaced hours later, in a report, long after it could have been fixed. |
| `chapters.h17.now` | KEEP | Sensors on the line stream into a live dashboard: machine status, cycle counts, and an alert the moment something stops. |
| `chapters.h17.outcomes` | KEEP | ['downtime seen as it happens'] |

**h22 (e-commerce)**

| Key | Status | New text |
|---|---|---|
| `chapters.h22.industry` | KEEP | E-commerce |
| `chapters.h22.sector` | KEEP | E-commerce brand, 50,000 orders a month |
| `chapters.h22.system` | KEEP | Customer service AI assistant |
| `chapters.h22.moment` | CHANGED | Peak season, same questions. The assistant answers most of them. |
| `chapters.h22.before` | CHANGED | Each peak season buried the team under the same questions about order status and returns, and customers waited in line for answers. |
| `chapters.h22.now` | KEEP | An AI assistant looks up orders and starts returns by itself, and hands anything unusual to a person in Slack. |
| `chapters.h22.outcomes` | KEEP | ['of questions answered automatically'] |

"Most of them" in the h22 moment stands for the confirmed 65%.

### scenes (labels inside the case illustrations)

Only one label changes. The others are illustrative, carry no claims, and stay within their character budgets.

| Key | Status | New text | Note |
|---|---|---|---|
| `scenes.stock.title` | KEEP | Stock · 12 stores | |
| `scenes.stock.store` | KEEP | Store |
| `scenes.stock.chip` | KEEP | Purchase orders drafted |
| `scenes.stock.chipSub` | KEEP | Store 04 · Store 09 · from sales trends |
| `scenes.routes.live` | KEEP | Live · 25 drivers |
| `scenes.routes.delivered` | KEEP | Delivered |
| `scenes.routes.proof` | KEEP | Photo proof saved |
| `scenes.routes.sheet` | KEEP | Dispatch list |
| `scenes.routes.calls` | KEEP | ['Where are you now?', 'Which address was it?', 'Running late again'] |
| `scenes.documents.title` | KEEP | Client portal |
| `scenes.documents.sub` | KEEP | Policies · uploads · messages |
| `scenes.documents.rows` | KEEP | Home policy / PDF · ready to view; Auto policy / PDF · ready to view; Upload documents / Photos or forms; Message your agent / Replies arrive here; Renewal notice / PDF · ready to view |
| `scenes.line.line` | KEEP | Line |
| `scenes.line.alert` | KEEP | Line 3 · machine 4 stopped |
| `scenes.line.now` | KEEP | now |
| `scenes.line.report` | KEEP | Shift report |
| `scenes.line.reportNote` | KEEP | Line 3 stopped earlier today |
| `scenes.queue.title` | KEEP | Support inbox |
| `scenes.queue.sub` | CHANGED | Peak season | 11 characters (budget 16). "Overnight" was the last time-of-day label. |
| `scenes.queue.auto` | KEEP | answered automatically |
| `scenes.queue.messages` | KEEP | ['Where is my order?', 'I need to return this', 'Has my order shipped?', 'It arrived damaged', 'Can I change the address?', 'Do you ship abroad?'] |
| `scenes.queue.answered` | KEEP | Answered |
| `scenes.queue.returned` | KEEP | Return started |
| `scenes.queue.person` | KEEP | To a person |

### engine (seven layers)

| Key | Status | New text | Note |
|---|---|---|---|
| `engine.eyebrow` | CHANGED | Capabilities | |
| `engine.title` | KEEP | Seven layers. One team. | |
| `engine.lede` | CHANGED | Many organizations hire a separate vendor for each of these. We cover all seven and build them in order, from the foundation up, because each layer depends on the one beneath it. | "One engine every project inherits" is gone. Nothing here can be read as reused template code. |
| `engine.layers.ai.name` | KEEP | AI | |
| `engine.layers.ai.text` | CHANGED | AI assistants that read, answer and act inside your work, on your own data, with a person one step away. | "Enterprise" removed. |
| `engine.layers.growth.name` | CHANGED | Launch and search | The id stays `growth`. It is framed as part of launching, not as a selling point of its own ([OWNER] Q19). |
| `engine.layers.growth.text` | CHANGED | Technical SEO, content and media for launch, so the people a product is for can find it. | |
| `engine.layers.apps.name` | KEEP | Web and mobile | |
| `engine.layers.apps.text` | CHANGED | Web apps, admin panels, online shops and dashboards, and native apps for iOS and Android. | Uses the owner's own words. |
| `engine.layers.design.name` | KEEP | Product design | |
| `engine.layers.design.text` | CHANGED | Research, UX and interface design, so each screen fits the people who use it and the work they do. | |
| `engine.layers.automation.name` | KEEP | Automation and bots | |
| `engine.layers.automation.text` | KEEP | Workflows and bots that take over the repetitive work, in chat, on the web or inside your tools. | |
| `engine.layers.data.name` | KEEP | Data and integrations | |
| `engine.layers.data.text` | CHANGED | Databases, pipelines and integrations that put your tools, systems and devices on one source of truth. | |
| `engine.layers.cloud.name` | KEEP | Cloud and backend | |
| `engine.layers.cloud.text` | CHANGED | APIs, servers, cloud and security, engineered to carry real load, with monitoring from day one. | "Watched day and night" implied round-the-clock staff. |
| `engine.chakras` (all seven) | REMOVED | — | The chakra-name column is removed; the colors carry it. |
| `engine.symbol` | CHANGED | BLAKRA: black hole and chakra. Seven layers on one axis, from the foundation at the root to AI at the crown. | The one place the name is explained. |
| `engine.usedAt` | CHANGED | Used in | Followed by the system names, e.g. "Used in Inventory and reorder system · Routing and dispatch platform". |
| `engine.everywhere` | CHANGED | all five systems above | Shown for the cloud layer only: "Used in all five systems above". |
| `engine.crownTitle` | CHANGED | AI sits on top. It works only when the layers beneath it hold. | |
| `engine.crownText` | CHANGED | Gartner expects over 40% of agentic AI projects to be canceled by the end of 2027, because of rising costs, unclear business value or inadequate risk controls. We fix the scope first and build from the foundation up, so the AI has trusted data, working connections and a clear job. | Gartner's own stated causes, so the copy no longer implies that Gartner blames data foundations. US spelling ("canceled"). Source: gartner.com press release, 25 June 2025. |
| `engine.crownSource` | KEEP | Gartner, 25 June 2025 | |
| `engine.focus` | KEEP | Your project | |

### process (how we work)

| Key | Status | New text | Note |
|---|---|---|---|
| `process.eyebrow` | KEEP | How we work | |
| `process.title` | KEEP | Exact before expensive. | |
| `process.lede` | CHANGED | Software runs over budget when the spending starts before the problem is exact. We make it exact first. | States a mechanism instead of an unsourced "most software". |
| `process.steps[0].name` | CHANGED | Scope the problem | Replaces "Map the weight". |
| `process.steps[0].text` | CHANGED | We walk through the work with the people who do it, and name the process that costs you most. The first conversation and the technical assessment are free. | Works remotely ("We sit where the work happens" did not). |
| `process.steps[1].name` | KEEP | Build the first system | |
| `process.steps[1].text` | KEEP | A fixed scope, a fixed price and an agreed bar for done. Working software every two weeks, so you judge progress by using it. | Confirmed terms. "Every two weeks" is a schedule, not an overclaim. |
| `process.steps[2].name` | KEEP | Run it with you | [OWNER] Q1 |
| `process.steps[2].text` | CHANGED | Launch is where real use begins. We monitor, fix and improve it with your team, under a written support agreement. | The engine claim is removed. [OWNER] Q1 |
| `process.terms[0]` | KEEP | You own the code and the data. | |
| `process.terms[1]` | KEEP | Standard, documented tools. No lock-in. | |
| `process.terms[2]` | KEEP | A named engineer, never a ticket queue. | |
| `process.terms[3]` | KEEP | A reply within 24 hours. | |
| `process.terms[4]` | NEW | An NDA before you share details. | Confidentiality as policy. Terms become five items. |
| `process.shapes` | CHANGED | Start with one fixed-scope project. After launch, further work and support by agreement. | [OWNER] Q2. Drops "engineers inside your team" and "product squad". |
| `process.notFit` | KEEP | Not a fit: brochure websites, or software with no process behind it. | |

### products (home section)

| Key | Status | New text | Note |
|---|---|---|---|
| `products.eyebrow` | KEEP | Our products | |
| `products.title` | CHANGED | We also build products of our own. | "Also" keeps client work first. |
| `products.lede` | CHANGED | Alongside client work, we build software of our own, with the same principals and the same standards. Each product is open to a sponsor who will take it further, or a buyer who wants to own it outright. | |
| `products.roadmapTitle` | REMOVED | — | |
| `products.roadmap` (Now, Next, Horizon) | REMOVED | — | |
| `products.stage.live` `.pilot` `.building` | REMOVED | — | |
| `products.stage.working` | NEW | Working · open to offers | [OWNER] Q4. The status chip on the card. |
| `products.items.coach` `.commerce` `.ops` `.live` | REMOVED | — | All four placeholder products, with their shared.ts entries and previews. |
| `products.items.skin.line` | NEW | An AI that analyzes facial skin and recommends professional products. | |
| `products.items.skin.detail` | NEW | Written from scratch, with no third-party dependencies. Demo under NDA. | The owner's description. [OWNER] Q5, Q8 |
| `products.items.skin.offer` | NEW | Sponsorship, a license, or outright sale with source code and IP | [OWNER] Q7 |
| shared.ts `products[skin].name` | NEW | Skin analysis AI | [OWNER] Q3. A descriptive name until the owner gives the real one. |
| `products.offer` | NEW | On offer | The label of the new fact row on the card. |
| `products.more` | NEW | Other products of our own are in development. We discuss them under NDA. | One plain line or card next to the skin AI. [OWNER] Q9 |
| `products.platforms` | KEEP | Platforms | Hide the row until the owner gives the platforms ([OWNER] Q6). |
| `products.sharesWith` | REMOVED | — | The "Shares engine parts with" row and the `kin` field are removed. |
| `products.open` | KEEP | Visit | Shown only if the product has a link. |
| `products.investorsLink` | CHANGED | For sponsors and buyers: what is on offer | Links to /investors. |

### people

| Key | Status | New text | Note |
|---|---|---|---|
| `people.eyebrow` | KEEP | The people | |
| `people.title` | KEEP | The people you meet are the people who build. | |
| `people.lede` | CHANGED | Nothing stands between you and the engineers. The principals who scope your project lead it from the first call to production. | Drops "stays to run it" until Q1 is answered. |
| `people.roles[0].role` | KEEP | Founder and Chief Technology Officer | Title unchanged, as instructed. |
| `people.roles[0].owns` | KEEP | AI strategy and systems architecture, from the first diagram to production. | |
| `people.roles[0].ask` | KEEP | Ask about: whether AI belongs in your process at all. | |
| `people.roles[1].role` | KEEP | Senior Full-Stack Engineer and Backend Lead | Title unchanged. |
| `people.roles[1].owns` | CHANGED | The foundation of each system: backends, data platforms and reliability. | Replaces "The engine's backbone". |
| `people.roles[1].ask` | KEEP | Ask about: data you can trust and systems that stay up. | |
| `people.roles[2].role` | KEEP | Head of Operations and Corporate Compliance, United States | Title unchanged. See [OWNER] Q13 on the entity. |
| `people.roles[2].owns` | KEEP | Corporate governance, compliance and vendors, so the business side runs as cleanly as the code. | |
| `people.roles[2].ask` | CHANGED | Ask about: contracts, NDAs and data protection. | |
| `people.bench` | CHANGED | The three principals lead each project. Specialists join the projects they fit, under our lead and our contract, so the team grows or shrinks with the work. The whole team works remotely. | The team model, stated as fact. About twice the old length, so two lines under the cards. |

### contact

| Key | Status | New text | Note |
|---|---|---|---|
| `contact.eyebrow` | KEEP | Start here | |
| `contact.title` | CHANGED | Tell us what you need built. | Echoes the pulse question. |
| `contact.lede` | CHANGED | Within 24 hours, an engineer who would build it replies with a first read: what it involves, the risks we see and a sensible first step. No sales deck, no mailing list. | "The layers it needs" becomes "what it involves". The reply promise is confirmed in FACTS. |
| `contact.doorsLabel` | KEEP | I would like to | |
| `contact.doors.commission.label` | CHANGED | Commission a project | |
| `contact.doors.commission.hint` | CHANGED | A process takes too long, or a system needs building. | |
| `contact.doors.commission.org` | KEEP | Name or company | |
| `contact.doors.commission.msg` | KEEP | What takes too much of your day? | |
| `contact.doors.commission.placeholder` | CHANGED | For example: we re-type orders from email into our ERP by hand. | "every" removed. |
| `contact.doors.commission.submit` | KEEP | Send | |
| `contact.doors.partner.label` | KEEP | Partner with us | |
| `contact.doors.partner.hint` | KEEP | You build, sell or integrate, and want an engineering team behind you. | |
| `contact.doors.partner.org` | KEEP | Company | |
| `contact.doors.partner.msg` | KEEP | What could we build together? | |
| `contact.doors.partner.placeholder` | KEEP | For example: we sell to retailers and want an inventory system to offer them. | |
| `contact.doors.partner.submit` | KEEP | Send | |
| `contact.doors.invest.label` | CHANGED | Sponsor or buy a product | The id stays `invest`, so ?intent=invest links keep working. |
| `contact.doors.invest.hint` | CHANGED | You would like a demo under NDA and a conversation with the founder. | [OWNER] Q8 |
| `contact.doors.invest.org` | CHANGED | Name and company | |
| `contact.doors.invest.msg` | KEEP | What would you like to know? | |
| `contact.doors.invest.placeholder` | CHANGED | For example: the terms for buying the skin-analysis AI outright. | |
| `contact.doors.invest.submit` | CHANGED | Send | "Request the deck" is gone; there is no deck. |
| `contact.email` | KEEP | Email | |
| `contact.submitting` | KEEP | Sending… | |
| `contact.success` | KEEP | Thank you. We'll reply within 24 hours. | |
| `contact.failure` | KEEP | That didn't go through. Please try again, or write to us directly. | |
| `contact.privacy` | KEEP | We use these details only to reply to you. | |
| `contact.privacyLink` | KEEP | Privacy | |
| `contact.horizon` | CHANGED | Read by an engineer, not a sales team. | Replaces "Past this line, the problem is ours.", which promised responsibility before any contract. The event horizon stays in the visual. |
| `contact.noScript` | KEEP | This form needs JavaScript. You can write to us directly instead. | |
| `contact.direct` | KEEP | Prefer email? | Followed by hello@blakra.us. |
| `contact.errors.org` | KEEP | Tell us your name or your company's name. | |
| `contact.errors.email` | KEEP | Enter an email address we can reply to. | |
| `contact.errors.emailFormat` | KEEP | That email address looks incomplete. | |
| `contact.errors.msg` | KEEP | Tell us a little more: at least a sentence. | |
| `contact.errors.msgLong` | KEEP | Please keep it under 2,000 characters. We'll ask for details later. | |

### footer

| Key | Status | New text | Note |
|---|---|---|---|
| `footer.line` | KEEP | Software with gravity. | The brand tagline. |
| `footer.investors` | CHANGED | Sponsors and buyers | |
| `footer.privacy` | KEEP | Privacy | |
| `footer.rights` | KEEP | BLAKRA | Replace with the legal entity name when supplied ([OWNER] Q13). |
| `footer.join` | NEW | Engineers and designers who want to join a project: | Followed by a link to hello@blakra.us. [OWNER] Q15 |

### investors (page "Products: for sponsors and buyers", URL /investors)

| Key | Status | New text | Note |
|---|---|---|---|
| `investors.eyebrow` | CHANGED | Our products | |
| `investors.title` | CHANGED | For sponsors and buyers. | |
| `investors.lede` | CHANGED | Some of the software we build is our own. We look for sponsors to take it further, or buyers to own it outright. This page sets out what exists, what is on offer and what you can inspect first. | |
| `investors.thesisTitle` | CHANGED | Why we build our own | |
| `investors.thesis[0]` | CHANGED | We build software for clients, and products of our own. | Together the three lines are one thesis. They make no claim that products grow out of client problems (that is unconfirmed in FACTS). |
| `investors.thesis[1]` | CHANGED | Our products are built by the same principals, to the same standards, at our own cost and risk. | |
| `investors.thesis[2]` | CHANGED | A sponsor or a buyer starts from software that exists, and can inspect it before agreeing to anything. | |
| `investors.productsTitle` | CHANGED | The products | The table shows the skin AI (name, `items.skin.line`, `stage.working`) and then `products.more`. |
| `investors.askTitle` | CHANGED | What is on offer | [OWNER] Q7 |
| `investors.ask` | CHANGED | Sponsorship of a product's next stage, a license to use it, or an outright sale with the source code and IP. | [OWNER] Q7 |
| `investors.ndaTitle` | NEW | What you receive under NDA | A heading between `ask` and `deck`. |
| `investors.deck` | CHANGED | A live demo, a walkthrough of the architecture and a review of the code, with the engineers who wrote it. | Now lists the NDA package, not a deck. [OWNER] Q8 |
| `investors.cta` | CHANGED | Talk to the founder | Links to ?intent=invest#contact. |
| `investors.note` | CHANGED | Or write to the founder, Hamid Reza Alizadeh (Ashen): | Followed by hello@blakra.us. |
| `investors.disclaimer` | CHANGED | This page describes products offered for sponsorship, license or sale. It is not an offer to sell, or a solicitation of an offer to buy, any securities. | Kept because sponsorship could be read as investment. The legal sentence is unchanged. |

### privacy

Only what was wrong or vague has changed. The form endpoint (server/contact.gs) also records the time, the page language and the page the form was sent from, and saves each enquiry to a Google Sheet. The current text left both out.

| Key | Status | New text | Note |
|---|---|---|---|
| `privacy.eyebrow` | KEEP | Privacy | |
| `privacy.title` | KEEP | What happens to what you send us. | |
| `privacy.updated` | CHANGED | Last updated 27 October 2026. | Set this to the ship date. |
| `privacy.sections` "Who we are" | NEW (first) | This site is run by [legal entity name], [jurisdiction], registration [number]. It is responsible for the details you send. | [OWNER] Q13. Required before launch: it identifies who controls the data. |
| `privacy.sections[0]` What we collect | CHANGED | What you type into the contact form (why you are writing, a name or company, an email address and your message), plus the time you sent it, the page you sent it from and the page's language. This site sets no advertising or analytics cookies, and its fonts and files are served from our own server. | The correction: "Only what you type" was not accurate. |
| `privacy.sections[1]` Why | CHANGED | To reply to you and, if you ask us to, to discuss a project, a partnership, or sponsoring or buying one of our products. We don't sell your details or add you to a mailing list. | "an investment" removed. |
| `privacy.sections[2]` Where it goes | CHANGED | The form is delivered through Google Apps Script to our company inbox and to a Google Sheet that holds our record of enquiries. Both are hosted by Google. | Names the Sheet. |
| `privacy.sections[3]` How long | CHANGED | We keep an enquiry for up to 12 months after our last exchange, then delete it. If it leads to a contract, it is kept with that contract's records. | [OWNER] Q14. Replaces the vague "as long as we need it". |
| `privacy.sections[4]` In your browser | KEEP | If you switch motion off, that choice is saved in your browser's local storage. It never leaves your device. | Checked: motion is the only thing stored. |
| `privacy.sections[5]` Your choices | CHANGED | You can ask us at any time what we hold about you, and ask us to correct or delete it. | Adds correction. |
| `privacy.questions` | KEEP | Questions: | Followed by the email address. |

### notFound (404)

| Key | Status | New text | Note |
|---|---|---|---|
| `notFound.eyebrow` | KEEP | 404 | |
| `notFound.title` | KEEP | This page fell past the horizon. | The brief allows the metaphor on the 404 page. |
| `notFound.text` | KEEP | It doesn't exist, or it has moved. | |
| `notFound.back` | KEEP | Back to the start | |

---

## 3. Pulse options

Display order is the order below, in a two-column grid of eight buttons, four rows as now. Layers are listed from the foundation up (cloud, data, automation, design, apps, growth, ai). The proof link text is built as it is now: "{sector}: {outcome value} {outcome label}".

| NeedId | Label (the client's voice; it also starts the message) | Tag | Layers it lights | Proof case |
|---|---|---|---|---|
| `panel` | An admin panel to run our operations. | Admin panel | cloud, data, design, apps | h17 manufacturing (live operations dashboard) |
| `shop` | An online shop, or a shopping app. | Online shop | cloud, data, automation, design, apps, growth | none: fallback "For clients under NDA: see Also delivered." |
| `assistant` | An AI assistant that knows our business. | AI assistant | cloud, data, automation, apps, ai | h22 e-commerce |
| `aidata` | AI that works on our own data, sensitive data included. | AI on your data | cloud, data, automation, ai | h13 insurance (documents read automatically) |
| `app` | A mobile app for our customers or our team. | Mobile app | cloud, data, design, apps | h09 logistics (driver app) |
| `warehouse` | A warehouse, inventory or database system. | Warehouse and data | cloud, data, automation, apps | h06 retail |
| `bots` | Bots that take the repetitive work off our team. | Bots and automation | cloud, data, automation | h22 e-commerce (the assistant handles the routine questions) |
| `all` | A complete system, from the ground up. | All seven layers | all seven | none: shows `verdictAll` |

Verdict for each option except `all`: "One team builds it, from the foundation up." For `all`: "All seven layers, one team, one named lead."

For each option, the linked card's "Layers" chips include the top layer the option lights, so the lit column and the card agree.

---

## 4. Structural changes for the lead

**Hero**
1. The H1 keeps its `{ before, human, after }` structure with the new text. Check that the italic line does not wrap at 900–1024px.
2. NEW: add a fact strip (`prologue.facts`) under the actions.
3. The second "also" link now reads "Sponsor or buy a product". Point it at /investors rather than the form, so a buyer lands on the product page first.

**Pulse**
4. REMOVED: the margin note element (`pulse.note`).
5. Options are keyed by a new `NeedId` (`panel`, `shop`, `assistant`, `aidata`, `app`, `warehouse`, `bots`) instead of `LayerId`. The `pulse.needs` type becomes `Record<NeedId, { label: string; tag: string }>`. In shared.ts, `needs` is rekeyed to `NeedId` (layers and proof as in section 3), and the `asked` order becomes the table order.
6. Each tag's color is the color of the highest layer that option lights. The `all` option's tag comes from the NEW `pulse.allTag`, not `engine.title`.
7. The verdict no longer interpolates `{n}`: remove the `replace()`.
8. When an option has no proof case, the fallback (`pulse.everyProject`) links to #delivered.
9. `PulseChoice` becomes `NeedId | 'all' | null`. The contact prefill uses `needs[choice].label`. Engine `focus` ("Your project") marks the top layer of the chosen need.

**Proof**
10. NEW: an "Also delivered" list (#delivered) under the five cards: title, note and seven rows, with no visuals and no numbers.

**Seven layers**
11. REMOVED: the chakra-name column (`engine.chakras`). The colors stay.

**How we work**
12. `process.terms` grows from four items to five (the type becomes a five-tuple), and the terms row wraps.

**Products (home)**
13. REMOVED: the roadmap block (`roadmapTitle`, `roadmap`).
14. REMOVED: the four placeholder products, their `ProductPreview` visuals and the `kin` field. `ProductId` becomes `'skin'` and `StageId` becomes `'working'`.
15. Product card facts: remove "Shares engine parts with", add an "On offer" row, and hide "Platforms" while it is empty.
16. NEW: a plain card or line next to the skin AI card for `products.more`. Lay out one product card plus this card; do not show four empty slots.
17. The skin AI card needs a neutral visual: an abstract glyph, not an invented app screenshot. Set `draft: false` so structured data lists it under `makesOffer`.

**Investors page**
18. REMOVED: the Flywheel, whose Work → Engine → Products labels carry the dropped engine claim. Render the three thesis lines as a short list.
19. REMOVED: the roadmap section on the page. The products table shows the skin AI and then `products.more`.
20. The "round" block becomes "What is on offer" (`askTitle`, `ask`), followed by the NEW `investors.ndaTitle` heading, then `deck`, then the actions.

**Contact**
21. Door ids stay `commission`, `partner` and `invest`; only the labels change. contact.gs needs no change.

**Footer and privacy**
22. NEW: a footer line `footer.join` with a mailto link.
23. NEW: a privacy section "Who we are", placed first. Set `privacy.updated` to the ship date.

**Records and translations**
24. Update FACTS.md: remove the placeholder rows (products, roadmap, round, deck, bench, engine positioning). Add rows for the Also delivered list (owner, 2026-10-27), the skin AI description, the team model, the name's origin, the NDA term and the privacy corrections.
25. de, fr and es must follow every key change. The type checks will flag removed and added keys.

---

## 5. Questions for the owner (each with the recommended default)

1. **Support after launch.** Do you monitor, fix and improve systems after launch, and are the five case-study systems still supported by you? *Default:* yes, by agreement, so "design, build and run", "Run it with you" and the written support agreement stay. If not, change "run" to "launch" in the hero lede, `meta.homeDescription` and step 3.
2. **Engagement shapes.** Is it "a fixed-scope first project, then further work and support by agreement"? Do you also place engineers inside a client's team? *Default:* the fixed-scope line only.
3. **Skin AI name.** *Default:* "Skin analysis AI", a descriptive name rather than an invented brand.
4. **Skin AI status.** Working product, working prototype, or in development? *Default:* "Working · open to offers". If it is a prototype, use "Working prototype · open to offers".
5. **"No third-party dependencies".** Does this mean no external libraries, or no external model APIs and services? Does it run without sending images to anyone else? *Default:* say only "Written from scratch, with no third-party dependencies". If it does run without sending images anywhere, add "It runs without sending images to outside services." That claim is the strongest edge for both audiences.
6. **Skin AI platforms and layers.** *Default:* hide Platforms; Layers: AI · Data and integrations · Web and mobile.
7. **What is on offer.** Which of sponsorship, license and outright sale with source code and IP are real options? *Default:* all three, as written.
8. **What a serious party receives under NDA.** Demo, architecture walkthrough, code review? *Default:* all three, as written. If no demo is ready, drop "Demo under NDA" from the card and the door hint.
9. **Other products.** May we say "Other products of our own are in development. We discuss them under NDA."? *Default:* yes; you said there are others.
10. **Case sources.** For each of the five cases: the year, the duration, what BLAKRA built, and how the number was measured. *Default:* the cards stay as they are; add a footer line "[year] · [duration] · built by BLAKRA" once supplied.
11. **Sixth card.** Can the AI on one organization's security-sensitive data become a full case card (sector, before, now, no client name)? *Default:* a row in Also delivered only.
12. **Also delivered detail.** May each row carry a sector (for example "for a retailer")? *Default:* rows as written, with no sector.
13. **Legal entity.** The entity's name, jurisdiction and registration number. This is needed for the footer, the privacy page, and the "United States" title, which implies a US entity. *Default:* required before launch. Until then, keep "BLAKRA" in the footer and hold the "Who we are" section.
14. **Retention.** How long are enquiries kept? *Default:* 12 months after the last exchange.
15. **Joining.** Should specialists apply through hello@blakra.us? *Default:* yes, with the footer line as written.
16. **Fact strip.** "Founded 2024 · Fully remote · Reply within 24 hours" in the hero? *Default:* yes; all three facts are confirmed.
17. **Faces.** Real photos and LinkedIn links for the three principals? *Default:* keep the drawn portraits until real photos exist; add LinkedIn links only for active profiles. Check that the company's social accounts are active before launch.
18. **Data handling.** Can we publish "Access only to what the project needs" and "Client data is never used to train models"? *Default:* not published. Add them to the terms only once you confirm.
19. **Launch and search layer.** Do you still offer SEO, content and media production? *Default:* keep it as a layer framed around launch, with no standalone claim and no pulse option of its own.

---

*Sourcing note for `engine.crownText`: Gartner's press release of 25 June 2025 gives the causes as "escalating costs, unclear business value or inadequate risk controls" (gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027, checked 2026-10-27). The new text paraphrases those causes and does not attribute anything else to Gartner.*

# Company content drafts (English, for owner review)

Revision 2, 2026-11-02: owner decisions applied (no testimonials or quotes; no budget or price range; broad industries per owner statement). Defaults for unanswered policy items are marked **[DEFAULT — owner may change]**. Market patterns behind these choices: `market.md`.

Sources: old site `https://blakra.us/` (captured 2026-11-02, see `evidence.md`, `raw/`); repo `src/content/locales/en.ts` (en), `src/content/shared.ts` (shared), `src/content/FACTS.md` (FACTS), `.firm/charter.md`. Nothing below is invented; every gap is marked **[OWNER]** and listed in `owner-questions.md`. Translations (de/fr/es) follow only after the owner approves the English.

---

## Where each piece goes (IA proposal)

| Item | Placement |
|---|---|
| 1 People | Extend the existing **People** section on the home page (add a short bio line and, when supplied, a LinkedIn link per principal). No new page. |
| 2 Trust signals | A compact "Why clients can trust a small team" strip in **How we work** (home) and in full on **/about**. No testimonials. |
| 3 Industries | A short "Industries we've delivered for" list on **/about**, with the NDA line; one-line version under **Selected client work**. |
| 4 Engagement & pricing | Extend **How we work** (home) with the "ways to engage" lines; full detail in the new **/about** page's FAQ. |
| 5 FAQ | New **FAQ block on /about** (also emitted as FAQPage structured data). |
| 6 About | New page **/about** (Story · People summary · How we engage · FAQ · Work with us), linked from the footer and the People section. |
| 7 Company LinkedIn | Footer + `company.social` + structured data `sameAs`, only once a real page exists. |
| 8 Careers | A short "Work with us" block on **/about**, replacing nothing; the footer line stays and points to it. |

**Rationale.** The home page is a directed film with one station per visitor question (charter); adding stations would lengthen it past the 12-screen budget and dilute the arc. What makes a buyer trust an unknown studio is checkable detail, not more scroll: who the people are, how a contract works, what happens to their code and data. That reference material belongs on one calm, text-first `/about` page that a procurement reader can scan and link to, while the home page only gains one line each in People, Selected client work and How we work. One new page also means one new route to prerender in four languages, not five.

---

## 1. People

> **The principals**
>
> **Hamid Reza Alizadeh (Ashen)** — Founder and Chief Technology Officer
> Leads AI strategy and systems architecture, from the first diagram to production, and works on full-stack engineering and product delivery. Ask him whether AI belongs in your process at all.
>
> **Mehdi Jannatipour** — Senior Full-Stack Engineer and Backend Lead
> Owns the foundation of each system: backends, data platforms and reliability. Ask him about data you can trust and systems that stay up.
>
> **Habiburahman Karokhi** — Head of Operations and Corporate Compliance
> Runs corporate governance, compliance and vendor management, so the business side runs as cleanly as the code. Ask him about contracts, NDAs and data protection.
>
> The three principals lead each project. Specialists join the projects they fit, under our lead and our contract. The whole team works remotely.

Source: names — shared `people`; titles and "owns"/"ask" lines — en `people.roles`; "full-stack engineering, product delivery" and "vendor management" — old site Leadership (evidence.md); last paragraph — en `people.bench`. Old-site years of experience deliberately dropped (FACTS).
LinkedIn: none found on the old site for any principal. No LinkedIn links **[DEFAULT — owner may change]** (none exist on record). **[OWNER]** photos (optional).

## 2. Trust signals (replaces testimonials)

Owner decision 2026-11-02: no testimonials or quotes. The old site's two anonymous quotes and its stat tiles are not used anywhere.

> **Why a small team is a safe choice**
>
> - **You deal with the people who build.** Three named principals lead each project from the first call to production. No account managers, no hand-offs.
> - **Exact before expensive.** The first conversation and the technical assessment are free. If we are not the right fit, we tell you.
> - **A fixed scope and a fixed price** for the first system, with an agreed bar for done.
> - **You see progress by using it:** working software every two weeks.
> - **What we build is yours.** You own the code and the data. Standard, documented tools, no lock-in.
> - **Confidential from the first message.** An NDA before you share details; client names stay confidential under our contracts.
> - **We stay after launch** under a written support agreement.
> - **We answer:** a reply within 24 hours from an engineer who would build it.
> - **We build our own products too,** to the same standard. LIOXSA is working; a demo is available under NDA.

Source: en `people`, `process.steps`, `process.terms`, `contact.lede`, `products`; FACTS lines on NDA, ownership, support, 24 h; old site "If it's not the right fit, we'll tell you." (evidence.md). Pattern: market.md (Pentagram principals-as-contact, published terms, own products).

## 3. Industries we've delivered for

> **Industries we've delivered for**
>
> Retail and e-commerce · Finance and fintech · Logistics and transport · Manufacturing · Education · Healthcare and wellness · Real estate · Hospitality · Professional services · Media · Public sector and non-profit · Energy · AI companies and products · Robotics
>
> Most of our work is under NDA; we describe it in a call, not on the page.

**[OWNER TO CONFIRM — remove any you haven't delivered for]** Source: owner statement 2026-11-02 (many more delivered projects than shown, most under NDA). Shown client work supports retail, finance (consumer money app), logistics, manufacturing and education (en `work.projects`); the rest rest on the owner statement only. "AI companies and products" and "Robotics" added by the owner (owner statement 2026-11-02); these two are owner-confirmed, the other unshown sectors still need confirming. (The old site listed robotics as a capability, not a delivered industry; evidence.md.) LIOXSA supports "wellness" as an own product, not client work. No client names, no counts.
Short form for Selected client work: "Retail, finance, logistics, manufacturing, education and more. Most of our work is under NDA."

## 4. How we engage, and pricing

> **How an engagement works**
>
> - **It starts free.** The first conversation and a technical assessment cost nothing. If we are not the right fit, we say so.
> - **One fixed-scope project first.** A fixed scope, a fixed price and an agreed bar for done for the first system.
> - **Working software every two weeks**, so you judge progress by using it.
> - **Then we run it with you.** After launch we monitor, fix and improve the system under a written support agreement; further work by agreement.
> - **Terms that protect you.** You own the code and the data. Standard, documented tools, no lock-in. A named engineer, never a ticket queue. An NDA before you share details.
> - **Partners.** If you build, sell or integrate, we can be the engineering team behind you.
>
> **Pricing.** Every project is quoted as a fixed price after the free assessment, once the scope is exact.

Source: en `process.steps`, `process.terms`, `process.shapes`, `contact.doors.partner`; old site "If it's not the right fit, we'll tell you." and "Fixed-price contracts" / "Source code ownership" (evidence.md); FACTS lines 30–33, 43–44.
Not reused: old-site "Team Extension" and "Product Squad" models, "Milestone-based payments", "SLAs with penalty terms" **[DEFAULT — owner may change]**.
No budget, minimum or range is shown (owner decision 2026-11-02). **[OWNER]** payment schedule and support-agreement terms are not published; they are set in each contract.

## 5. FAQ

**Who owns the code and the data?** You do. We use standard, documented tools, so there is no lock-in. *(en `process.terms`)*

**Will you sign an NDA?** Yes, before you share details. Client names and projects stay confidential under our contracts. *(en, FACTS)*

**How does a project start?** Tell us what you need built. Within 24 hours an engineer who would build it replies with a first read: what it involves, the risks we see and a sensible first step. The first conversation and the technical assessment are free. If we are not the right fit, we say so. *(en `contact.lede`, `process.steps`; old site)*

**How do you work once we agree?** A fixed scope, a fixed price and an agreed bar for done for the first system, with working software every two weeks so you judge progress by using it. *(en `process.steps`)*

**Who will we work with?** The three principals lead each project, and you have a named engineer, never a ticket queue. Specialists join under our lead and our contract. *(en `people`, `process.terms`)*

**You're remote. How do we stay in step?** The whole team works remotely. We agree a daily overlap with your working hours at kickoff, and keep to it. **[DEFAULT — owner may change]** *(en `people.bench`)*

**Which language do you work in?** Projects run in English unless we agree otherwise. Our site is also in German, French and Spanish. **[DEFAULT — owner may change]**

**How do you handle our data?** You own your code and data, and we sign an NDA before you share anything. We build on standard, documented tools, and AI can run on your own data, sensitive data included. We hold no security certifications and do not claim any. **[DEFAULT — owner may change]** *(en `process.terms`, `pulse.needs.aidata`)* — the last sentence may be omitted; it must never be replaced by an uncertified claim.

**What happens after launch?** We monitor, fix and improve the system with your team, under a written support agreement. Further work by agreement. *(en, FACTS)*

**What is not a fit?** Brochure websites, or software with no process behind it. *(en `process.notFit`)*

## 6. About page

> **About BLAKRA**
>
> BLAKRA is a software company founded in 2024. We design, build and run what organizations run on: operations and inventory systems, admin panels and online shops, web and mobile apps, bots, and AI that works on your own data.
>
> **The name.** BLAKRA joins *black hole* and *chakra*. A black hole is the strongest pull there is; the seven chakras are centres on one axis, from root to crown. We build the same way: seven layers on one axis, from cloud and backend at the root to AI at the crown, each one resting on the layer beneath it. Software with gravity.
>
> **Why one team.** A product is only as strong as its weakest hand-off. Design from one agency, the app from another, the backend from a freelancer, the AI from a consultant: each hand-off loses something. With us it is one contract and one team, led by the same three principals.
>
> **How we're built.** Three principals lead each project, from the first scope to production. Specialists join the projects they fit, under our lead and our contract, so the team grows or shrinks with the work. Everyone works remotely. The people you meet are the people who build.
>
> **Our own products.** Alongside client work we build software of our own, with the same principals and the same standards. The first, LIOXSA, is working and open to a sponsor or a buyer.
>
> BLAKRA LLC · 901 H St Ste 120, Sacramento, CA 95814-1817, USA · hello@blakra.us

Source: founded 2024 — shared/FACTS; name — en `engine.symbol`, FACTS ("BLAKRA = black hole + chakra"); remote, principals — en `people`; one team — en `pulse`; products — en `products`, shared `products`; entity/address — shared `company`. "Strongest pull there is" is descriptive of black holes, not a company claim. Not used: the old origin story's figures; its motive line ("most software firms either write elegant code that never ships, or ship quickly with quality as an afterthought") is available if the owner wants it — **[OWNER]**.
**[OWNER]** any origin detail (why Ashen started it; first project), whether to show the street address on /about.

## 7. Company LinkedIn

None. No LinkedIn links, company or personal, at launch **[DEFAULT — owner may change]**. The old site's `linkedin.com/company/blakra` does not exist (FACTS). Add to `company.social` only once a real page exists.

## 8. Careers / work with us

The old site had no careers or join section (`/careers` → 404; no link). Draft from en `footer.join`:

> **Work with us**
> We bring in engineers and designers for the projects they fit, under our lead and our contract, fully remote. If that's you, write to hello@blakra.us with what you build and a link to work you can show.

Source: en `footer.join`, `people.bench`; email shared `company.email`. Careers via hello@blakra.us **[DEFAULT — owner may change]**. Pattern: market.md (thoughtbot states openings honestly; 10up puts Apply beside Hire us). No open-roles list is implied.

---

## 9. New home section: AI

**Placement: right after the seven layers (Capabilities).** The seven layers end at the crown with "AI sits on top. It works only when the layers beneath it hold." The AI section picks up from that line and shows what the crown holds, so the page moves from the foundation up to AI in one movement. If it came after Selected client work, the reader would leave proof and go back to capabilities, and the links to Helya, Nuvoq and Flowline would point backwards. Nav: add "AI" between Capabilities and Products. Budget note: the charter caps the home page at 12 screens at 1440×900, so this section should take about one screen (headline, a 3×2 grid, the split, one principle line). It could replace some of the AI copy in the seven-layers crown rather than add to it.

> **Eyebrow:** AI
>
> **Headline:** Any AI tool your work needs, built to run on your terms.
>
> **Lede:** We design and build AI systems end to end, from the data they read to the screen people use. We build on open-source models we host ourselves, on your own servers when the data is sensitive, or on the commercial platforms when speed matters most. You get a tool that does real work, inside your process, on your data.
>
> **What we build**
>
> 1. **Assistants and agents that act.** Assistants that read, answer and act inside the tools your team already uses, with a person one step away. → *Flowline*
> 2. **Answers from your own documents.** Retrieval over your documents, with the source of every answer cited and access that follows each reader's permissions. → *Helya*
> 3. **Document reading and extraction.** OCR and extraction that turns forms, invoices and scans into structured data your systems can use.
> 4. **Vision and inspection.** Models that look at images and video, from defects on a production line to skin analysis from a single photo. → *Nuvoq*, *LIOXSA*
> 5. **Automation with language models.** Workflows where a model sorts, drafts and routes the work, and people approve what matters. → *Flowline*
> 6. **Evaluation, guardrails and cost control.** Every system is tested against your own cases before launch, kept within limits you set, and run at a cost you can predict.
>
> **Two ways to build**
>
> | Open-source models | Commercial platforms |
> |---|---|
> | Llama, Mistral, Qwen, Whisper and others, hosted by us or on your own servers. Your data never leaves your infrastructure. Fine-tuned on your data when that is what the task needs. | OpenAI, Anthropic Claude, Google Gemini, and the AI services of Azure, AWS and Google Cloud. The fastest route to production. |
>
> We pick per project, and build so you can switch later without a rewrite.
>
> **Principle:** Scope the problem first. Build on data you can trust. Keep a person one step away.
>
> **CTA:** Tell us what the AI should do →  (opens Contact with the "AI on your data" need selected)

**Sources**
- "Can build any AI tool", open-source or commercial platforms, self-hosted including on the client's own servers for sensitive data: owner statement, 2026-11-02, via the coordinator.
- "read, answer and act inside your work, on your own data, with a person one step away": en `engine.layers.ai`.
- "Sensitive data included": en `pulse.needs.aidata`.
- LLMs, retrieval, OCR, evaluation: shared `layerTech.ai`.
- Cited answers and permission-based access: en `work.projects.helya-ai`.
- Detection boxes and defect classes: en `work.projects.nuvoq-vision`.
- Approvals with owners: en `work.projects.flowline-automation`.
- LIOXSA, and "images are never sent to outside services": en and shared `products`.
- "Scope first": en `process`.
- "Data you can trust": en `people.roles[1]`.
- Model and vendor names are tools we work with, not partnerships. No partner badges, client names, figures or certifications.

**Notes and caveats**
- **Flowline:** its en copy describes approvals and conditions but does not mention a language model. Before it is linked from blocks 1 and 5, the owner must confirm that Flowline uses one. If not, link only Helya from block 1 and drop the block 5 link.
- **Block 3:** OCR is in shared `layerTech.ai`, but no current project shows it. Leave the block without a link.
- **Block 4:** LIOXSA is the owner's own product, not client work, so label its link "Our product".
- **Block 6:** "Cost you can predict" and "limits you set" are commitments about how we build, not measured results. **[OWNER]** confirm that wording.
- **Model list:** **[OWNER]** confirm the team has hands-on work with each named model and platform. Drop any it does not.
- **Translation:** de/fr/es after approval, as before.

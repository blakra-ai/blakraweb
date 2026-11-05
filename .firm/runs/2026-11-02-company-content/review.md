# Editorial review, 2026-11-02

The bar: every sentence is concrete, can be checked, and answers a question a buyer has. Each entry gives the block, a one-line critique, then the rewrite. The full final text is in `draft.md`. The pre-edit draft is kept at `raw/draft-rev2-before-edit.md`.

## draft.md

| Block | Critique | Rewrite (final) |
|---|---|---|
| AI headline: "Any AI tool your work needs, built to run on your terms." | "Any" is a claim nobody can check. "Built to run" repeats the site's tagline. | "AI that does real work, on your data, on your terms." |
| AI lede (3 sentences) | "You get a tool that does real work, inside your process" restates the headline. | Four short sentences: we build end to end; open-source models run on our servers or yours, so sensitive data never leaves; platforms are the faster route to production; we choose per project. |
| AI block "Automation with language models" | Overlaps with Agents; both describe a model taking a step in a workflow. | Merged into "Agents that act". |
| AI block "Evaluation… cost you can predict" | "Predict" is a promise with no mechanism behind it. | "costs we track from the first run". |
| AI "Two ways to build" heading + "We pick per project" | Duplicates the choice already stated in the lede. | The split table stays, followed by one line: "Built so you can change models later without a rewrite." |
| AI principle line | Repeats the crown caption and How we work. | Cut. |
| AI Flowline links | The source copy names no language model, so the link cannot be checked. | Removed until the owner confirms. |
| People "Ask him about…" lines | Clever but adds no information, and the home page already has them. | One line per person: their role and what they own. |
| People closing paragraph | Duplicates `people.bench`. | Cut (it stays in About). |
| Trust: "You deal with the people who build. No account managers, no hand-offs." | "No hand-offs" duplicates the Pulse section. | "The principals you meet lead the build." |
| Trust: "We answer: a reply within 24 hours" | The fourth time the site says 24 hours. | Cut (kept in Contact, hero and FAQ). |
| Trust: "We build our own products too" | Not a protection for the buyer. | Cut. |
| Trust heading "Why a small team is a safe choice" | Defensive; it raises the doubt it tries to answer. | "How we protect you". |
| Industries: 14 sectors, "Finance and fintech", "Logistics and transport" | Paired labels pad the list. | Single words where possible. The home page gets a three-sector short form. |
| Engagement "It starts free… Terms that protect you…" | Repeats the trust terms. | Four lines on the mechanics: first project, every two weeks, after launch, partners. |
| Engagement "Pricing… quoted as a fixed price" | Already said in "One project first". | Merged. |
| FAQ "How do you work once we agree?" | Duplicates How we engage. | Cut. |
| FAQ data answer (long, with certifications inside) | Mixes two questions. | Split into "Can sensitive data stay on our servers?" and "Do you hold security certifications?" (the certifications line now appears only in the FAQ). |
| FAQ "You're remote. How do we stay in step?" | Wordy. | "We're in a different time zone." + one-sentence commitment. |
| About "strongest pull there is" | Decoration. | Cut. |
| About "Why one team" paragraph | The home Pulse section already makes this case. | Cut. |
| About "We design, build and run what organizations run on…" | Repeats the hero lede word for word. | Cut. |
| About address line | Already on the Legal notice. | Cut. |
| Careers "a link to work you can show" | Fine; tightened. | "with what you build and work you can show". |
| IA rationale paragraph | Too long. | Three sentences. |

## Weak lines in the current site copy (src/content/locales/en.ts; read-only, not edited)

| Key | Line | Critique | Suggested rewrite |
|---|---|---|---|
| `prologue.title` | "We build what organizations run on." | Abstract; a reader cannot tell what is built. Acceptable as a tagline, weak as an H1. | Keep only if the lede below it stays concrete (it does). |
| `prologue.lede` | 40-word list sentence | Too long for a hero; it reads as a list of services. | "Operations systems, apps, bots and AI on your own data. Designed, built and run by three principals, from first scope to production." |
| `pulse.title` | "A product is only as strong as its weakest hand-off." | Good. | Keep. |
| `pulse.body` | "…each vendor points at the next." + "answering for all of it" | Strong but long; the last sentence duplicates "one team". | Cut the final clause after "one team". |
| `pulse.verdict` / `verdictAll` | "One team builds it, from the foundation up." | Filler; the section already says it. | Cut or merge into `takes`. |
| `work.lede` | "One screen per project here; open one for…" | Describes the user interface instead of the work. | "Apps, operations platforms and AI tools, each owned by the client it was built for." |
| `engine.lede` | "Many organizations hire a separate vendor for each of these." | Repeats Pulse. | "We cover all seven and build them in order, because each depends on the one beneath it." |
| `engine.layers.cloud` | "engineered to carry real load" | Vague and unverifiable. | "APIs, servers, cloud and security, monitored from day one." |
| `engine.layers.design` | "so each screen fits the people who use it" | States the obvious. | "Research, UX and interface design, tested with the people who will use it." Confirm user testing happens. |
| `process.lede` | "Software runs over budget when the spending starts before the problem is exact." | Good. | Keep. |
| `process.steps[2]` | "Launch is where real use begins." | Filler. | Cut; start with "We monitor, fix and improve it…". |
| `process.terms` "A reply within 24 hours." | Fourth repetition of 24 hours on the page (hero, contact lede, success message). | Cut it here. |
| `products.lede` | "with the same principals and the same standards" | "Same standards" is unverifiable filler. | "Alongside client work, the same principals build products of our own. Each is open to a sponsor or a buyer." |
| `people.title` | "The people you meet are the people who build." | Strong. | Keep. |
| `people.lede` | "Nothing stands between you and the engineers." | Duplicates the title. | Cut; keep the second sentence. |
| `people.roles[*].ask` | "Ask about: …" | Cute; adds little. | Optional cut. |
| `contact.lede` "No sales deck, no mailing list." | Fine; buyers value it. | Keep. |
| `contact.horizon` | "Read by an engineer, not a sales team." | Repeats the lede. | Cut. |
| `investors.thesis[1]` | "to the same standards, at our own cost and risk" | "Same standards" again. | "Built by the same principals, at our own cost and risk." |
| `navigator.lines.hero` | "Each stage of this page answers one question about your project." | Talks about the page, not the buyer's problem. | Cut, or say what the next section answers. |

## Revision 4 (owner additions, 2026-11-02)

| Block | Critique | Rewrite (final) |
|---|---|---|
| AI capabilities | Training and ML were missing, although the owner does them. | New block, "Training and machine learning": data preparation and labelling, training and fine-tuning, classic predictive models, deployment and monitoring. |
| AI open-source column "Fine-tuned when the task needs it" | Too narrow now. | "Trained or fine-tuned on your data when the task needs it." |
| People bench (en `people.bench`: "Specialists join the projects they fit… the team grows or shrinks with the work") | Sounds like a small firm apologising; does not say who is accountable. | "A senior core, the right specialists for each project." Three principals lead; specialists from a network we have vetted, managed under our contract and our lead; one contract, one accountable lead, one finished product. No headcount. |
| About team paragraph | Same weakness. | "BLAKRA is a senior core with a vetted network of specialists…", ending with "one company and one accountable lead." |
| FAQ "Who will we work with?" | "Specialists join" is passive and vague. | "The specialists the project needs work under our contract and our lead." |
| Careers line | Did not say what the network is. | "We bring in engineers, designers and AI specialists for each project, remotely and under our contract." |

Note: "vetted" asserts that specialists are screened. The owner's statement that the principals recruit the right specialists supports it.

## Revision 5: buyer-psychology pass
Every negative or defensive line in draft.md was reframed as what we do. The en.ts suggestions above that contained negations ("No lock-in", "never a ticket queue", "Not a fit", "Nothing stands between", "not a sales team", "No sales deck") are superseded by the table in `psych.md`. Legal disclaimers (LIOXSA cosmetic notice, investors securities notice) are kept as they are.

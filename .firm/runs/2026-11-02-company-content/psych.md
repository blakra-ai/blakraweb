# Buyer-psychology pass, 2026-11-02

Rules from the owner: state what we do, firmly; no negations about ourselves, no hedges, no defensive lines; limits only when a buyer must know them, and then phrased positively. Everything stays true: no new facts except where marked [CONFIRM]. The Legal notice, the Privacy page and legally required disclaimers are out of scope.

Levers used:
- **Certainty:** concrete commitments.
- **Authority:** named principals; one accountable lead.
- **Reassurance:** what the client keeps.
- **Loss aversion in the client's favour:** what they keep and what they will not lose: ownership, control, confidentiality.

## draft.md

| Block | Before | After | Why (psychology) |
|---|---|---|---|
| AI lede | "so sensitive data never leaves." | "so sensitive data stays inside your walls." | A picture of safety instead of a negation; "your walls" stresses ownership. |
| AI lede | "Commercial platforms are the faster route to production. We choose per project." | "Commercial platforms take you to production fastest. We choose the right one for each project." | Active voice gives certainty; "the right one" signals judgement, which builds authority. |
| AI closer | "Built so you can change models later without a rewrite." | "Your system stays open to new models: you can change the model later and keep everything built around it." | Loss aversion in the client's favour: the client keeps the investment. The word "rewrite" made the reader picture the loss. |
| Trust heading | "How we protect you" | "What you can count on" | "Protect" implies a threat; "count on" signals certainty. |
| Trust: assessment | "If we are not the right fit, we say so." | "…you leave them knowing plainly what the work will take." | Turns a rejection scenario into a guaranteed gain (clarity) from the free step. |
| Trust: delivery | "Working software every two weeks." | "Working software in your hands every two weeks." | Makes it tangible: the client holds the progress. |
| Trust: ownership | "Standard, documented tools." | "…built on standard, documented tools." | Folded into ownership: one strong promise instead of two fragments. |
| Trust: NDA | "NDA before you share details. Client names stay confidential." | "An NDA in place before you share details, and your name kept confidential." | "Your name" makes it personal. |
| Trust: support | "A written support agreement after launch." | "…that keeps the system running after launch." | States the benefit, not just the paperwork. |
| Industries | "We describe it in a call, not on the page." | "…confidential under NDA. We walk you through what's relevant to your project on a call." | Discretion framed as a service (the client will be protected the same way). It also invites a call. |
| FAQ ownership | "so another team can take over." | "from day one… so it stays fully yours to run and extend." | The old line made the reader picture leaving; the new one is about control. |
| FAQ NDA | "Yes, before you share details." | "Yes, as the first step, before you share any details." | Order of steps gives certainty. |
| FAQ time zones | Q: "We're in a different time zone." | Q: "How do you work across time zones?" A: "At kickoff we fix a daily overlap…, and we keep it for the whole project." | A neutral question instead of a framed objection; "fix" and "keep it" are firm commitments. |
| FAQ language | "English, unless we agree otherwise." | "English, or another language agreed at kickoff." | An option instead of an exception. |
| FAQ security | Two questions, incl. "Do you hold security certifications? No." | One question, "How do you protect our data?": NDA first; your code and data stay yours; access limited to the people who need it; your own infrastructure for sensitive data. | Removes a self-inflicted "No" and answers with practice. **[CONFIRM]** the access line, which is the owner's example and not yet in a source. If not confirmed, drop that sentence. Buyers who need certifications will ask, and the answer then is a plain fact given in conversation. |
| FAQ after launch | "We run it with you…" | "We monitor, fix and improve the system with your team…" | Concrete verbs signal certainty (en `process.steps`). |
| FAQ fit | "What isn't a fit? Brochure websites…" | "What kind of work do you take on? Software that runs a real process… For brochure websites, a web designer is the better choice." | Leads with what we do. The single limit becomes helpful advice, which builds authority. |
| FAQ start | "the risks and a first step" | "the risks we see and a clear first step" | "Clear" adds certainty. |
| Engagement | "One project first." | "A clear first project… so you know the cost and the result before work starts." | Removes the feeling of a trial and names the payoff (certainty about cost and result). |
| People and About | "Specialists join the projects they fit… grows or shrinks" (earlier draft) | "A senior core, the right specialists for each project… one contract, one accountable lead, one finished product." (revision 4, kept) | Expertise matched to each part is presented as a strength, with a single point of accountability. Employment status is never mentioned. |

Checked: no "don't", "never", "not", "try", "aim", "usually" or "where possible" remains in the client-facing text of draft.md. The internal notes (Source lines, [DEFAULT], [CONFIRM]) are not client copy.

## Current site copy (src/content/locales/en.ts), suggestions only; another engineer owns src/

These replace the corresponding rows in review.md.

| Key | Before | After | Why |
|---|---|---|---|
| `process.terms[1]` | "Standard, documented tools. No lock-in." | "Standard, documented tools, so the system stays yours to run and extend." | Gives the outcome instead of naming the fear. |
| `process.terms[2]` | "A named engineer, never a ticket queue." | "A named engineer who knows your system." | A positive picture of the relationship. |
| `process.notFit` | "Not a fit: brochure websites, or software with no process behind it." | "Best fit: software that runs a real process, from operations to AI." | A positive filter; the buyer sees themselves in it. |
| `process.steps[2]` | "Launch is where real use begins. We monitor…" | "After launch, we monitor, fix and improve it with your team, under a written support agreement." | Cuts filler and leads with the action. |
| `people.lede` | "Nothing stands between you and the engineers." | "The principals who scope your project lead it from the first call to production." | A direct statement of authority. |
| `people.bench` | "Specialists join the projects they fit… the team grows or shrinks with the work." | "Three principals lead every project and bring in the right specialist for each part, under one contract and one accountable lead." | "Shrinks" suggests fragility; the new line is about expertise and accountability. |
| `pulse.body` (end) | "…each vendor points at the next. With us it is one contract and one team…" | Keep the problem, end on "one contract, one team, one accountable lead." | It is the competitors' weakness, not ours, so it is useful contrast. End on the certainty. |
| `contact.lede` | "No sales deck, no mailing list." | "Straight to the engineering: a first read of your project, from the people who would build it." | Promises what the buyer gets instead of listing what they are spared. |
| `contact.failure` | "That didn't go through…" | Keep. | Functional error message; clarity wins over spin. |
| `products.items.skin.line` | "Cosmetic guidance, not a medical diagnosis." | Keep. | A required disclaimer; it protects the company. |
| `investors.disclaimer` | Securities disclaimer | Keep. | Legal; out of scope. |
| `products.lede` | "with the same principals and the same standards" | "The same principals who lead client work build products of our own. Each is open to a sponsor or a buyer." | Removes an unverifiable filler phrase. |
| `engine.layers.cloud` | "engineered to carry real load" | "APIs, servers, cloud and security, monitored from day one." | A concrete, checkable claim. |
| `contact.horizon` | "Read by an engineer, not a sales team." | "Read by the engineer who would build it." | Same promise, stated positively. |

## Positioning pass (revision 6): an established, growing firm

Rule: present BLAKRA as a mid-sized, growing firm in institutional language, with no headcount, offices or invented heads of practice. **[CONFIRM]** the five practices (Engineering, Product Design, Data & AI, Cloud & DevOps, Delivery) and QA and documentation as standard. These come from the owner's brief, not yet from a repo source.

### draft.md

| Block | Before | After | Why |
|---|---|---|---|
| People heading | "A senior core, the right specialists for each project." | "Our leadership, our teams." | Institutional, not a founding trio. |
| People body | "Three principals lead every project. For each one, we bring in the specialists it needs from a network we have vetted…" | "Our leadership team stays hands-on in every project. Delivery runs through five practices: Engineering, Product Design, Data & AI, Cloud & DevOps and Delivery. Each project is staffed from our specialist network with the right expert for each part. You have one contract, a named account lead, and one team accountable for the finished product." | Practices signal structure and depth; "staffed" is how an established firm talks; the account lead gives a buyer a named point of authority. |
| Trust terms | "The principals you meet lead the build." | "Our leadership team stays hands-on from scope to production." + "A named account lead…" + "QA and documentation as standard parts of every delivery." | Standard process signals maturity and lowers the buyer's perceived risk. |
| Engagement | "Every two weeks, working software you can use." | "A defined delivery process: scope, design, build, QA, launch. Working software every two weeks, documented as it is built." | Naming a process reads as institutional. |
| FAQ "Who will we work with?" | "The three principals lead your project, and a named engineer…" | "A named account lead, a team staffed from our practices for your project, and our leadership team, hands-on throughout. Everyone works under one BLAKRA contract." | A three-layer structure (lead, team, leadership) reads as a firm. |
| About | "BLAKRA is a senior core with a vetted network of specialists. Three principals scope and lead…" | "BLAKRA is a software company organised in five practices… Our leadership team scopes and leads every project, and staffs it from a growing network of specialists… One contract and one accountable team carry it from the first scope to the finished product and its support after launch." | Organisation first, with growth stated as a fact. No size claim. |
| About products | "We also build products of our own; LIOXSA is the first." | "Alongside client work across a growing range of industries, we build products of our own; LIOXSA is the first." | Two signals of growth (more industries, own products) without numbers. |
| Work with us | "We bring in engineers, designers and AI specialists for each project…" | "We're hiring specialists. Our network is growing across engineering, product design, data and AI, and cloud. We bring specialists into projects remotely, under our contract and our leads." | Hiring is a classic growth signal and is true: specialists are recruited for each project. |

### Current site copy (en.ts), suggestions only

| Key | Before | After |
|---|---|---|
| `prologue.lede` (end) | "Three principals lead each project, from the first scope to production." | "Our leadership team leads each project, hands-on from the first scope to production." |
| `pulse.body` (end) | "…one contract and one team, led by the same three principals, answering for all of it." | "…one contract, one team and one accountable lead for all of it." |
| `people.title` | "The people you meet are the people who build." | Keep; it fits a hands-on leadership team. |
| `people.lede` | "Nothing stands between you and the engineers. The principals who scope…" | "Our leadership team scopes every project and stays hands-on until it runs in production." |
| `people.bench` | "The three principals lead each project. Specialists join… grows or shrinks… works remotely." | "Delivery runs through our practices: Engineering, Product Design, Data & AI, Cloud & DevOps and Delivery. Each project is staffed from our specialist network, with a named account lead." |
| `products.lede` | "with the same principals…" | "The same leadership team that runs client work builds products of our own. Each is open to a sponsor or a buyer." |
| `process.terms[2]` | "A named engineer, never a ticket queue." | "A named account lead for your project." |
| `footer.join` | "Engineers and designers who want to join a project:" | "We're hiring specialists:" |
| `prologue.facts` | "Founded 2024 · Fully remote · Reply within 24 hours" | "Founded 2024 · Remote-first teams · Reply within 24 hours" ("remote-first" stays true and reads as a policy, not a limit). |

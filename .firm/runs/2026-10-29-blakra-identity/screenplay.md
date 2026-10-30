# Screenplay: "The Navigator" (home page, v2)

**Owner, 2026-10-30:** the hero at /lab/ is right; mature it and complete the site. A stronger scenario that leads the visitor on like a romance; no raw page anywhere; every scale measured; every motion at the right moment in the right place; everything on the page, to the end, with its own intelligence and purpose.

## The romance

A romance holds a reader by asking a question early, keeping a promise, and paying it off. Ours:

1. **Hook** (hero): a character you want to understand ("see what he is made of").
2. **Question** (mission): the site asks *you* something and remembers the answer.
3. **Promise** (seven systems): we show you the whole machine, openly.
4. **Proof** (missions flown): we have done this before, here are the seals.
5. **Terms** (checklist): no surprises; the terms are a pre-flight checklist.
6. **Payoff** (reply signal): your answer is already in the form. One tap sends it.

**The thread:** the Navigator stays with the visitor for the whole page. After the hero he docks small at the top right, follows the cursor with his gaze, and reacts to every section (his lamps light with the chosen mission, he explodes into his parts to show the systems, he transmits at the end). One companion, never a prop.

## Scale (desktop 1440×900; phones follow with the subject centred above the text)

| Element | Size | Why |
|---|---|---|
| Helmet in the hero | 54% of the viewport height | The eye reads one object; the headline keeps 62% of the width |
| Companion (docked) | 56 px | The size of the CTA button beside it: a peer, not a toy |
| Exploded helmet | the full height, parts spread over 70% | Each part legible with its label at 12 px mono |
| Headline | 9.2 rem bold / 8.2 rem italic (clamped) | Lando's scale: the type is a surface, not a line |
| Body copy | 1 rem / 1.55 | Read at arm's length |
| Patches | 168 px | A real embroidered patch is 7–9 cm; 168 px at arm's length reads as that |
| Lens | 170 px radius | Covers one subsystem and its label; never the whole helmet |
| Field lines | 24–60 px apart | A survey map, not a texture |

## Timing (nothing on a timer except arrivals; everything else on the scroll, damped)

| Event | Duration | Easing |
|---|---|---|
| Loader (the orbit stroke) | 0.9 s, then the field settles over 0.6 s | out |
| Helmet assembly | 2.6 s, four overlapping phases | smootherstep |
| Lens follow | λ = 14 (about 70 ms lag) | exponential damp |
| Lens open/close | λ = 8 | exponential damp |
| Companion dock (hero → header) | over the hero's scroll-out, 100 svh | scroll-bound |
| Text reveals | 0.6 s clip-path wipe at the moment the scroll reaches them | out; never opacity |
| Exploded view | over the section's hold, 160 svh | scroll-bound |
| Patch hover | 0.5 s tilt, 0.3 s back | out |
| Transmit (on send) | 1.4 s, once | in-out |

## Sections

### 0. Loader (0.9 s)
- Paper. The mark is drawn as one orbit stroke (the ring, then the disk's near side in accent).
- Purpose: a breath, and the brand's hand.
- Reduced motion: skipped.

### 1. Hero: the Navigator (100 svh, held to 200 svh)
- **Picture:** the helmet assembles; the visor shows the lensed black hole he is looking at; the field's lines bend round the cursor; the X-ray lens shows the blueprint and names the subsystems.
- **Words:** "We build what / organizations run on." Mission-control card: founded 2024, reply within 24 h. Hint: "Move the cursor over the Navigator: see what he is made of."
- **Scroll:** from 100 to 200 svh the helmet turns to face the visitor, shrinks and docks at the top right (the companion). The headline scrolls away.
- **Purpose:** identity in five seconds; a hook.

### 2. Manifesto (ink, 100 svh)
- **Picture:** white field lines on ink. Huge type: SOFTWARE WITH *gravity*. The Navigator's light-trail signature (one orbit stroke in accent) draws across it as the section arrives.
- **Words** (from pulse.body, cut to three lines, wiped in on scroll): "Design from one agency, the app from another, the AI from a consultant." / "Each hand-off loses something." / "With us it is one contract, one team, three principals answering for all of it."
- **Purpose:** the thesis, as a poster.

### 3. Mission select (paper, 100 svh)
- **Picture:** seven small mission patches (the needs), round, with the yantras of the layers each takes, in a 4+3 arc. Hover: the patch tilts toward the cursor. Click: it rises, the others dim slightly, and the companion's subsystem lights come on for the layers it takes.
- **Words:** "What do you need built?" Then, on a choice: "Mission accepted · n of 7 systems · nearest proof: {industry}".
- **Purpose:** the question. The answer threads through the page (lights, proof, the form).

### 4. The seven systems (ink, held 160 svh)
- **Picture:** the companion flies to the centre and the helmet explodes along its axis into its seven subsystems, spaced by the scroll: antenna (AI) at the top, down to the life-support pack (cloud). Each part floats with its yantra and a leader to its label. The chosen mission's parts glow; the others stay quiet.
- **Words:** "Seven systems. One crew." Each label: 01 · Cloud and backend · Life-support pack, with its one-line text on hover/focus (engine.layers[*].text).
- **Purpose:** the promise, openly: here is everything we build and how it stacks.

### 5. Missions flown (paper)
- **Picture:** five mission patches (the real projects), generated from the project: the layers' colours as the ring, a guilloché seal from the project's name, the outcome as the patch's motto. A grid, like Lando's helmet wall. The one nearest the chosen mission wears a "Nearest to your mission" band.
- **Words:** "Five missions flown." Click a patch: the case opens below (before / now / outcomes / stack). "Also delivered" as a line of small plain seals.
- **Purpose:** proof.

### 6. Pre-flight checklist (ink)
- **Picture:** a checklist card, the kind clipped to a suit's wrist. Items tick as the scroll reaches them.
- **Words:** the three steps, then the terms: NDA first · a fixed scope and price · a named engineer · reply within 24 h · you own the code and the data.
- **Purpose:** terms without fear.

### 7. Payload (paper)
- **Picture:** the skin-analysis AI as a sealed capsule, its label a real spec plate. The companion's crown lamp (AI) brightens as it comes into view.
- **Words:** products copy; "Demo under NDA"; the sponsors/buyers link.
- **Purpose:** the second business.

### 8. Crew (paper)
- **Picture:** three crew badges fanned like Lando's social cards; each a real name, role, and "Ask about".
- **Purpose:** the people you meet are the people who build.

### 9. Reply signal (ink, 100 svh) and the end card
- **Picture:** the companion comes to the form's side, antenna toward the visitor. The form is a transmission panel. The chosen mission is already written. On send, the message rides out as a light trail and the Navigator's lamps answer.
- **Words:** "Tell us what you need built." The three doors. "Read by an engineer, not a sales team."
- **End card:** BLAKRA — Software with gravity. The field at rest.
- **Purpose:** the payoff.

## Rules
- Real HTML for every word (SEO, four languages).
- One canvas for the Navigator across the whole page; one physics (the field, the lens, the orbit stroke).
- No opacity fades on text: wipes and transforms only.
- Reduced motion: still frames, everything shown, no holds.
- Phones: the companion docks smaller (44 px); the exploded view stacks vertically; patches wrap.

# Screenplay: "The Navigator", one continuous shot

Owner, 2026-10-30: the lab's Navigator hero is the direction. Mature it into the whole site:
- a stronger scenario that leads the visitor on, like a novel;
- no bare page;
- everything at the right scale;
- every motion on time and in its place;
- every element, to the very end, with its own purpose.

Builds on `.firm/runs/2026-10-29-blakra-identity/spec.md` (the identity) and keeps the physics of
`src/features/experience/space.ts`: one spin sense, Kepler speeds, falling as a spiral and rising as
a helix, no flicker, no throb.

## Logline

BLAKRA's Navigator suits up and looks into the black hole where an organization's lost hours
disappear. The work pulled into the hole is built into seven layers and launched back out as
systems that run. Back at base, five flown missions hang as patches beside one empty slot.
At the end the visitor fills that slot: their mission is stitched onto the helmet.

## The arc

Outside → inside → outside: suit up → see what he sees → the record → your mission.

The film enters the visor once and leaves it once. Both are the same camera move, in reverse, so
the world never cuts. Everything between is what the Navigator sees.

## The narrative devices

| Device | What it is | Its purpose |
|---|---|---|
| **The thread** | One orange line, the Navigator's light trail. It draws the orbit at load, leads the camera into the visor, becomes the infall spiral, rides the jet, stitches each mission patch, plots the flight plan, links the crew, and stitches the visitor's own patch. | Wayfinding. Its pen (the bright head) always sits a little ahead of the reader, so the eye is pulled on. |
| **The pen's caption** | A short mono line that travels with the pen and hands over to the next act ("Every mission leaves a patch"). | The novel's page-turn: each act ends on the question the next one answers. |
| **The mission log** | The hero's "Mission control" card becomes a fixed log: `03 / 08 · Launch` and `Next: Missions flown`, with an orbit dial for progress. Click it to go to the next act. | Where you are and what comes next, always. |
| **The open slot** | Patch 06, "Your mission", empty with a dashed stitch, beside the five flown missions. | An open loop that only the contact act closes. |
| **The helmet's seven systems** | Seven subsystems: the seven chakras, the seven layers. | Hero: the X-ray shows them. Missions: hovering a patch lights the layers that project used. End: the visitor's choices light the layers their project needs. |
| **The field** | Gravity contour lines on the paper. | The centre of gravity is always the current subject (helmet, patch, capsule, orbit, crew, form), gliding between them. The cursor is a small mass that bends the lines. |

## Acts and beats

s is the scroll position in screens (one screen is one viewport height of scroll), smoothed. The
whole film is 9.0 screens of scroll, so the page is 10 screens tall at 1440×900, inside the
charter's limit of 12. Every range has an action and a reaction. Text is real HTML and enters by
mask and transform, never by partial opacity.

| s | Act / beat | Camera | Action | Reaction | Words (real HTML) |
|---|---|---|---|---|---|
| load 0–2.9 s | **01 Suit up**: power-on | Still | The thread draws the orbit in one stroke (0.9 s). Inside it, the helmet assembles: the shell lowers, the collar rises, the visor slides home. The seven systems power on, root to crown, 110 ms apart. | — | The eyebrow, then the two headline lines, rise from their masks. The mission log lands last. |
| 0–0.35 | 01: the look | Still | The helmet turns from the cursor to face you squarely, so the black hole in its visor comes to the centre. The X-ray lens closes. | The headline scrolls away at reading speed. | "We build what organizations run on." · the pen's caption: "See what he sees" |
| 0.35–1.10 | 01: the dive | Dollies into the visor at constant speed. The helmet grows from 60% of the screen's height until the visor fills it. | The visor turns from a reflection into a window onto what the Navigator sees. At s = 1.0 the window fills the screen and the film is inside it. | The gold rim sweeps out past the screen's edges. | — |
| 1.10–1.80 | **02 The pull** | A slow dolly toward the hole, turning in the disk's sense | Real paperwork drifts in from the edges and falls in on spirals: hand-count sheets, printed dispatch lists, paper policies, a shift report hours late, "Where is my order?" emails. Each speeds up as it nears the hole (Kepler), stretches, reddens and is gone. | The cursor is a small mass that bends the nearest paths. | "Hand counts. Printed lists. Paper files. Reports that arrive hours late." / "That is where a business loses its hours. We pull that work into one system, and build the system from the foundation up." |
| 1.80–2.60 | 02: seven layers | Holds the turn and closes a little | The disk forms in seven bands, inner (root) to outer (crown); each band lights as its layer is named. | Hover a layer: its band brightens. | "Seven layers. One team." and the seven layers, one line each, each with its yantra |
| 2.60–2.85 | **03 Launch**: charge | Tilts up the spin axis | Seven yantra rings rise up the axis on a helix, root first, and stack into the column. | — | — |
| 2.85–2.95 | 03: ignition | One kick (scroll-driven, damped), then rides up | The crown fires the jet: a white beam with shock diamonds. | — | "Then we launch it as a system that runs." |
| 2.95–3.50 | 03: five systems | Rides up the jet | Five stars ignite along the jet, and each opens into the system it became: stock across twelve stores, live dispatch, a client portal, a line monitor, a support assistant. | Each card leans toward the cursor. | "Five businesses. Five systems we built and launched." |
| 3.50–3.95 | **04 Missions flown**: the exit | Pulls back out through the visor (the dive in reverse) | The window shrinks back into the visor, and the helmet re-forms round it on the paper. The thread comes out of the visor. | — | pen caption: "Every mission leaves a patch" |
| 3.95–5.00 | 04: the patch wall | Helmet glides left to 34% of the screen's height | The thread runs out of the visor and stitches five patches, one after another. Each is generated from its project: its layers' yantras round the rim, a guilloché seal and its outcome. The sixth slot stays empty: a dashed stitch, "06 · Your mission". | Hover a patch: the helmet lights the layers that project used. Click it: the case opens (before, now, outcomes, stack). | "Missions flown." Five patches, each with its outcome: 40% fewer stockouts · 3 h saved each day; 20% more deliveries per shift; 24/7 client self-service; downtime seen as it happens; 65% of questions answered automatically. "Client names stay confidential under our contracts." |
| 5.00–5.90 | **05 Our own payload** | The helmet rises out of frame on a helix; the field's centre glides to the capsule | Off-track split: paper on the left; on the right a sealed, dark capsule window (the visor's twin) with a face-scan blueprint, sealed "Under NDA". | The X-ray lens returns over the capsule only and shows how it is made: written from scratch, no third-party dependencies, images never leave. | "We also build products of our own." · Skin analysis AI · the offer · "Request the demo under NDA" (goes to the contact act with Sponsor/buy chosen) |
| 5.90–6.90 | **06 Flight plan** | Paper; the field centres on the orbit | A transfer-orbit drawing from "Your operations" (inner orbit) to "In production" (outer orbit). The thread flies it. Three burns are the three steps, and on the build arc a tick mark lands every two weeks. | Each burn lights as the pen reaches it. | "Exact before expensive." · Scope the problem / Build the first system / Run it with you · the five terms as the plan's notes |
| 6.90–7.70 | **07 Crew** | Paper | Three crew badges. The thread flies the stable three-body figure-eight through them: three principals in balance. | Hover a badge: the pen stops at it. | "The people you meet are the people who build." · names, roles, "Ask about" · the bench line |
| 7.70–9.00 | **08 Your mission** (the bookend) | The helmet descends on a spiral to the opening's framing | The empty patch from act 04 is now on the helmet's chest. Choosing what you need lights the subsystems on the helmet and stitches their yantras into the patch. On Send, the antenna lights, the thread rises out of frame, and the patch closes with your organization's name. | Every choice is answered on the helmet. | "Tell us what you need built." · the three doors · the need chips · name, email, message · "Within 24 hours, an engineer who would build it replies." · end card: "BLAKRA — Software with gravity." The thread closes the orbit it drew at load. |

## Scale (measured, not guessed)

**Grid.** 12 columns. Margin `clamp(20px, 3.4vw, 52px)`. Gutter 24px (16px on phones). The words
own columns 1–6; the subject owns columns 7–12.

**Type.** A ratio of 1.25 from 17px body:

| Role | Size |
|---|---|
| Display | `clamp(52px, 1rem + 6.6vw, 148px)` (111px at 1440) |
| Act title | `clamp(34px, 0.5rem + 3.4vw, 64px)` |
| Lead | 22px |
| Body | 17px |
| Labels (mono, tracking 0.14em) | 12px |

**Objects.** Measured as a share of the viewport. The 3D placement solves for the target box, so
the composition holds at any aspect.

| Object | Desktop | Phone |
|---|---|---|
| Hero helmet | 60% of height, centre (0.70, 0.41); never crosses the headline's box | 40%, centre (0.5, 0.33) |
| The hole's shadow | 14% of height at entry; 20% while the layers form; 9% wide for the launch | — |
| Paperwork | 6–9% of height, smaller with depth | — |
| System cards | 22% of height | — |
| Patches | 2 columns wide (about 200px at 1440), min 128px; the open slot the same size | — |
| Helmet at the patch wall | 34% of height, centre (0.24, 0.52) | — |
| Capsule | 5 columns | — |
| Crew badges | 3 columns each | — |

## Timing (one clock)

- **The scroll is the clock.** Every beat is a function of smoothed s (damping 6/s), so it can be
  scrubbed both ways and never jumps.
- **The wall clock** drives only:
  - the load sequence (2.9 s)
  - orbital spin (Kepler)
  - the pen's slow orbit while idle
- **Entrances:** 0.7 s equivalents of scroll, `cubic-bezier(0.16, 1, 0.3, 1)`, staggered by 0.04
  screen.
- **The camera** moves through its keys on a monotone cubic: continuous speed, no stops, never
  backwards.

## Rules

- No pins, no snapping, no `backdrop-filter`; fixed layers move by transform only.
- No invented facts: every claim is already in `src/content/FACTS.md`.
- Phones: the same film with stacked layout and fewer objects.
- Reduced motion: the same story as still frames with their words.

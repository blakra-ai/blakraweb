# Screenplay v2: "The Navigator", the elf-android

Owner, 2026-10-30 (approved the style frame): "work out the details: her hair moves, her eyes
and ears, the text comes out of her mouth and is typed, and a good story scenario on scroll."

Supersedes the figure and the performance in `screenplay.md`; keeps its physics, scale rules and
the page's nine beats (`data-beat`: hero, manifesto, mission, systems, proof, checklist, payload,
crew, contact), which the director already reads. `character-brief.md` describes her.

## Who she is

She is not a mascot; she is the guide who has flown this before. Calm, precise, a little amused.
She never looks away from the visitor for long. Everything she does is a reaction to the visitor
(cursor, scroll, a choice) or to what she is talking about. She never fidgets without a reason.

## Her living systems (always on, model-independent)

| System | Behaviour | Signal in | Rule |
|---|---|---|---|
| **Gaze** | Both eyes aim at the cursor; the head follows at a third of the angle, the shoulders at a tenth. Eyes lead the head by ~120 ms (eyes damp 18/s, head 6/s, body 3/s). No cursor: she looks at the camera, then wanders every 4–7 s to a point near it and back. | pointer, beat | Eye travel capped at ±25° so the irises never show white edges. |
| **Blink** | Lids close in 70 ms, open in 120 ms. Random every 3–6 s; always once when a new line starts, once when the beat changes, and a slow one (400 ms) when the form is sent. | clock, spokeAt, beat | Never while the eye is the camera's subject (the dive). |
| **The hole in her eyes** | Iris = the seven-band disk turning at Kepler speeds, pupil = the shadow with the photon ring. The disk brightens 20% while she types and when the cursor is on her face. On hover of a layer anywhere on the page, that band flares. | typingUntil, pointer, hover | One shader, the current `visor.ts` on a sphere, UV at the pupil. |
| **Ears** | Resting sweep 35°. Prick up 6° on a new line (flick, 180 ms, settles with one overshoot); the tips light in the crown's violet while she types; one ear turns 4° toward the cursor side. On the form's send both light fully for 1.2 s. | spokeAt, typingUntil, pointer, transmitAt | Spring: stiffness 90, damping 11. |
| **Hair** | Strands as bone chains (6–8 chains, 5 bones each), Verlet with gravity, a light wind field and the head's motion: when she turns, the hair lags and swings back. The scroll adds a downward wind so the hair lifts a little as she "falls" through the page and settles when the scroll stops. | head velocity, scroll velocity, clock | ≤ 0.3 ms a frame; a fixed step of 1/60 with at most 3 substeps; collisions with two capsules (head, shoulders). Reduced motion: still. |
| **Speech** | Her line is typed (34 cps) on a card whose tail points to her mouth: the card is positioned each frame from the mouth bone projected to the screen (the card floats right of the face in the hero, under her chin when docked). The lips part 2–3 mm on each vowel group of the typed text (jaw bone, 4 Hz envelope) and close at the full stop. The card stays for 2.2 s after the line, then fades unless the cursor is on it. | line, typingUntil | Full text in the HTML for assistive tech (as now). |
| **Breath** | Chest rises 4 mm on a 5.2 s cycle; the collar's ring turns slowly. | clock | Never off; it is what makes her alive between events. |

## The scroll story (nine beats, one shot)

s is the director's beat progress. Each beat has her place on screen, her action, her reaction to
the visitor, and her line (spoken from the mouth; the lines below replace `navigator.lines`).
Scale is in share of viewport height; the head is the unit.

| # | Beat | Where she is | Action | Reaction to the visitor | Her line |
|---|---|---|---|---|---|
| 01 | **hero** (arrival) | Right of the words; head 30% high, eyes at (0.70, 0.36). Cut at the chest by the headline's box. | Load: dark; the seven systems power on root to crown, 110 ms apart; the eyes open last and the disks ignite. The hair settles from a lift. She blinks once, finds the visitor, and speaks. | Her eyes and head follow the cursor. The X-ray lens over her shows the inner set and names the seven systems. Hover an eye: the disk brightens and the words "Look closer" appear on the card. | "I'm the Navigator. I've flown this descent before. Look into my eyes and see what I see." |
| 02 | **manifesto** (the fall begins) | She drifts left and down as the hero scrolls out, shrinking to the dock badge (head only, 56 px) in the header, by s=0.6 of the hero's leave. | The paper turns to ink. Her disks are the only colour on the dark page; the gravity contours centre on the hole in the text. | The badge keeps her gaze: even docked, her eyes follow the cursor. | "One contract, one crew. Every hand-off you skip is a failure you never debug." |
| 03 | **mission** (the question) | Docked; the card hangs under her chin. | She leans toward the page (badge tilts 3°) as the question appears. | Pick a need: the layers it takes light on her collar and chest (badge and, when the hero is in view again, the full figure), root to crown, 90 ms apart. Her ears flick. | "What are we building? Choose, and I'll light the systems it takes." / on a choice: "{tag}: {n} of my seven systems. Watch them light." |
| 04 | **systems** (her anatomy) | She returns to full size, left of the seven layers, head 24% high, three-quarter view, looking at the layers, then at the visitor. | As each layer is named, the matching system lights on her body and her eyes glance at it (a saccade, 90 ms), then back to the visitor. | Hover a layer: the band in her irises flares and the system pulses. | "My seven systems, root to crown. Each one rests on the one beneath it." |
| 05 | **proof** (missions flown) | Head and shoulders, 24% high, left at (0.24, 0.50); she looks at the patches. | Her thread (the orange trail) runs from her collar and stitches the five patches, one per 0.16 of s. The sixth slot stays dashed. | Hover a patch: she turns her head to it and the layers it used light on her. | "Five missions flown. The one nearest yours wears the orange stitch." |
| 06 | **checklist** (before we fly) | Docked again, small. | Each item ticked lights one ear tip briefly. | On the last item her eyes close for a slow blink and reopen on the visitor. | "Before we fly: the checklist. The last item is the one that matters." |
| 07 | **payload** (her own) | Profile, right side, 30% high, looking into the sealed capsule window; the window reflects her disks. | The X-ray lens works only over the capsule: it shows the product's inside. | Hover the capsule: she looks at the visitor as if to say "yes, ours". | "Our own payload: an AI that reads skin. Sealed, and shown under NDA." |
| 08 | **crew** | Docked; the card under her chin. | The thread flies the figure-eight through the three badges. | Hover a badge: she looks at it. | "The crew you meet is the crew that builds. Three of us, no hand-offs." |
| 09 | **contact** (your mission) | Full figure returns, right of the form, head 30% high, facing the visitor squarely. The gravity field centres on the form. | Each choice in the form lights its systems on her. On Send: ears light, a slow blink, the thread rises out of frame from her collar, and the end card types "BLAKRA — Software with gravity." | She follows the cursor to the Send button and holds the gaze there. | "Your mission is written in. Send it, and an engineer who would build it answers within 24 hours." |

Arrival and return (01→02, 03→04, 05→06, 08→09) are the same move: a glide on the field's contour,
never a cut, 0.6 screens long, monotone cubic, the hair lagging the move.

## Rules kept
- The scroll is the clock; the wall clock drives only blink, breath, hair, idle gaze and typing.
- No pins, no snapping, no `backdrop-filter`; the stage is fixed and moves by transform.
- Text never fades through partial opacity; the card wipes by mask.
- Reduced motion / `still`: she is a still frame per beat with the line shown whole; no hair, no blink.
- Phones: head 24% high, centre (0.5, 0.30) in the hero; docked for every other beat; speech card full width under the header.
- Copy goes into all four locale files; no new facts (FACTS.md unchanged).

## Acceptance (what the owner will see)
1. Her eyes follow the cursor and blink; the disks turn in them.
2. Her ears flick when a line starts and glow while she types.
3. Her hair swings when she turns and lifts while the page scrolls.
4. The card's tail points at her mouth at any size, and her lips move while it types.
5. Scrolling the nine beats shows the places, glides and reactions in the table, with no jump.
6. `npm test`, `npm run typecheck`, `npm run build` pass; the hero's first paint is unchanged.

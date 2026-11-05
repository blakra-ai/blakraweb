/**
 * Where the Navigator is for each beat (screenplay v2's table), pure. `x`/`y` are her eyes' place
 * as a share of the viewport (0 … 1, y down); `s` is the figure's scale so her head stands
 * `share` of the viewport's height; `yaw` is the body's turn in degrees (0 faces the visitor,
 * ±80 is a profile; positive turns her face toward the screen's right); `look` names what she
 * watches; `docked` sends her to the header badge.
 *
 * The words own the page's left columns in every landscape section (title, lede, list, case),
 * so she stands on the right and turns left toward what she watches; the contact form owns the
 * right column instead, so there she stands left and turns right. She never crosses a text
 * block's box.
 */

export type Look = 'visitor' | 'layers' | 'patches' | 'capsule' | 'form'

export interface PoseKey {
  x: number
  y: number
  s: number
  yaw: number
  look: Look
  docked: boolean
}

export interface PoseContext {
  portrait: boolean
  /** The model's head height in its own units (measured at load). */
  headHeight: number
  /** The viewport's height in the model's units at the figure's depth. */
  vhUnits: number
}

/** Head height as a share of the viewport for a docked badge (the header slot). */
export const DOCK_SHARE = 0.06

interface Place {
  x: number
  y: number
  share: number
  yaw: number
  look: Look
}

const DOCKED: Place = { x: 0.08, y: 0.06, share: DOCK_SHARE, yaw: 0, look: 'visitor' }

const LANDSCAPE: Record<string, Place> = {
  hero: { x: 0.7, y: 0.36, share: 0.3, yaw: 0, look: 'visitor' },
  systems: { x: 0.76, y: 0.44, share: 0.24, yaw: -35, look: 'layers' },
  // Below the patch row, in the right column's free corner: the patches span the width.
  proof: { x: 0.84, y: 0.7, share: 0.2, yaw: -20, look: 'patches' },
  // The capsule hangs in the right column too; her head sits under its box for the beat's second half.
  // Under the product card, small and in profile toward it: the card owns columns 7–12 above her.
  payload: { x: 0.86, y: 0.82, share: 0.18, yaw: -80, look: 'capsule' },
  // The form owns the right column; she stands in the left one below the intro's last paragraph and faces it.
  contact: { x: 0.22, y: 0.74, share: 0.24, yaw: 35, look: 'form' },
}

const PORTRAIT_HERO: Place = { x: 0.5, y: 0.3, share: 0.24, yaw: 0, look: 'visitor' }

/** The pose for a beat (unknown beats dock). */
export function poseFor(beat: string, ctx: PoseContext): PoseKey {
  let place: Place | undefined
  if (ctx.portrait) place = beat === 'hero' ? PORTRAIT_HERO : undefined
  else place = LANDSCAPE[beat]
  const docked = !place
  const p = place ?? DOCKED
  return { x: p.x, y: p.y, s: scaleFor(p.share, ctx), yaw: p.yaw, look: p.look, docked }
}

/** The figure's scale so its head stands `share` of the viewport's height. */
export function scaleFor(share: number, ctx: PoseContext): number {
  return (share * ctx.vhUnits) / Math.max(1e-6, ctx.headHeight)
}

const smoothstep = (t: number) => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c * c * (3 - 2 * c)
}

/** The glide from `a` to `b` at `t` (0 … 1): smoothstep on the numbers; `look` and `docked` flip at t ≥ 0.5. */
export function glide(a: PoseKey, b: PoseKey, t: number): PoseKey {
  if (t <= 0) return { ...a }
  if (t >= 1) return { ...b }
  const k = smoothstep(t)
  const late = t >= 0.5
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    s: a.s + (b.s - a.s) * k,
    yaw: a.yaw + (b.yaw - a.yaw) * k,
    look: late ? b.look : a.look,
    docked: late ? b.docked : a.docked,
  }
}

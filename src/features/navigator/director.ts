import { chapters } from '../../content/shared'
import { onReflow } from '../../motion/reflow'
import { LAYERS, nav, type Beat, type Box } from './state'

/** The beat changes when a section's top passes this share of the screen's height. */
const SWITCH = 0.35
/** The scroll speed's smoothing (per second) and its clamp (screens per second). */
const SCROLL_V_DAMP = 8
const SCROLL_V_MAX = 6

interface Section {
  beat: Beat
  top: number
  height: number
  ink: boolean
}

/** The page's elements she looks at, found on reflow (the lists are stable; cards re-render in place). */
interface Targets {
  layers: HTMLElement[]
  layerList: HTMLElement | null
  patches: HTMLElement[]
  capsule: HTMLElement | null
  crew: HTMLElement[]
  submit: HTMLElement | null
}

const centre = (el: HTMLElement) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** The centre of several elements' union box. */
const centreOf = (els: HTMLElement[]) => {
  if (!els.length) return null
  let l = Infinity
  let t = Infinity
  let r = -Infinity
  let b = -Infinity
  for (const el of els) {
    const q = el.getBoundingClientRect()
    l = Math.min(l, q.left)
    t = Math.min(t, q.top)
    r = Math.max(r, q.right)
    b = Math.max(b, q.bottom)
  }
  return { x: (l + r) / 2, y: (t + b) / 2 }
}

const index = (el: Element | null | undefined, attr: string): number | null => {
  const v = (el as HTMLElement | null)?.dataset[attr]
  if (v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * The director reads the page for the world: which section (data-beat) is on screen and how far
 * through it the reader is, how far since the beat began (for the glide from the beat before),
 * how far the hero has scrolled out, where the dock is, what the cursor rests on (layers,
 * patches, the capsule, the crew) and where on screen the thing she watches is. Positions are
 * measured on reflow; every frame is arithmetic plus one box read for her gaze.
 */
export function createDirector() {
  let sections: Section[] = []
  let dockEl: HTMLElement | null = null
  let targets: Targets = { layers: [], layerList: null, patches: [], capsule: null, crew: [], submit: null }
  let lastY = window.scrollY

  const measure = () => {
    const y = window.scrollY
    // The page's sections only: the Navigator's own card carries the beat it speaks, and is not a section.
    sections = [...document.querySelectorAll<HTMLElement>('main [data-beat]')].map((el) => ({
      beat: el.dataset.beat as Beat,
      top: el.getBoundingClientRect().top + y,
      height: el.offsetHeight,
      ink: el.dataset.surface === 'ink',
    }))
    dockEl = document.querySelector<HTMLElement>('[data-dock]')
    const d = dockEl?.getBoundingClientRect()
    if (d) nav.dock = { x: d.left, y: d.top, w: d.width, h: d.height }
    const main = document.querySelector('main') ?? document
    // The contact beat's no-go boxes for the speech card, in page coordinates.
    const pageBox = (el: Element): Box => {
      const r = el.getBoundingClientRect()
      return { x: r.left, y: r.top + y, w: r.width, h: r.height }
    }
    const contact = main.querySelector('[data-beat="contact"]')
    const form = contact?.querySelector('form')
    const text = contact ? [...contact.querySelectorAll('h1, h2, p, a')].filter((el) => !form?.contains(el) && el.getClientRects().length > 0) : []
    const paras = text.filter((el) => el.tagName === 'P')
    nav.contact = { form: form ? pageBox(form) : null, text: text.map(pageBox), lastPara: paras.length ? pageBox(paras[paras.length - 1]) : null }
    const layers = [...main.querySelectorAll<HTMLElement>('[data-layer]')]
    targets = {
      layers,
      layerList: layers[0]?.parentElement ?? null,
      patches: [...main.querySelectorAll<HTMLElement>('[data-patch]')],
      capsule: main.querySelector<HTMLElement>('[data-capsule]'),
      crew: [...main.querySelectorAll<HTMLElement>('[data-crew]')],
      submit: main.querySelector<HTMLElement>('form button[type="submit"]'),
    }
  }
  measure()
  const off = onReflow(measure)

  // Hover, delegated on main: what the cursor rests on, read from the data attributes.
  const main = document.querySelector('main')
  const hoverFrom = (el: Element | null) => {
    const h = nav.hover
    h.layer = index(el?.closest('[data-layer]'), 'layer')
    const patch = index(el?.closest('[data-patch]'), 'patch')
    if (patch !== h.patch) {
      h.patch = patch
      const used = patch !== null ? chapters[patch]?.layers : undefined
      h.patchLayers = used ? used.map((l) => LAYERS.indexOf(l)).filter((i) => i >= 0) : null
      h.at = nav.clock
    }
    h.capsule = !!el?.closest('[data-capsule]')
    h.crew = index(el?.closest('[data-crew]'), 'crew')
  }
  const over = (e: PointerEvent) => hoverFrom(e.target as Element | null)
  const out = (e: PointerEvent) => {
    const to = e.relatedTarget as Element | null
    if (!to || !main?.contains(to)) hoverFrom(null)
  }
  main?.addEventListener('pointerover', over, { passive: true })
  main?.addEventListener('pointerout', out, { passive: true })

  return {
    measure,
    update(dt: number) {
      const y = window.scrollY
      const vh = window.innerHeight
      nav.clock += dt
      nav.portrait = window.innerWidth < window.innerHeight
      // The scroll's speed in screens per second, smoothed and clamped: the wind that lifts her hair.
      if (dt > 0) {
        const raw = Math.max(-SCROLL_V_MAX, Math.min(SCROLL_V_MAX, (y - lastY) / vh / dt))
        nav.scrollV += (raw - nav.scrollV) * (1 - Math.exp(-SCROLL_V_DAMP * dt))
      }
      lastY = y
      // The section whose top has passed the screen's upper third owns the beat.
      let i = 0
      while (i < sections.length - 1 && y + vh * SWITCH >= sections[i + 1].top) i++
      const s = sections[i]
      if (s) {
        nav.beat = s.beat
        nav.prevBeat = sections[i - 1]?.beat ?? s.beat
        // Progress across the section's hold (its height less one screen), or its height when it does not hold.
        const span = Math.max(1, s.height > vh + 1 ? s.height - vh : s.height)
        nav.progress = Math.min(1, Math.max(0, (y - s.top) / span))
        // Screens scrolled since the beat became hers: a pure function of the scroll, so the glide
        // from the beat before plays the same forward and back.
        nav.enter = (y + vh * SWITCH - s.top) / vh
      }
      // The walk to the dock plays over the first 60% of a screen of scroll, as the hero leaves.
      nav.leave = Math.min(1, Math.max(0, y / (vh * 0.6)))
      // Ink bands on screen (at most four), as [top, bottom] in CSS pixels from the top of the screen.
      const bands: [number, number][] = []
      for (const sec of sections) {
        if (!sec.ink) continue
        const top = sec.top - y
        const bottom = top + sec.height
        if (bottom < -2 || top > vh + 2) continue
        bands.push([top, bottom])
        if (bands.length === 4) break
      }
      nav.inkBands = bands
      // Where she looks: the pose names it (nav.look, from the world); the hover refines it.
      const h = nav.hover
      const t = targets
      let at: { x: number; y: number } | null = null
      switch (nav.look) {
        case 'layers': {
          const el = h.layer !== null ? t.layers.find((l) => index(l, 'layer') === h.layer) : undefined
          at = el ? centre(el) : t.layerList ? centre(t.layerList) : null
          break
        }
        case 'patches': {
          const el = h.patch !== null ? t.patches[h.patch] : undefined
          at = el ? centre(el) : centreOf(t.patches)
          break
        }
        case 'capsule':
          // Hover the capsule: she looks at the visitor, as if to say "yes, ours".
          at = h.capsule || !t.capsule ? null : centre(t.capsule)
          break
        case 'form':
          at = t.submit ? centre(t.submit) : null
          break
        default: {
          const el = h.crew !== null ? t.crew[h.crew] : undefined
          at = el ? centre(el) : null
        }
      }
      nav.lookAt = at
    },
    dispose() {
      off()
      main?.removeEventListener('pointerover', over)
      main?.removeEventListener('pointerout', out)
    },
  }
}

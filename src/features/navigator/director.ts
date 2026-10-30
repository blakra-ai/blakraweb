import { onReflow } from '../../motion/reflow'
import { nav, type Beat } from './state'

/**
 * The director reads the page for the world: which section (data-beat) is on screen and how far
 * through it the reader is, how far the hero has scrolled out, where the dock is, and which
 * sections are drawn on ink. Positions are measured on reflow; every frame is arithmetic.
 */
export function createDirector() {
  let sections: { beat: Beat; top: number; height: number; ink: boolean }[] = []
  let dockEl: HTMLElement | null = null

  const measure = () => {
    const y = window.scrollY
    sections = [...document.querySelectorAll<HTMLElement>('[data-beat]')].map((el) => ({
      beat: el.dataset.beat as Beat,
      top: el.getBoundingClientRect().top + y,
      height: el.offsetHeight,
      ink: el.dataset.surface === 'ink',
    }))
    dockEl = document.querySelector<HTMLElement>('[data-dock]')
    const d = dockEl?.getBoundingClientRect()
    if (d) nav.dock = { x: d.left, y: d.top, w: d.width, h: d.height }
  }
  measure()
  const off = onReflow(measure)

  return {
    measure,
    update(dt: number) {
      const y = window.scrollY
      const vh = window.innerHeight
      nav.clock += dt
      nav.portrait = window.innerWidth < window.innerHeight
      // The section whose top has passed the screen's upper third owns the beat.
      let i = 0
      while (i < sections.length - 1 && y + vh * 0.35 >= sections[i + 1].top) i++
      const s = sections[i]
      if (s) {
        nav.beat = s.beat
        // Progress across the section's hold (its height less one screen), or its height when it does not hold.
        const span = Math.max(1, s.height > vh + 1 ? s.height - vh : s.height)
        nav.progress = Math.min(1, Math.max(0, (y - s.top) / span))
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
    },
    dispose: off,
  }
}

import { useEffect, useRef, type ReactNode } from 'react'
import { reflow } from '../../motion/reflow'
import type { WindowId } from './state'
import { registerWindow, type WindowKind } from './windows'
import s from './Window.module.css'

/**
 * A framed window onto the world: a 24 px inset frame with a 16 px radius and a 1 px hairline,
 * min-height 100svh and height auto (it grows with its content, revision-1 §5). Its children are
 * real DOM; the area behind them is transparent.
 *
 * Background contract (decided here, read by World.tsx): the body is solid `--body`, the
 * document above it is transparent, and the window is transparent too. The fixed canvas sits
 * between the body and the document (z 0 / z 1, global.css) and paints ONLY inside the rects it
 * finds in `obs.windows` (a scissor per window), clearing everything else to transparent, so the
 * body colour shows wherever no window is. Light screens carry their own opaque background.
 *
 * Before the world runs, and without a GPU or under reduced motion, the window shows its still:
 * the `still` JPG (eager at low priority: it is the first screen's image, and a phone crop `stillPhone` (the band: ring and her) keeps it light) when one exists, and the CSS ring behind the children either way. The
 * still is hidden once `html.gl-live` is set by the world. The ring's place comes from the parent's
 * `--ring-x`, `--ring-y` and `--ring-r` (so each window, and each breakpoint, sets its own).
 */
export function Window({ id, kind, still, stillPhone, stillAlt = '', ring, className, children }: { id: WindowId; kind?: WindowKind; still?: string; stillPhone?: string; stillAlt?: string; ring?: boolean; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const k: WindowKind = kind ?? (id === 'stage' ? 'stage' : id === 'contact' ? 'contact' : 'hero')

  // The world's registry measures the rect (windows.ts, into obs.windows) now and on reflow only, never per frame.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const off = registerWindow(id, el, k)
    reflow()
    return off
  }, [id, k])

  return (
    <div ref={ref} className={`${s.window}${className ? ` ${className}` : ''}`} data-window={id}>
      <div className={s.still} data-still aria-hidden="true">
        {still && (
          <picture>
            {stillPhone && <source media="(max-width: 767px)" srcSet={stillPhone} />}
            <img src={still} alt={stillAlt} decoding="async" fetchPriority="low" className={s.stillImage} />
          </picture>
        )}
        {ring && (
          <div className={s.hole}>
            <i className={s.crescent} />
            <i className={s.photon2} />
            <i className={s.photon} />
            <i className={s.disc} />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

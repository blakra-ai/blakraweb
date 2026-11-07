import type { ReactNode } from 'react'
import s from './Inner.module.css'

export const two = (n: number) => String(n).padStart(2, '0')

/** The motif on the inner pages: the gold ring and its black hole, drawn in CSS. Sized and placed by its parent's --ring-* values. */
export function Ring({ className = '' }: { className?: string }) {
  return (
    <span className={`${s.ring} ${className}`} aria-hidden="true">
      <svg className={s.orbit} viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="199" />
      </svg>
      <i className={s.photon} />
      <i className={s.hole} />
    </span>
  )
}

interface ClosingProps {
  eyebrow: string
  title: string
  text?: string
  cta: string
  href: string
  /** Quieter links or lines beside the button. */
  aside?: ReactNode
  /** Under the actions: fine print. */
  foot?: ReactNode
}

/** How a page ends: one ink window with the ring, the next step as one gold button; the footer follows it at once. */
export function Closing({ eyebrow, title, text, cta, href, aside, foot }: ClosingProps) {
  return (
    <div className={s.closingWrap}>
      <section className={`dark ${s.window} ${s.closing}`} aria-labelledby="closing-title">
        <Ring className={s.closingRing} />
        <div className={s.closingWords}>
          <p className="eyebrow mono">{eyebrow}</p>
          <h2 id="closing-title" className="h2">
            {title}
          </h2>
          {text && <p className={s.closingText}>{text}</p>}
          <div className={s.closingActions}>
            <a className={`pill ${s.cta}`} data-solid href={href}>
              {cta} <span aria-hidden="true">→</span>
            </a>
            {aside}
          </div>
          {foot}
        </div>
      </section>
    </div>
  )
}

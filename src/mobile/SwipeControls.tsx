import type { RefObject } from 'react'
import { useI18n } from '../i18n'

const LABELS = {
  en: { prev: 'Previous', next: 'Next', auto: 'Auto-play' },
  de: { prev: 'Zurück', next: 'Weiter', auto: 'Automatisch abspielen' },
  fr: { prev: 'Précédent', next: 'Suivant', auto: 'Défilement automatique' },
  es: { prev: 'Anterior', next: 'Siguiente', auto: 'Reproducción automática' },
} as const

/**
 * The swipe row's bar on phones (useSwipe wires it): previous, the "2 / 6" counter, next, and the
 * autoplay toggle (on by default, every 5 s). Hidden on desktop, where the rows are grids.
 */
export function SwipeControls({ swipe }: { swipe: { count: RefObject<HTMLParagraphElement | null>; controls: RefObject<HTMLDivElement | null> } }) {
  const { locale } = useI18n()
  const l = LABELS[locale as keyof typeof LABELS] ?? LABELS.en
  return (
    <div ref={swipe.controls} className="m-only m-ctrl">
      <button type="button" data-dir="-1" aria-label={l.prev}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
      </button>
      <p ref={swipe.count} className="m-count" aria-hidden="true" />
      <button type="button" data-dir="1" aria-label={l.next}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
      </button>
      <button type="button" data-auto aria-label={l.auto} aria-pressed="true">
        <svg className="m-ctrl-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3v10M10.5 3v10" /></svg>
        <svg className="m-ctrl-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" /></svg>
      </button>
    </div>
  )
}

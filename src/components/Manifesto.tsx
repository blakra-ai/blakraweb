import { useRef } from 'react'
import { useI18n } from '../i18n'
import { useReveal } from '../motion/useReveal'
import { Section } from './Section'
import s from './Manifesto.module.css'

/**
 * The manifesto, on ink: the thesis as a poster. SOFTWARE WITH gravity, huge; the Navigator's
 * light trail (one orbit stroke, in the accent) draws across it as the section arrives; then
 * the three lines of why one team, wiped in by the scroll.
 */
export function Manifesto() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  useReveal(ref, 0.3)
  // The thesis, cut into the lines a poster reads in: the body's sentences.
  const lines = t.pulse.body.split(/(?<=\.)\s+/).filter(Boolean)
  const [first, second, ...rest] = [...t.footer.line.replace(/\.$/, '').split(' ')]
  const words = { before: [first, second].join(' '), em: rest.join(' ') }

  return (
    <Section ref={ref} id="manifesto" beat="manifesto" surface="ink" className={s.manifesto} aria-labelledby="manifesto-title">
      <p className={s.eyebrow}>{t.pulse.eyebrow}</p>
      <h2 id="manifesto-title" className={s.title}>
        <span>{words.before}</span>
        <em>{words.em}.</em>
        {/* The light trail: one orbit, drawn by the scroll, as a signature across the words. */}
        <svg className={s.trail} viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
          <path d="M90 330 C 140 90, 720 20, 900 150 C 980 220, 760 380, 420 370 C 200 365, 60 290, 160 190" pathLength="1" />
        </svg>
      </h2>
      <p className={s.statement}>{t.pulse.title}</p>
      <ol className={s.lines}>
        {lines.map((line, i) => (
          <li key={line} style={{ '--i': i } as React.CSSProperties}>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </Section>
  )
}

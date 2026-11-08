import type { CSSProperties } from 'react'
import { aiTools, products } from '../content/shared'
import type { AiBlockId } from '../content/types'
import { useI18n } from '../i18n'
import { pathFor, workPath } from '../routes'
import { Section } from './Section'
import { useSwipe } from '../mobile/swipe'
import { SwipeControls } from '../mobile/SwipeControls'
import s from './Ai.module.css'

const ORDER: readonly AiBlockId[] = ['agents', 'documents', 'extraction', 'vision', 'training', 'evaluation']
const two = (n: number) => String(n).padStart(2, '0')

/**
 * 06 AI, the page's boldest stage between the two windows: one ink card on the paper (the products'
 * pattern, so the porthole keeps its gutter), a gold neon arc from the hero's ring behind its top
 * right corner, the headline at H1 scale, six capabilities as ink cards (3 × 2), and the two ways to
 * build as the closing band, with the closing line and a gold button. On phones the whole section
 * is ink and the six capabilities a swipe row. Proof links: Helya, Nuvoq (client work) and LIOXSA
 * (our product).
 */
export function Ai() {
  const { t, locale } = useI18n()
  const a = t.ai
  const swipe = useSwipe<HTMLUListElement>()
  const { list } = swipe
  const lioxsa = products.find((p) => p.id === 'skin')
  const proof: Partial<Record<AiBlockId, { href: string; label: string; external?: boolean }[]>> = {
    documents: [{ href: workPath('helya-ai', locale), label: 'Helya' }],
    vision: [
      { href: workPath('nuvoq-vision', locale), label: 'Nuvoq' },
      ...(lioxsa?.href ? [{ href: lioxsa.href, label: `${lioxsa.name} (${a.ourProduct})`, external: true }] : []),
    ],
  }
  return (
    <Section id="ai" beat="ai" surface="body" station={6} className={s.ai} aria-labelledby="ai-title" data-m-surface="ink">
      <div className={`dark ${s.card}`} data-m-surface="ink">
        {/* The hero's ring, seen past the card's corner: decoration, behind everything in the card. */}
        <div className={s.arc} aria-hidden="true">
          <i className={s.photon2} />
          <i className={s.photon} />
          <i className={s.neon} />
        </div>

        <div className={s.head}>
          <p className="eyebrow mono">
            {two(6)} / 10 &nbsp;·&nbsp; {a.eyebrow}
          </p>
          {/* Its length sets the size: the line count holds at three when a language runs longer. */}
          <h2 id="ai-title" className={`h1 ${s.title}`} style={{ '--chars': a.title.length } as CSSProperties} data-focus tabIndex={-1}>
            {a.title}
          </h2>
          <p className={`d-only lede ${s.lede}`}>{a.lede}</p>
          <p className={`m-only lede ${s.lede}`}>{a.ledeShort}</p>
        </div>

        <ul ref={list} className={`m-swipe ${s.grid}`} aria-label={a.title} aria-roledescription="carousel">
          {ORDER.map((id, i) => (
            <li key={id} className={s.cell}>
              <span className={`mono ${s.n}`}>{two(i + 1)}</span>
              <h3 className={s.name}>{a.blocks[id].name}</h3>
              <p className={s.text}>{a.blocks[id].text}</p>
              {proof[id] && (
                <p className={s.proof}>
                  {proof[id]!.map((l, k) => (
                    <span key={l.href}>
                      {k > 0 && <span aria-hidden="true"> · </span>}
                      <a href={l.href} {...(l.external ? { rel: 'noopener', target: '_blank' } : {})}>
                        {l.label}
                        {l.external && <span className="sr-only"> ({t.ui.newTab})</span>}
                        <span aria-hidden="true"> →</span>
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ul>

        <SwipeControls swipe={swipe} />

        {/* The closing band: the two ways to build, split down the middle, then the closing line and the gold button. */}
        <div className={s.band}>
          <div className={s.window}>
            <p className={`mono ${s.ways}`}>{a.twoWays}</p>
            <div className={s.split}>
              {(['open', 'platforms'] as const).map((k) => (
                <div key={k} className={s.way}>
                  <h3 className={s.wayName}>{a[k].name}</h3>
                  <ul className={s.tools} aria-label={a[k].name}>
                    {aiTools[k].map((tool) => (
                      <li key={tool}>{tool}</li>
                    ))}
                  </ul>
                  <p className={s.wayText}>{a[k].text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={s.foot}>
            <p className={`d-only ${s.closer}`}>{a.closer}</p>
            <details className="m-only m-details">
              <summary>{t.ui.detailsShort}</summary>
              <p>{a.lede}</p>
              <p>{a.closer}</p>
            </details>
            <a className={`pill ${s.cta}`} data-solid data-size="lg" href={pathFor('home', locale, '#contact')}>
              {a.cta} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}

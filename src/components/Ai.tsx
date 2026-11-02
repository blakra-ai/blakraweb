import { aiTools, products } from '../content/shared'
import type { AiBlockId } from '../content/types'
import { useI18n } from '../i18n'
import { pathFor, workPath } from '../routes'
import { Section } from './Section'
import s from './Ai.module.css'

const ORDER: readonly AiBlockId[] = ['agents', 'documents', 'extraction', 'vision', 'training', 'evaluation']
const two = (n: number) => String(n).padStart(2, '0')

/**
 * 05 AI (run 2026-11-02-company-content, draft.md §1): it continues from the crown's caption. On
 * paper: the head, six capabilities on hairlines (3 × 2), then one ink window that holds the two
 * ways to build, open-source and platforms, with the models named as tools; the closing line and
 * the call to action under it. Proof links: Helya, Nuvoq (client work) and LIOXSA (our product).
 */
export function Ai() {
  const { t, locale } = useI18n()
  const a = t.ai
  const lioxsa = products.find((p) => p.id === 'skin')
  const proof: Partial<Record<AiBlockId, { href: string; label: string; external?: boolean }[]>> = {
    documents: [{ href: workPath('helya-ai', locale), label: 'Helya' }],
    vision: [
      { href: workPath('nuvoq-vision', locale), label: 'Nuvoq' },
      ...(lioxsa?.href ? [{ href: lioxsa.href, label: `${lioxsa.name} (${a.ourProduct})`, external: true }] : []),
    ],
  }
  return (
    <Section id="ai" beat="ai" surface="body" station={6} className={s.ai} aria-labelledby="ai-title">
      <div className={s.head}>
        <p className="eyebrow mono">
          {two(6)} / 10 &nbsp;·&nbsp; {a.eyebrow}
        </p>
        <h2 id="ai-title" className={`h2 ${s.title}`} data-focus tabIndex={-1}>
          {a.title}
        </h2>
        <p className={`lede ${s.lede}`}>{a.lede}</p>
      </div>

      <ul className={s.grid}>
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

      {/* The two ways to build: one ink window, split down the middle. */}
      <div className={`dark ${s.window}`}>
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
        <p className={s.closer}>{a.closer}</p>
        <a className={`pill ${s.cta}`} href={pathFor('home', locale, '#contact')}>
          {a.cta} <span aria-hidden="true">→</span>
        </a>
      </div>
    </Section>
  )
}

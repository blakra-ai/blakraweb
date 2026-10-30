import { useRef, type CSSProperties } from 'react'
import { chakraColors, chakraOf, products } from '../content/shared'
import { yantraPath } from '../features/navigator/yantra'
import { useI18n } from '../i18n'
import { useReveal } from '../motion/useReveal'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Products.module.css'

/**
 * The payload: our own product, in a sealed capsule with its spec plate. Riveted, labelled the
 * way a flight article is: name, stage, platforms, the layers it runs on, what is on offer.
 * "Demo under NDA" is the seal.
 */
export function Products() {
  const { t, locale } = useI18n()
  const p = t.products
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)

  return (
    <Section ref={ref} id="products" beat="payload" className={s.products} aria-labelledby="products-title">
      <div className={s.text}>
        <p className={s.eyebrow}>{p.eyebrow}</p>
        <h2 id="products-title" className={s.title} data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.lede}>{p.lede}</p>
        <p className={s.more}>{p.more}</p>
        <a className={s.investors} href={pathFor('investors', locale)}>
          {p.investorsLink}&nbsp;<span aria-hidden="true">→</span>
        </a>
      </div>

      <ul className={s.bay}>
        {products.map((prod) => {
          const copy = p.items[prod.id]
          const top = prod.layers.map((l) => chakraOf[l]).sort((a, b) => b - a)[0] ?? 6
          return (
            <li key={prod.id} className={s.capsule} data-capsule="" data-draft={import.meta.env.DEV && prod.draft ? '' : undefined} style={{ '--chakra': chakraColors[top] } as CSSProperties}>
              {/* The capsule's window: the product's highest layer, its yantra, behind glass. */}
              <div className={s.window} aria-hidden="true">
                <svg viewBox="-1.1 -1.1 2.2 2.2" className={s.yantra}>
                  <path d={yantraPath(top)} />
                  <circle r="0.075" />
                </svg>
                <span className={s.glass} />
              </div>
              <div className={s.plate}>
                <p className={s.stage} data-stage={prod.stage}>
                  {p.stage[prod.stage]}
                </p>
                <h3 className={s.name}>{prod.name}</h3>
                <p className={s.line}>{copy.line}</p>
                <p className={s.detail}>{copy.detail}</p>
                <dl className={s.facts}>
                  {prod.platforms.length > 0 && (
                    <div>
                      <dt>{p.platforms}</dt>
                      <dd>{prod.platforms.join(' · ')}</dd>
                    </div>
                  )}
                  <div>
                    <dt>{t.ui.usesEngine}</dt>
                    <dd className={s.layers}>
                      {prod.layers.map((l) => (
                        <a key={l} href={`#layer-${l}`} style={{ '--chakra': chakraColors[chakraOf[l]] } as CSSProperties}>
                          {t.engine.layers[l].name}
                        </a>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt>{p.offer}</dt>
                    <dd>{copy.offer}</dd>
                  </div>
                </dl>
                {prod.href && (
                  <a className={s.open} href={prod.href} rel="noopener" target="_blank">
                    {p.open} {prod.name}
                    <span className="sr-only"> ({t.ui.newTab})</span> →
                  </a>
                )}
              </div>
              <span className={s.rivets} aria-hidden="true" />
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

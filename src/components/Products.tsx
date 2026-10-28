import { useRef, type CSSProperties } from 'react'
import { chakraColors, chakraOf, products } from '../content/shared'
import { factAt } from '../features/experience/timeline'
import { useI18n } from '../i18n'
import { useActSteps } from '../motion/useActSteps'
import { pathFor } from '../routes'
import { Section } from './Section'
import s from './Products.module.css'

/** Each product's facts in the order they come into focus, numbered across the products. */
const facts = products.map((prod) => [...(prod.platforms.length > 0 ? ['platforms' as const] : []), 'layers' as const, 'offer' as const])
const moments = facts.flat().map((_, k) => factAt(k))

/**
 * Act VI of the film: inside the system. The jet fades and the camera looks down the spin axis:
 * the disk is a ring of light around the shadow, and in the shadow our product comes into focus,
 * drawn in light. Its facts come into focus here one at a time, as the picture settles.
 */
export function Products() {
  const { t, locale } = useI18n()
  const p = t.products
  const ref = useRef<HTMLElement>(null)
  const { passed } = useActSteps(ref, moments)
  // Held: a fact shows once the film has passed its moment. Otherwise every fact shows.
  const stateOf = (k: number) => (passed === null || k < passed ? 'on' : 'next')
  let k = 0

  return (
    <Section ref={ref} id="products" beat="product" className={s.products} aria-labelledby="products-title">
      <div className={s.pin} data-pin>
        <div className={s.text}>
          <p className={s.eyebrow}>{p.eyebrow}</p>
          <h2 id="products-title" className={s.title} data-focus tabIndex={-1}>
            {p.title}
          </h2>
          <p className={s.lede}>{p.lede}</p>

          {products.map((prod, i) => {
            const copy = p.items[prod.id]
            return (
              <article key={prod.id} className={s.product} data-draft={import.meta.env.DEV && prod.draft ? '' : undefined} aria-labelledby={`product-${prod.id}`}>
                <p className={s.stage} data-stage={prod.stage}>
                  {p.stage[prod.stage]}
                </p>
                <h3 id={`product-${prod.id}`} className={s.name}>
                  {prod.name}
                </h3>
                <p className={s.line}>{copy.line}</p>
                <p className={s.detail}>{copy.detail}</p>
                <dl className={s.facts}>
                  {facts[i].map((fact) => {
                    const state = stateOf(k++)
                    return (
                      <div key={fact} className={s.fact} data-state={state}>
                        <dt>{fact === 'platforms' ? p.platforms : fact === 'layers' ? t.ui.usesEngine : p.offer}</dt>
                        <dd>
                          {fact === 'platforms' && prod.platforms.join(' · ')}
                          {fact === 'layers' &&
                            prod.layers.map((l) => (
                              <a key={l} href={`#layer-${l}`} style={{ '--chakra': chakraColors[chakraOf[l]] } as CSSProperties}>
                                {t.engine.layers[l].name}
                              </a>
                            ))}
                          {fact === 'offer' && copy.offer}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
                {prod.href && (
                  <a className={s.open} href={prod.href} rel="noopener" target="_blank">
                    {p.open} {prod.name}
                    <span className="sr-only"> ({t.ui.newTab})</span> →
                  </a>
                )}
              </article>
            )
          })}

          <div className={s.more}>
            <p>{p.more}</p>
            <a className={s.investors} href={pathFor('investors', locale)}>
              {p.investorsLink}&nbsp;<span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}

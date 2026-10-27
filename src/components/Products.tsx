import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { hourAccents, products, times } from '../content/shared'
import type { ProductId } from '../content/types'
import { useI18n } from '../i18n'
import { poses, type Pose } from '../motion/engine3d/stage'
import { useReveals } from '../motion/useReveals'
import { useStage } from '../motion/useStage'
import { pathFor } from '../routes'
import { ProductPreview } from './ProductPreview'
import { Section } from './Section'
import s from './Products.module.css'

const accentOf: Record<ProductId, string> = { skin: hourAccents.dawn }

/** The jet: products BLAKRA builds on its own, carried outward along the same axis. */
export function Products() {
  const { t, locale } = useI18n()
  const p = t.products
  const ref = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  const [alive, setAlive] = useState(false)
  useReveals(ref)
  useStage(ref, { pose: poses.jets as Pose }, times.products)

  // Previews move only while the grid is on screen.
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setAlive(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Section ref={ref} id="products" sky="night" time={[times.products, times.products]} className={s.products} aria-labelledby="products-title">
      <header className={s.head}>
        <p className={s.eyebrow} data-reveal>
          {p.eyebrow}
        </p>
        <h2 id="products-title" className={s.title} data-reveal data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.lede} data-reveal>
          {p.lede}
        </p>
      </header>

      <ul ref={gridRef} className={s.grid} data-alive={alive ? '' : undefined}>
        {products.map((prod) => {
          const copy = p.items[prod.id]
          return (
            <li key={prod.id} className={s.card} style={{ '--accent': accentOf[prod.id] } as CSSProperties} data-reveal data-draft={import.meta.env.DEV && prod.draft ? '' : undefined}>
              <div className={s.visual}>
                <ProductPreview id={prod.id} />
                <span className={s.stage} data-stage={prod.stage}>
                  {p.stage[prod.stage]}
                </span>
              </div>
              <div className={s.body}>
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
                    <dd>{prod.layers.map((l) => t.engine.layers[l].name).join(' · ')}</dd>
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
            </li>
          )
        })}
        <li className={s.more} data-reveal>
          <p>{p.more}</p>
          <a className={s.investors} href={pathFor('investors', locale)}>
            {p.investorsLink}&nbsp;<span aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
    </Section>
  )
}

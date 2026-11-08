import { shotUrl, work } from '../content/work'
import { useI18n } from '../i18n'
import { pathFor, workPath } from '../routes'
import { Section } from './Section'
import { useSwipe } from '../mobile/swipe'
import { SwipeControls } from '../mobile/SwipeControls'
import s from './Work.module.css'

const two = (n: number) => String(n).padStart(2, '0')

/**
 * 09 Selected client work (run 2026-11-02-portfolio): a grid of project cards on the paper, each an
 * ink window holding one representative screen, then the category and the name. Every card opens
 * the project's own page. The private-client note sits under the head, once. The first card is
 * wide on desktop, so the grid closes without an empty slot. The closing line names further
 * industries, and the call to action follows it.
 */
export function Work() {
  const { t, locale } = useI18n()
  const w = t.work
  const swipe = useSwipe<HTMLUListElement>()
  const { list } = swipe
  return (
    <Section id="work" beat="proof" surface="body" station={9} className={s.work} aria-labelledby="work-title">
      <div className={s.head}>
        <div className={s.headMain}>
          <p className="eyebrow mono">
            {two(9)} / 10 &nbsp;·&nbsp; {w.eyebrow}
          </p>
          <h2 id="work-title" className={`h2 ${s.title}`} data-focus tabIndex={-1}>
            {w.title}
          </h2>
        </div>
        <div className={s.headSide}>
          <p className={`d-only lede ${s.lede}`}>{w.lede}</p>
          <p className={s.note}>{w.note}</p>
        </div>
      </div>
      <ul ref={list} className={`m-swipe ${s.grid}`} aria-label={w.title} aria-roledescription="carousel">
        {work.map((p, n) => {
          const shot = p.shots[0]
          const tx = w.projects[p.slug]
          // The wide first card shows its run of phones side by side.
          const row = n === 0 && shot.frame === 'phone' ? p.shots.filter((x) => x.frame === 'phone') : [shot]
          return (
            <li key={p.slug} id={`work-${p.slug}`} className={s.item} tabIndex={-1}>
              <a className={s.card} href={workPath(p.slug, locale)}>
                <span className={`dark ${s.window}`} data-frame={shot.frame} data-row={row.length > 1 || undefined}>
                  {row.map((x, k) => (
                    <img key={x.file} src={shotUrl(p.slug, x.file)} width={x.width} height={x.height} alt={tx.shots[k]} loading="lazy" decoding="async" data-k={k} />
                  ))}
                </span>
                <span className={`mono ${s.cat}`}>{tx.category}</span>
                <span className={`h3 ${s.name}`}>{p.name}</span>
                <span className={s.line}>{tx.line}</span>
              </a>
            </li>
          )
        })}
      </ul>
      <SwipeControls swipe={swipe} />
      <div className={s.closing}>
        <p className={s.also}>{w.also}</p>
        <a className="pill" data-primary data-size="lg" href={`${pathFor('home', locale)}#contact`}>
          {t.ui.cta} <span aria-hidden="true">→</span>
        </a>
      </div>
    </Section>
  )
}

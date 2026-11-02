import { shotUrl, work } from '../content/work'
import { useI18n } from '../i18n'
import { pathFor, workPath } from '../routes'
import { Section } from './Section'
import s from './Work.module.css'

const two = (n: number) => String(n).padStart(2, '0')

/**
 * 05 Selected client work (run 2026-11-02-portfolio): a grid of project cards on the paper, each an
 * ink window holding one representative screen, then the category and the name. Every card opens
 * the project's own page. The private-client note sits under the head, once. The first card is
 * wide on desktop, so the grid closes without an empty slot. 06 "How we work" closes the screen.
 */
export function Work() {
  const { t, locale } = useI18n()
  const w = t.work
  return (
    <Section id="work" beat="proof" surface="body" station={5} className={s.work} aria-labelledby="work-title">
      <div className={s.head}>
        <p className="eyebrow mono">
          {two(5)} / 09 &nbsp;·&nbsp; {w.eyebrow}
        </p>
        <h2 id="work-title" className={`h2 ${s.title}`} data-focus tabIndex={-1}>
          {w.title}
        </h2>
        <p className={`lede ${s.lede}`}>{w.lede}</p>
        <p className={s.note}>{w.note}</p>
      </div>
      <ul className={s.grid}>
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

      {/* 06 How we work: the strip that closes the screen. */}
      <div className={s.process} id="approach" data-station={6}>
        <div>
          <p className="eyebrow mono">
            {two(6)} / 09 &nbsp;·&nbsp; {t.process.eyebrow}
          </p>
          <h3 id="process-title" className={`h3 ${s.processTitle}`} data-focus tabIndex={-1}>
            {t.process.title}
          </h3>
        </div>
        <ol className={s.steps}>
          {t.process.steps.map((st) => (
            <li key={st.name}>
              <b>{st.name}</b>
              <span>{st.text}</span>
            </li>
          ))}
        </ol>
        <p className="sr-only">
          <a href={`${pathFor('home', locale)}#contact`}>{t.ui.cta}</a>
        </p>
      </div>
    </Section>
  )
}

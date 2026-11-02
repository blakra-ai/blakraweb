import { shotUrl, work, type WorkProject, type WorkShot } from '../content/work'
import { useI18n } from '../i18n'
import { Section } from '../components/Section'
import { pathFor, workPath } from '../routes'
import s from './WorkPage.module.css'

/** Screens in page order: a run of phones shares one window; each browser has its own. */
function groups(shots: WorkShot[]) {
  const out: { frame: WorkShot['frame']; items: { shot: WorkShot; i: number }[] }[] = []
  shots.forEach((shot, i) => {
    const last = out[out.length - 1]
    if (shot.frame === 'phone' && last?.frame === 'phone') last.items.push({ shot, i })
    else out.push({ frame: shot.frame, items: [{ shot, i }] })
  })
  return out
}

function Screens({ project, from, to }: { project: WorkProject; from: number; to: number }) {
  const { t } = useI18n()
  const captions = t.work.projects[project.slug].shots
  return (
    <>
      {groups(project.shots)
        .filter((g) => g.items[0].i >= from && g.items[0].i < to)
        .map((g) => (
          // A run of phones may scroll sideways on a phone: focusable so the keyboard can scroll it too.
          <div
            key={g.items[0].i}
            className={`dark ${s.window}`}
            data-frame={g.frame}
            {...(g.items.length > 1 ? { tabIndex: 0, role: 'group', 'aria-label': `${project.name} · ${t.work.screens}` } : {})}
          >
            {g.items.map(({ shot, i }) => (
              <figure key={shot.file} className={s.shot}>
                <img
                  src={shotUrl(project.slug, shot.file)}
                  width={shot.width}
                  height={shot.height}
                  alt={captions[i]}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : undefined}
                  decoding="async"
                />
                <figcaption className={s.caption} aria-hidden="true">
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span> {captions[i]}
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
    </>
  )
}

/** One project of the selected client work: its screens large, the problem, the decisions, the next project. */
export function WorkPage({ slug }: { slug: string }) {
  const { t, locale } = useI18n()
  const w = t.work
  const index = work.findIndex((p) => p.slug === slug)
  const project = work[index]
  const tx = w.projects[project.slug]
  const next = work[(index + 1) % work.length]
  // The first window opens the page; the rest of the screens follow the decisions.
  const firstGroupEnd = groups(project.shots)[0].items.length

  return (
    <Section className={s.page} surface="body" aria-labelledby="page-title">
      <p className={s.back}>
        <a className="mono" href={`${pathFor('home', locale)}#work`}>
          <span aria-hidden="true">← </span>
          {w.all}
        </a>
      </p>

      <header className={s.head}>
        <p className="eyebrow mono">{tx.category}</p>
        <h1 id="page-title" className={`h2 ${s.title}`}>
          {project.name}
        </h1>
        <p className={`lede ${s.lede}`}>{tx.line}</p>
      </header>

      <dl className={s.facts}>
        <div>
          <dt className="mono">{w.platforms}</dt>
          <dd>{tx.platforms}</dd>
        </div>
        <div>
          <dt className="mono">{w.engagement}</dt>
          <dd>{w.note}</dd>
        </div>
      </dl>

      <section className={s.screens} aria-label={w.screens}>
        <Screens project={project} from={0} to={firstGroupEnd} />
      </section>

      <div className={s.body}>
        <p className={s.about}>{tx.about}</p>
        <section className={s.block} aria-labelledby="problem">
          <h2 id="problem" className={`mono ${s.label}`}>
            {w.problem}
          </h2>
          <p className={s.text}>{tx.problem}</p>
        </section>
        <section className={s.block} aria-labelledby="design">
          <h2 id="design" className={`mono ${s.label}`}>
            {w.design}
          </h2>
          <ol className={s.points}>
            {tx.design.map((d, k) => (
              <li key={k}>
                <span className="mono" aria-hidden="true">
                  {String(k + 1).padStart(2, '0')}
                </span>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {project.shots.length > firstGroupEnd && (
        <section className={s.screens} aria-label={w.screens}>
          <Screens project={project} from={firstGroupEnd} to={project.shots.length} />
        </section>
      )}

      <nav className={s.next} aria-label={w.next}>
        <a href={workPath(next.slug, locale)}>
          <span className="mono">{w.next} →</span>
          <span className={`h2 ${s.nextName}`}>{next.name}</span>
          <span className={s.nextLine}>{w.projects[next.slug].line}</span>
        </a>
      </nav>
    </Section>
  )
}

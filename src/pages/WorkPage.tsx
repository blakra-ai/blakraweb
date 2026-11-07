import type { CSSProperties } from 'react'
import { shotUrl, work, type WorkProject, type WorkShot, type WorkSlug } from '../content/work'
import { useI18n } from '../i18n'
import { Section } from '../components/Section'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useSwipe } from '../mobile/swipe'
import { pathFor, workPath } from '../routes'
import { Closing, Ring, two } from './Inner'
import i from './Inner.module.css'
import s from './WorkPage.module.css'

type Kind = 'phones' | 'browser' | 'mixed'

const kindOf = (p: WorkProject): Kind => (p.shots.every((x) => x.frame === 'phone') ? 'phones' : p.shots.every((x) => x.frame === 'browser') ? 'browser' : 'mixed')

/** One screen as an image; `alt` empty where it repeats a screen described elsewhere on the page. */
function Shot({ slug, shot, alt = '', eager, priority, className }: { slug: WorkSlug; shot: WorkShot; alt?: string; eager?: boolean; priority?: boolean; className?: string }) {
  return (
    <img
      className={className}
      data-frame={shot.frame}
      src={shotUrl(slug, shot.file)}
      width={shot.width}
      height={shot.height}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  )
}

function Caption({ n, text }: { n: number; text: string }) {
  return (
    // The image's alt already says this: hidden from the accessibility tree, so it is not read twice.
    <figcaption className={s.caption} aria-hidden="true">
      <span className="mono">{two(n)}</span> {text}
    </figcaption>
  )
}

/** The hero's screens: three phones fanned round the ring, or the browser large with the ring rising behind it. */
function HeroScreens({ project, kind }: { project: WorkProject; kind: Kind }) {
  const { t } = useI18n()
  const captions = t.work.projects[project.slug].shots
  const { list } = useSwipe<HTMLDivElement>()
  if (kind === 'phones') {
    const [front, ...rest] = project.shots
    return (
      <div className={s.fan}>
        <Ring className={s.fanRing} />
        {rest.map((shot, k) => (
          <Shot key={shot.file} slug={project.slug} shot={shot} eager className={k === 0 ? s.backL : s.backR} />
        ))}
        <Shot slug={project.slug} shot={front} eager priority className={s.front} />
      </div>
    )
  }
  const phone = project.shots.find((x) => x.frame === 'phone')
  return (
    <figure className={s.lead}>
      <Ring className={s.leadRing} />
      {/* On a phone the screen stays readable and pans sideways; focusable there so the keyboard can pan it too. */}
      <div ref={list} className={s.pan} role="group" aria-label={`${project.name} · ${t.work.screens}`}>
        <Shot slug={project.slug} shot={project.shots[0]} alt={captions[0]} eager priority className={s.browser} />
        {phone && <Shot slug={project.slug} shot={phone} eager className={s.over} />}
      </div>
      <Caption n={1} text={captions[0]} />
    </figure>
  )
}

/**
 * Where a detail plate looks into a browser screen, as fractions of that screen: the left edge and
 * top edge of the region, and how much of the screen's width it spans. Art direction, so a project
 * with one screen still gets a closer second and third look at it. The plates' shapes are fixed (CSS).
 */
interface Crop {
  x: number
  y: number
  span: number
}
/** Width over height of the plates, in the CSS: a pair's large and small plate, and the one beside a phone. */
const PAIR = [7 / 5, 1]
const BESIDE = 4 / 3
const crops: Partial<Record<WorkSlug, Crop[]>> = {
  'vitrin-console': [{ x: 0.17, y: 0.19, span: 0.65 }, { x: 0.57, y: 0.38, span: 0.42 }],
  'flowline-automation': [{ x: 0.19, y: 0.27, span: 0.58 }, { x: 0.635, y: 0.3, span: 0.36 }],
  'helya-ai': [{ x: 0.175, y: 0.27, span: 0.6 }, { x: 0.64, y: 0.27, span: 0.36 }],
  'nuvoq-vision': [{ x: 0.17, y: 0.43, span: 0.53 }, { x: 0.64, y: 0.44, span: 0.36 }],
  'tiravan-logistics': [{ x: 0.17, y: 0.41, span: 0.53 }],
  'raah-learning': [{ x: 0.17, y: 0.28, span: 0.63 }],
}

function Plate({ slug, shot, crop, ratio }: { slug: WorkSlug; shot: WorkShot; crop: Crop; ratio: number }) {
  const zoom = 1 / crop.span
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`
  const style = { '--w': pct(zoom), '--x': pct(-crop.x * zoom), '--y': pct(-crop.y * zoom * (shot.height / shot.width) * ratio) } as CSSProperties
  return (
    <div className={s.plate} style={style}>
      <Shot slug={slug} shot={shot} />
    </div>
  )
}

/** The ink band after the decisions: every phone with its caption; a browser screen as details cut from it, never an empty band. */
function Band({ project, kind }: { project: WorkProject; kind: Kind }) {
  const { t } = useI18n()
  const w = t.work
  const captions = w.projects[project.slug].shots
  const { list, count } = useSwipe<HTMLUListElement>()
  const browser = project.shots[0]
  const phoneIndex = project.shots.findIndex((x) => x.frame === 'phone')
  return (
    <div className={s.bandWrap}>
      <section className={`dark ${i.window} ${s.band}`} data-kind={kind} aria-labelledby="screens">
        <h2 id="screens" className={`eyebrow mono ${s.bandTitle}`}>
          {w.screens}
        </h2>
        {kind === 'phones' && (
          <>
            <ul ref={list} className={`m-swipe ${s.trio}`} aria-label={`${project.name} · ${w.screens}`} aria-roledescription="carousel">
              {project.shots.map((shot, k) => (
                <li key={shot.file}>
                  <figure className={s.shot}>
                    <Shot slug={project.slug} shot={shot} alt={captions[k]} />
                    <Caption n={k + 1} text={captions[k]} />
                  </figure>
                </li>
              ))}
            </ul>
            <p ref={count} className="m-only m-count" aria-hidden="true" />
          </>
        )}
        {kind === 'browser' && (
          <div className={s.pair}>
            {(crops[project.slug] ?? []).map((crop, k) => (
              <Plate key={crop.x} slug={project.slug} shot={browser} crop={crop} ratio={PAIR[k]} />
            ))}
          </div>
        )}
        {kind === 'mixed' && (
          <div className={s.duo}>
            {(crops[project.slug] ?? []).map((crop) => (
              <Plate key={crop.x} slug={project.slug} shot={browser} crop={crop} ratio={BESIDE} />
            ))}
            <figure className={s.shot}>
              <Shot slug={project.slug} shot={project.shots[phoneIndex]} alt={captions[phoneIndex]} />
              <Caption n={phoneIndex + 1} text={captions[phoneIndex]} />
            </figure>
          </div>
        )}
      </section>
    </div>
  )
}

/** A project to go to next: its first screen in an ink window, as on the home page's cards. */
function NavCard({ project, rel, label }: { project: WorkProject; rel: 'prev' | 'next'; label: string }) {
  const { t, locale } = useI18n()
  const tx = t.work.projects[project.slug]
  return (
    <a className={s.card} data-rel={rel} href={workPath(project.slug, locale)} rel={rel}>
      <span className={`dark ${s.cardWindow}`}>
        <Shot slug={project.slug} shot={project.shots[0]} />
      </span>
      <span className={`mono ${s.cardLabel}`}>{label}</span>
      <span className={`h3 ${s.cardName}`}>{project.name}</span>
      <span className={s.cardLine}>{tx.line}</span>
    </a>
  )
}

/** Projects whose page also links to the AI section. */
const aiProjects = new Set<WorkSlug>(['helya-ai', 'nuvoq-vision'])

/**
 * One project of the selected client work, the proof page a buyer reads: an ink hero with its screens
 * large and the private-client note as a mark of discretion; on paper the statement, the problem and
 * the decisions; an ink band of screens; the projects either side; the next step.
 */
export function WorkPage({ slug }: { slug: string }) {
  const { t, locale } = useI18n()
  const w = t.work
  const index = work.findIndex((p) => p.slug === slug)
  const project = work[index]
  const tx = w.projects[project.slug]
  const next = work[(index + 1) % work.length]
  const prev = work[(index - 1 + work.length) % work.length]
  const kind = kindOf(project)

  return (
    <Section className={i.page} surface="body" aria-labelledby="page-title">
      <header className={`dark ${i.window} ${s.hero}`} data-kind={kind}>
        <div className={s.top}>
          <Breadcrumbs id="work" slug={project.slug} />
          <p className={`mono ${s.count}`} aria-hidden="true">
            {two(index + 1)} / {two(work.length)}
          </p>
        </div>
        <div className={s.words}>
          <p className="eyebrow mono">{tx.category}</p>
          <h1 id="page-title" className={`h1 ${s.title}`}>
            {project.name}
          </h1>
          <p className={`lede ${s.lede}`}>{tx.line}</p>
        </div>
        <dl className={s.facts}>
          <div className={s.fact}>
            <dt className="mono">{w.platforms}</dt>
            <dd>{tx.platforms}</dd>
          </div>
          {/* The note as a hallmark, not small print: a sealed ring, the words in the serif. */}
          <div className={s.seal}>
            <dt className="mono">{w.engagement}</dt>
            <dd>{w.note}</dd>
          </div>
        </dl>
        <HeroScreens project={project} kind={kind} />
      </header>

      <div className={`${i.paper} ${s.story}`}>
        <p className={s.about}>{tx.about}</p>
        <section className={s.block} aria-labelledby="problem">
          <h2 id="problem" className={`h2 ${s.h}`}>
            {w.problem}
          </h2>
          <p className={s.text}>{tx.problem}</p>
        </section>
        <section className={s.block} aria-labelledby="design">
          <h2 id="design" className={`h2 ${s.h}`}>
            {w.design}
          </h2>
          <ol className={s.points}>
            {tx.design.map((d, k) => (
              <li key={k}>
                <span className="mono" aria-hidden="true">
                  {two(k + 1)}
                </span>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Band project={project} kind={kind} />

      <nav className={`${i.paper} ${s.nav}`} aria-label={w.all}>
        <NavCard project={prev} rel="prev" label={`← ${w.projects[prev.slug].category}`} />
        <NavCard project={next} rel="next" label={`${w.next} →`} />
        <a className={`mono ${s.all}`} href={pathFor('home', locale, '#work')}>
          {w.all}
        </a>
      </nav>

      <Closing
        eyebrow={t.contact.eyebrow}
        title={t.contact.title}
        cta={t.ui.cta}
        href={pathFor('home', locale, '#contact')}
        aside={
          <>
            <a className={i.link} href={pathFor('about', locale, '#about-engage')}>
              {w.engageLink}
            </a>
            {aiProjects.has(project.slug) && (
              <a className={i.link} href={pathFor('home', locale, '#ai')}>
                {w.aiLink}
              </a>
            )}
          </>
        }
      />
    </Section>
  )
}

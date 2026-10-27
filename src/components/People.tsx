import { useRef } from 'react'
import { people, times, type PersonFacts } from '../content/shared'
import { useI18n } from '../i18n'
import { useReveals } from '../motion/useReveals'
import { useStage } from '../motion/useStage'
import { poses, type Pose } from '../motion/engine3d/stage'
import { rand } from '../scenes/shared'
import { Section } from './Section'
import s from './People.module.css'

/**
 * A drawn portrait until a photo is added: the person as a point of light on the closest
 * orbit around a dark core, each at their own place on the ring. Same language as the
 * stage, unique per person, and honest: it never pretends to be a face.
 */
function Portrait({ person, index }: { person: PersonFacts; index: number }) {
  if (person.photo) return <img className={s.photo} src={person.photo} alt="" width={480} height={600} loading="lazy" decoding="async" />
  const seed = [...person.name].reduce((a, c) => a + c.charCodeAt(0), 0)
  const angle = -0.6 + index * 2.1 + rand(seed, 3) * 0.5
  const x = 200 + Math.cos(angle) * 128
  const y = 250 + Math.sin(angle) * 34
  // The trail runs behind the light along the orbit.
  const trail = Array.from({ length: 24 }, (_, i) => {
    const a = angle - (i + 1) * 0.07
    return { x: 200 + Math.cos(a) * 128, y: 250 + Math.sin(a) * 34, o: (1 - i / 24) * 0.55 }
  })
  return (
    <svg viewBox="0 0 400 500" className={s.portrait} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`glow-${person.id}`}>
          <stop offset="0" stopColor="#fff4e4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff4e4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={400} height={500} className={s.pSky} />
      <ellipse cx={200} cy={250} rx={128} ry={34} className={s.pOrbit} />
      <circle cx={200} cy={250} r={62} className={s.pCore} />
      <circle cx={200} cy={250} r={64.5} className={s.pRing} />
      {trail.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.2 - i * 0.07} className={s.pTrail} style={{ opacity: p.o }} />
      ))}
      <circle cx={x} cy={y} r={26} fill={`url(#glow-${person.id})`} />
      <circle cx={x} cy={y} r={4.2} className={s.pLight} />
      <path d="M1 500V200a199 199 0 0 1 398 0v300" className={s.pFrame} />
    </svg>
  )
}

export function People() {
  const { t } = useI18n()
  const p = t.people
  const ref = useRef<HTMLElement>(null)
  useReveals(ref)
  // The photon ring: three lights on the closest orbit, nothing between them and the core.
  useStage(ref, { pose: poses.photon as Pose }, times.people)
  return (
    <Section ref={ref} id="people" sky="predawn" time={[times.people, times.people + 30]} className={s.people} aria-labelledby="people-title">
      <header className={s.head}>
        <p className={s.eyebrow} data-reveal>
          {p.eyebrow}
        </p>
        <h2 id="people-title" className={s.title} data-reveal data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.lede} data-reveal>
          {p.lede}
        </p>
      </header>
      <ul className={s.list}>
        {people.map((person, i) => (
          <li key={person.id} className={s.person} data-reveal>
            <Portrait person={person} index={i} />
            <div className={s.body}>
              <h3 className={s.name}>
                {person.name}
                {person.known && <span className={s.known}> · {person.known}</span>}
              </h3>
              <p className={s.role}>{p.roles[i].role}</p>
              <p className={s.owns}>{p.roles[i].owns}</p>
              <p className={s.ask}>{p.roles[i].ask}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className={s.bench} data-reveal>
        {p.bench}
      </p>
    </Section>
  )
}

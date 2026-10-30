import { useRef, type CSSProperties } from 'react'
import { people } from '../content/shared'
import { yantraPath } from '../features/navigator/yantra'
import { useI18n } from '../i18n'
import { useReveal } from '../motion/useReveal'
import { Section } from './Section'
import s from './People.module.css'

/** Each principal's badge carries the yantra of the layer they answer for first. */
const BADGE = [6, 0, 3]

/**
 * The crew: the people you meet are the people who build. Three crew badges, fanned as a hand
 * of cards: a real name, the role, what they own, and what to ask them. A photo takes the
 * badge's window when one is added; until then, the badge shows the yantra of their layer.
 */
export function People() {
  const { t } = useI18n()
  const p = t.people
  const ref = useRef<HTMLElement>(null)
  useReveal(ref)

  return (
    <Section ref={ref} id="people" beat="crew" className={s.people} aria-labelledby="people-title">
      <div className={s.head}>
        <p className={s.eyebrow}>{p.eyebrow}</p>
        <h2 id="people-title" className={s.title} data-focus tabIndex={-1}>
          {p.title}
        </h2>
        <p className={s.lede}>{p.lede}</p>
      </div>
      <ul className={s.fan}>
        {people.map((person, i) => (
          <li key={person.id} className={s.badge} style={{ '--i': i } as CSSProperties}>
            <div className={s.window} aria-hidden="true">
              {person.photo ? (
                <img className={s.photo} src={person.photo} alt="" width={480} height={600} loading="lazy" decoding="async" />
              ) : (
                <svg viewBox="-1.1 -1.1 2.2 2.2" className={s.yantra}>
                  <path d={yantraPath(BADGE[i] ?? 6)} />
                  <circle r="0.075" />
                </svg>
              )}
            </div>
            <div className={s.body}>
              <p className={s.crewNo}>
                BLAKRA · {String(i + 1).padStart(2, '0')}
              </p>
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
      <p className={s.bench}>{p.bench}</p>
    </Section>
  )
}

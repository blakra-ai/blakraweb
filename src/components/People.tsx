import { useRef } from 'react'
import { people } from '../content/shared'
import { film } from '../features/experience/state'
import { bodyAt } from '../features/experience/timeline'
import { useI18n } from '../i18n'
import { useActSteps } from '../motion/useActSteps'
import { Section } from './Section'
import s from './People.module.css'

const moments = people.map((_, k) => bodyAt(k))

/**
 * Act VI of the film: the people. Three equal bodies, the three principals, arrive one at a time
 * on a spiral onto the process's orbit and share it, a third of a turn apart; each one's card is
 * printed here as its body arrives.
 * Pointing at one brings its body forward in the picture (a decorative echo: nothing depends on it).
 */
export function People() {
  const { t } = useI18n()
  const p = t.people
  const ref = useRef<HTMLElement>(null)
  const { passed } = useActSteps(ref, moments)
  const meet = (i: number) => (film.person = i)
  const leave = () => (film.person = -1)

  return (
    <Section ref={ref} id="people" beat="people" className={s.people} aria-labelledby="people-title">
      <div className={s.pin} data-pin>
        <div className={s.text}>
          <p className={s.eyebrow}>{p.eyebrow}</p>
          <h2 id="people-title" className={s.title} data-focus tabIndex={-1}>
            {p.title}
          </h2>
          <p className={s.lede}>{p.lede}</p>
          <ul className={s.list}>
            {people.map((person, i) => (
              <li
                key={person.id}
                className={s.person}
                data-state={passed === null || i < passed ? 'on' : 'next'}
                onPointerEnter={() => meet(i)}
                onPointerLeave={leave}
              >
                {person.photo ? <img className={s.photo} src={person.photo} alt="" width={96} height={96} loading="lazy" decoding="async" /> : <span className={s.body} aria-hidden="true" />}
                <div className={s.card}>
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
        </div>
      </div>
    </Section>
  )
}

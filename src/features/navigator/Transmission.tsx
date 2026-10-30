import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import { gsap } from '../../motion/gsap'
import { getPulse, type PulseChoice } from '../../motion/pulse'
import { nav, type Beat } from './state'

const ORDER: Beat[] = ['hero', 'manifesto', 'mission', 'systems', 'proof', 'checklist', 'payload', 'crew', 'contact']
/** Characters a second, as a quick typist. */
const CPS = 34

/**
 * The Navigator types. For each section he has one line, in the first person; when the reader
 * chooses a mission he answers it. The line arrives on a transmission card (under his dock;
 * beside him in the hero), typed out character by character with a caret, and his comms rings
 * pulse while he types. The full line is in the HTML for assistive tech, in the page's language.
 */
export default function Transmission() {
  const { t } = useI18n()
  const [beat, setBeat] = useState<Beat>('hero')
  const [choice, setChoice] = useState<PulseChoice>(getPulse().choice)
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const shown = useRef<{ beat: Beat; choice: PulseChoice }>({ beat: 'hero', choice: getPulse().choice })
  const timer = useRef(0)
  const typed = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLElement>(null)
  const typing = useRef({ line: '', from: -1, done: true })

  const v = t.navigator
  const index = ORDER.indexOf(beat)
  let line = v.lines[beat]
  if (beat === 'mission' && choice) {
    const n = nav.mission?.layers.length ?? 7
    line = choice === 'all' ? v.missionAll : v.mission.replace('{tag}', t.pulse.needs[choice].tag).replace('{n}', String(n))
  }

  // A new line starts typing from its first character (or shows whole, in still mode).
  useEffect(() => {
    typing.current = { line, from: nav.clock, done: nav.still }
    nav.spokeAt = nav.clock
    nav.typingUntil = nav.still ? nav.clock : nav.clock + line.length / CPS
    if (typed.current) typed.current.textContent = nav.still ? line : ''
  }, [line])

  useEffect(() => {
    const tick = () => {
      // Type the current line.
      const ty = typing.current
      if (!ty.done && typed.current) {
        const n = Math.min(ty.line.length, Math.floor((nav.clock - ty.from) * CPS))
        typed.current.textContent = ty.line.slice(0, n)
        if (n >= ty.line.length) ty.done = true
        card.current?.setAttribute('data-typing', ty.done ? 'false' : 'true')
      }
      // Watch the director's beat; when the line should change, wipe out, swap, wipe in.
      const want = { beat: nav.beat, choice: nav.mission?.id ?? null }
      const cur = shown.current
      if (want.beat === cur.beat && want.choice === cur.choice) return
      // A mission choice matters only while its question is on screen.
      if (want.beat === cur.beat && want.beat !== 'mission') {
        shown.current = want
        return
      }
      shown.current = want
      window.clearTimeout(timer.current)
      if (nav.still) {
        setBeat(want.beat)
        setChoice(want.choice)
        return
      }
      setPhase('out')
      timer.current = window.setTimeout(() => {
        setBeat(want.beat)
        setChoice(want.choice)
        setPhase('in')
      }, 260)
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      window.clearTimeout(timer.current)
    }
  }, [])

  return createPortal(
    <aside ref={card} className="nav-type" data-phase={phase} data-beat={beat} data-typing="false" role="status" aria-live="polite">
      <p className="nav-type-head">
        <span className="nav-type-dot" aria-hidden="true" />
        {v.name} · 0{index + 1}
      </p>
      <p className="nav-type-line">
        <span ref={typed} className="nav-type-typed" aria-hidden="true" />
        <span className="sr-only">{line}</span>
      </p>
    </aside>,
    document.body,
  )
}

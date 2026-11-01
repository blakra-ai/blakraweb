import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'
import { gsap } from '../../motion/gsap'
import { getPulse, type PulseChoice } from '../../motion/pulse'
import { CARD_MARGIN, CARD_REST, nearestEdge, placeCard, type CardEdge, type CardMode } from './speech'
import { nav, type Beat } from './state'

const ORDER: Beat[] = ['hero', 'manifesto', 'mission', 'systems', 'proof', 'checklist', 'payload', 'crew', 'contact']
/** Characters a second, as a quick typist. */
const CPS = 34
/** Under this width the card runs full width under the header. */
const PHONE_W = 768
/** The cursor is "on her eyes" within this share of her head's height from their midpoint. */
const EYE_R = 0.22
/** Clear space between the card and what it must not cover (her head, the header, the form). */
const GAP = 12

/** The header's bottom edge in CSS px (read once per viewport size, so nothing is measured per frame). */
let headerBottom = 72
let headerFor = ''
function measureHeader() {
  const key = `${window.innerWidth}x${window.innerHeight}`
  if (headerFor === key) return headerBottom
  headerFor = key
  // The header renders as `display: contents` with a fixed bar inside, so its height comes from the token.
  const root = document.documentElement
  const raw = getComputedStyle(root).getPropertyValue('--header-h').trim()
  const n = parseFloat(raw)
  if (Number.isFinite(n)) headerBottom = raw.endsWith('rem') ? n * (parseFloat(getComputedStyle(root).fontSize) || 16) : n
  return headerBottom
}

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/**
 * Where the card may not go (design review P0-3): never over her head box, the header or a form
 * field. Takes placeCard's place and moves it; the tail is re-aimed from the edge nearest the mouth.
 */
function keepClear(place: { x: number; y: number }, mouth: { x: number; y: number }, card: { w: number; h: number }, mode: CardMode): { x: number; y: number; tail: number; edge: CardEdge } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxX = Math.max(CARD_MARGIN, vw - CARD_MARGIN - card.w)
  const maxY = Math.max(CARD_MARGIN, vh - CARD_MARGIN - card.h)
  const clampX = (x: number) => Math.min(Math.max(x, CARD_MARGIN), maxX)
  const clampY = (y: number) => Math.min(Math.max(y, CARD_MARGIN), maxY)
  let { x, y } = place
  const top = measureHeader()
  if (mode === 'dock') {
    // The right gutter, directly below the header: never under its bar.
    x = maxX
    y = clampY(top + GAP)
  } else if (mode === 'hero') {
    // Never over her head: right of it, else left of it, else below it.
    const a = nav.anchor
    const head = { x: a.eyes.x - a.headPx, y: a.eyes.y - a.headPx, w: 2 * a.headPx, h: 2 * a.headPx }
    y = clampY(Math.max(y, top + GAP))
    if (overlaps({ x, y, w: card.w, h: card.h }, head)) {
      const right = head.x + head.w + GAP
      const left = head.x - GAP - card.w
      if (right <= maxX) x = right
      else if (left >= CARD_MARGIN) x = left
      else y = clampY(head.y + head.h + GAP)
    }
    // Nor over the section's words and cards: slide down below the lowest box it touches, then re-check the head.
    const boxes = nav.textBoxes[nav.beat]
    if (nav.beat !== 'contact' && boxes?.length) {
      const words = boxes.map((b) => ({ x: b.x, y: b.y - window.scrollY, w: b.w, h: b.h }))
      for (let pass = 0; pass < 3; pass++) {
        const hit = words.filter((b) => overlaps({ x, y, w: card.w, h: card.h }, b))
        if (!hit.length) break
        y = clampY(Math.max(...hit.map((b) => b.y + b.h)) + GAP)
      }
      if (overlaps({ x, y, w: card.w, h: card.h }, head)) x = head.x + head.w + GAP <= maxX ? head.x + head.w + GAP : Math.max(CARD_MARGIN, head.x - GAP - card.w)
    }
    if (nav.beat === 'contact') {
      // Never over the form or the section's words (measured on reflow by the director). First choice: under the
      // left column's last paragraph, left-aligned to it; else below the header on the right, above the form only
      // when it does not touch it.
      const sy = window.scrollY
      const onScreen = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x, y: b.y - sy, w: b.w, h: b.h })
      const c = nav.contact
      const nogo = [...c.text.map(onScreen), ...(c.form ? [onScreen(c.form)] : [])]
      const clear = (bx: number, by: number) => bx >= CARD_MARGIN && bx <= maxX && by >= top + GAP && by <= maxY && !nogo.some((b) => overlaps({ x: bx, y: by, w: card.w, h: card.h }, b))
      const para = c.lastPara ? onScreen(c.lastPara) : null
      if (para && clear(para.x, para.y + para.h + GAP)) {
        x = para.x
        y = para.y + para.h + GAP
      } else if (nogo.some((b) => overlaps({ x, y, w: card.w, h: card.h }, b))) {
        const form = c.form ? onScreen(c.form) : null
        const ry = top + GAP
        if (clear(maxX, ry) && (!form || ry + card.h + GAP <= form.y)) {
          x = maxX
          y = ry
        } else if (form) {
          const above = form.y - GAP - card.h
          y = above >= top + GAP ? above : clampY(top + GAP)
          if (overlaps({ x, y, w: card.w, h: card.h }, form)) x = clampX(form.x - GAP - card.w)
        }
      }
    }
  } else {
    y = clampY(Math.max(y, top + GAP))
  }
  const { edge, mx, my } = nearestEdge({ x, y, w: card.w, h: card.h }, mouth)
  const tail = (Math.atan2(mouth.y - my, mouth.x - mx) * 180) / Math.PI
  return { x, y, tail, edge }
}

/** A form field has the keyboard: on phones the card gets out of the way. */
const fieldFocused = () => {
  const a = document.activeElement
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')
}

type Phase = 'in' | 'out' | 'rest'

/**
 * The Navigator types. For each section she has one line, in the first person; when the reader
 * chooses a mission she answers it; when the cursor rests on her eyes in the hero she says "Look
 * closer." The line arrives on a speech card whose tail points at her mouth (placed each frame
 * from `nav.anchor`: beside her face in the hero, under her chin when docked, full width under the
 * header on phones), typed out character by character with a caret while her lips move. After a
 * line is typed the card stays CARD_REST seconds, then wipes away unless the cursor is on it. The
 * full line is in the HTML for assistive tech, in the page's language.
 */
export default function Transmission() {
  const { t } = useI18n()
  const [beat, setBeat] = useState<Beat>('hero')
  const [choice, setChoice] = useState<PulseChoice>(getPulse().choice)
  const [closer, setCloser] = useState(false)
  const [phase, setPhase] = useState<Phase>('in')
  const shown = useRef<{ beat: Beat; choice: PulseChoice; closer: boolean }>({ beat: 'hero', choice: getPulse().choice, closer: false })
  const timer = useRef(0)
  const typed = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLElement>(null)
  const typing = useRef({ line: '', from: -1, done: true, doneAt: -1 })
  const phaseRef = useRef<Phase>('in')
  const anchored = useRef(false)

  const v = t.navigator
  const index = ORDER.indexOf(beat)
  let line = v.lines[beat]
  if (beat === 'mission' && choice) {
    const n = nav.mission?.layers.length ?? 7
    line = choice === 'all' ? v.missionAll : v.mission.replace('{tag}', t.pulse.needs[choice].tag).replace('{n}', String(n))
  }
  if (closer) line = v.lookCloser

  // A new line starts typing from its first character (or shows whole, in still mode).
  useEffect(() => {
    typing.current = { line, from: nav.clock, done: nav.still, doneAt: nav.still ? nav.clock : -1 }
    nav.spokeAt = nav.clock
    nav.typingUntil = nav.still ? nav.clock : nav.clock + line.length / CPS
    nav.line = { text: line, typed: nav.still ? line.length : 0, from: nav.clock }
    if (typed.current) typed.current.textContent = nav.still ? line : ''
  }, [line])

  useEffect(() => {
    const el = card.current
    const setPhaseOnce = (p: Phase) => {
      if (phaseRef.current === p) return
      phaseRef.current = p
      setPhase(p)
    }
    const tick = () => {
      // Read before writing: the card's size (and the pointer) first, then the styles.
      const a = nav.anchor
      const cw = el?.offsetWidth ?? 0
      const ch = el?.offsetHeight ?? 0

      // Type the current line; tell the world how much is typed (her jaw follows).
      const ty = typing.current
      if (!ty.done && typed.current) {
        const n = Math.min(ty.line.length, Math.floor((nav.clock - ty.from) * CPS))
        typed.current.textContent = ty.line.slice(0, n)
        nav.line.text = ty.line
        nav.line.typed = n
        nav.line.from = ty.from
        if (n >= ty.line.length) {
          ty.done = true
          ty.doneAt = nav.clock
        }
        el?.setAttribute('data-typing', ty.done ? 'false' : 'true')
      }
      // The line is said: the card rests CARD_REST seconds, then wipes (CSS keeps it under the cursor).
      if (ty.done && ty.doneAt >= 0 && !nav.still && phaseRef.current === 'in' && nav.clock - ty.doneAt > CARD_REST) setPhaseOnce('rest')

      // The cursor on her eyes.
      nav.hover.eye = a.on && nav.pointer.on && Math.hypot(nav.pointer.x - a.eyes.x, nav.pointer.y - a.eyes.y) < a.headPx * EYE_R

      // On phones the card hides while a field has the keyboard.
      if (el) {
        const hide = window.innerWidth < PHONE_W && fieldFocused()
        if ((el.dataset.hidden === 'true') !== hide) {
          if (hide) el.dataset.hidden = 'true'
          else delete el.dataset.hidden
        }
      }
      // The card hangs off her mouth when a figure shows; otherwise CSS places it.
      if (el) {
        if (a.on && cw > 0) {
          const mode: CardMode = window.innerWidth < PHONE_W ? 'phone' : nav.atDock ? 'dock' : 'hero'
          const p = keepClear(placeCard(a.mouth, { w: window.innerWidth, h: window.innerHeight }, { w: cw, h: ch }, mode), a.mouth, { w: cw, h: ch }, mode)
          el.style.setProperty('--cx', `${p.x.toFixed(1)}px`)
          el.style.setProperty('--cy', `${p.y.toFixed(1)}px`)
          el.style.setProperty('--tail', `${p.tail.toFixed(1)}deg`)
          if (el.dataset.edge !== p.edge) el.dataset.edge = p.edge
          if (!anchored.current) {
            anchored.current = true
            el.dataset.anchored = 'true'
          }
        } else if (anchored.current) {
          anchored.current = false
          delete el.dataset.anchored
          delete el.dataset.edge
          el.style.removeProperty('--cx')
          el.style.removeProperty('--cy')
          el.style.removeProperty('--tail')
        }
      }

      // Watch the director's beat (and her eyes); when the line should change, wipe out, swap, wipe in.
      const want = { beat: nav.beat, choice: nav.mission?.id ?? null, closer: nav.hover.eye && nav.beat === 'hero' }
      const cur = shown.current
      if (want.beat === cur.beat && want.choice === cur.choice && want.closer === cur.closer) return
      // A mission choice matters only while its question is on screen.
      if (want.beat === cur.beat && want.closer === cur.closer && want.beat !== 'mission') {
        shown.current = want
        return
      }
      shown.current = want
      window.clearTimeout(timer.current)
      if (nav.still) {
        setBeat(want.beat)
        setChoice(want.choice)
        setCloser(want.closer)
        setPhaseOnce('in')
        return
      }
      setPhaseOnce('out')
      timer.current = window.setTimeout(() => {
        setBeat(want.beat)
        setChoice(want.choice)
        setCloser(want.closer)
        setPhaseOnce('in')
      }, 260)
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      window.clearTimeout(timer.current)
    }
  }, [])

  return createPortal(
    <aside ref={card} className="nav-type" data-phase={phase} data-line={beat} data-typing="false" role="status" aria-live="polite">
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

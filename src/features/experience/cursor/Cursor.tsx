import { useEffect, useRef } from 'react'
import { useMotion } from '../../../motion/MotionProvider'
import { damp, pointer } from '../controllers/pointer'

/**
 * The custom cursor: a dot on the pointer and a ring that trails it, grows over anything
 * clickable and pulls magnetic buttons ([data-magnetic]) toward the pointer. Mouse only, and
 * only with motion on; otherwise the system cursor stays. The loop runs only while the pointer
 * moves (plus 300 ms) and while a ring or a magnet is still settling; at rest nothing runs.
 */
const REST_MS = 300
export function Cursor() {
  const { enabled } = useMotion()
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!enabled || !matchMedia('(pointer: fine) and (hover: hover)').matches) return
    const root = document.documentElement
    // The cursor appears only once a mouse has moved: a touch device that reports a fine pointer, or
    // an emulated viewport, never shows a stray ring.
    let raf = 0
    let last = performance.now()
    let movedAt = -Infinity
    const arrive = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      root.classList.add('custom-cursor')
      movedAt = performance.now()
      if (!raf) {
        last = movedAt
        raf = requestAnimationFrame(tick)
      }
    }
    window.addEventListener('pointermove', arrive, { passive: true })
    const r = { x: pointer.px, y: pointer.py, s: 1 }
    const pulled = new Map<HTMLElement, { x: number; y: number }>()
    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const over = (document.elementFromPoint(pointer.px, pointer.py) as Element | null)?.closest<HTMLElement>('a, button, summary, input, textarea, select, label')
      r.x = damp(r.x, pointer.px, 16, dt)
      r.y = damp(r.y, pointer.py, 16, dt)
      r.s = damp(r.s, over ? 1.9 : 1, 12, dt)
      if (dot.current) dot.current.style.transform = `translate3d(${pointer.px}px, ${pointer.py}px, 0)`
      if (ring.current) ring.current.style.transform = `translate3d(${r.x}px, ${r.y}px, 0) scale(${r.s})`
      // Magnetic buttons lean toward a pointer within reach, then settle back.
      const magnet = over?.closest<HTMLElement>('[data-magnetic]') ?? null
      if (magnet && !pulled.has(magnet)) pulled.set(magnet, { x: 0, y: 0 })
      pulled.forEach((m, el) => {
        const b = el.getBoundingClientRect()
        const tx = el === magnet ? (pointer.px - (b.left + b.width / 2 - m.x)) * 0.28 : 0
        const ty = el === magnet ? (pointer.py - (b.top + b.height / 2 - m.y)) * 0.28 : 0
        m.x = damp(m.x, tx, 12, dt)
        m.y = damp(m.y, ty, 12, dt)
        el.style.transform = Math.abs(m.x) + Math.abs(m.y) < 0.05 ? '' : `translate3d(${m.x}px, ${m.y}px, 0)`
        if (el !== magnet && Math.abs(m.x) + Math.abs(m.y) < 0.05) pulled.delete(el)
      })
      const settling = Math.abs(r.x - pointer.px) + Math.abs(r.y - pointer.py) > 0.5 || Math.abs(r.s - (over ? 1.9 : 1)) > 0.01 || pulled.size > 0
      raf = now - movedAt < REST_MS || settling ? requestAnimationFrame(tick) : 0
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', arrive)
      root.classList.remove('custom-cursor')
      pulled.forEach((_, el) => (el.style.transform = ''))
    }
  }, [enabled])
  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  )
}

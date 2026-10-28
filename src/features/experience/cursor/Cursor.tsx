import { useEffect, useRef } from 'react'
import { useMotion } from '../../../motion/MotionProvider'
import { damp, pointer } from '../controllers/pointer'

/**
 * The custom cursor: a dot on the pointer and a ring that trails it, grows over anything
 * clickable and pulls magnetic buttons ([data-magnetic]) toward the pointer. Mouse only, and
 * only with motion on; otherwise the system cursor stays.
 */
export function Cursor() {
  const { enabled } = useMotion()
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!enabled || !matchMedia('(pointer: fine)').matches) return
    const root = document.documentElement
    root.classList.add('custom-cursor')
    let raf = 0
    let last = performance.now()
    const r = { x: pointer.px, y: pointer.py, s: 1 }
    const pulled = new Map<HTMLElement, { x: number; y: number }>()
    const tick = (now: number) => {
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
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
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

import { useEffect, useRef, useState } from 'react'
import holoPoster from '../../assets/avatar/avatar-holo.webp'
import { useMotion } from '../../motion/MotionProvider'
import { AVATAR_H, AVATAR_W } from './holo'
import s from './HoloAvatar.module.css'

/*
 * The avatar on phones, where there is no three.js: her baked hologram still (printed into the
 * page, so the first paint has her), and, when motion is on, the live loop drawn on a canvas over
 * it (the same player and effects the world uses). The canvas is added after the page is idle, runs
 * only while she is on screen, and keeps the still if the video fails. Decorative: no alt.
 */
export function HoloAvatar({ className = '' }: { className?: string }) {
  const { enabled } = useMotion()
  const host = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!enabled || !el) return
    let dead = false
    let raf = 0
    let idle = 0
    let io: IntersectionObserver | null = null
    let dispose = () => {}
    const start = async () => {
      const { createAvatarPlayer } = await import('./player')
      if (dead) return
      const player = createAvatarPlayer(() => {})
      player.canvas.className = s.canvas
      player.canvas.setAttribute('aria-hidden', 'true')
      el.appendChild(player.canvas)
      let seen = false
      io = new IntersectionObserver(([e]) => {
        seen = !!e?.isIntersecting
        player.setActive(seen)
      }, { rootMargin: '200px 0px' })
      io.observe(el)
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop)
        if (!seen) return
        if (player.frame(now / 1000, now) && player.state() === 'live') setLive(true)
      }
      raf = requestAnimationFrame(loop)
      dispose = () => {
        player.dispose()
        player.canvas.remove()
      }
    }
    const go = () => void start()
    if (window.requestIdleCallback) idle = window.requestIdleCallback(go, { timeout: 2000 })
    else idle = window.setTimeout(go, 300)
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      window.cancelIdleCallback?.(idle)
      io?.disconnect()
      dispose()
      setLive(false)
    }
  }, [enabled])

  return (
    <div ref={host} className={`${s.avatar} ${live ? s.live : ''} ${className}`} aria-hidden="true">
      <img src={holoPoster} alt="" width={AVATAR_W} height={AVATAR_H} loading="lazy" decoding="async" className={s.still} />
    </div>
  )
}

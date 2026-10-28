import { gsap } from 'gsap'

if (typeof window !== 'undefined') gsap.defaults({ ease: 'power3.out' })

/** Media queries for the two motion layouts. Holding needs room: wide and tall enough. */
export const layouts = {
  pinned: '(min-width: 900px) and (min-height: 700px)',
  flowing: '(max-width: 899px), (max-height: 699px)',
} as const

export { gsap }

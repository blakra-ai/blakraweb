import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
  gsap.defaults({ ease: 'power3.out' })
}

/** Media queries for the two motion layouts. Pinning needs room: wide and tall enough. */
export const layouts = {
  pinned: '(min-width: 900px) and (min-height: 700px)',
  flowing: '(max-width: 899px), (max-height: 699px)',
} as const

export { gsap, ScrollTrigger, useGSAP }

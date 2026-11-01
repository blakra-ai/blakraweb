import { Suspense } from 'react'
import { Hero } from '../components/Hero'
import { Stage } from '../components/Stage'
import { Proof } from '../components/Proof'
import { Porcelain } from '../components/Porcelain'
import { Contact } from '../components/Contact'
import { Gauge } from '../features/observatory/Gauge'

/**
 * The Observatory (.firm/runs/2026-11-01-observatory-build/plan.md): nine stations on the depth
 * gauge over six screens: 01 the hero, 02 · 03 · 04 the held stage with the picker, 05 · 06 the
 * proof with "how we work", 07 · 08 the porcelain screen, 09 contact. Each section carries its
 * stations as data-station; the contact section is the previous design's until WP-F.
 */
export function Home() {
  // Each station is its own Suspense boundary: the HTML is identical, but React hydrates
  // the page one station at a time and lets the browser breathe in between.
  return (
    <>
      <Suspense fallback={null}>
        <Hero />
      </Suspense>
      <Suspense fallback={null}>
        <Stage />
      </Suspense>
      <Suspense fallback={null}>
        <Proof />
      </Suspense>
      <Suspense fallback={null}>
        <Porcelain />
      </Suspense>
      <Suspense fallback={null}>
        <div data-station={9}>
          <Contact />
        </div>
      </Suspense>
      <Gauge />
    </>
  )
}

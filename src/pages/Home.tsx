import { Suspense } from 'react'
import { Hero } from '../components/Hero'
import { Stage } from '../components/Stage'
import { Ai } from '../components/Ai'
import { Work } from '../components/Work'
import { Porcelain } from '../components/Porcelain'
import { Contact } from '../components/Contact'
import { Gauge } from '../features/observatory/Gauge'

/**
 * The Observatory (.firm/runs/2026-11-01-observatory-build/plan.md): ten stations on the depth
 * gauge: 01 the hero, 02 · 03 · 04 the held stage with the picker, 05 AI (run
 * 2026-11-02-company-content), 06 · 07 the proof with "how we work", 08 · 09 the porcelain screen, 10 contact. Each section carries its
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
        <Ai />
      </Suspense>
      <Suspense fallback={null}>
        <Work />
      </Suspense>
      <Suspense fallback={null}>
        <Porcelain />
      </Suspense>
      <Suspense fallback={null}>
        <div data-station={10}>
          <Contact />
        </div>
      </Suspense>
      <Gauge />
    </>
  )
}

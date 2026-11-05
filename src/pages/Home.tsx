import { Suspense } from 'react'
import { useLoopPause } from '../mobile/swipe'
import { Hero } from '../components/Hero'
import { Stage } from '../components/Stage'
import { Ai } from '../components/Ai'
import { Work } from '../components/Work'
import { People, Products } from '../components/Porcelain'
import { Process } from '../components/Process'
import { Contact } from '../components/Contact'
import { Gauge } from '../features/observatory/Gauge'

/**
 * The Observatory (.firm/runs/2026-11-01-observatory-build/plan.md): ten stations on the depth
 * gauge, in the order of run 2026-11-02-order: 01 the hero, 02 our products, 03 · 04 · 05 the held
 * stage (why one team, the seven layers, the picker), 06 AI, 07 how we work, 08 people, 09 selected
 * client work, 10 contact. Each section carries its stations as data-station (the gauge reads them
 * in document order).
 */
export function Home() {
  useLoopPause()
  // Each station is its own Suspense boundary: the HTML is identical, but React hydrates
  // the page one station at a time and lets the browser breathe in between.
  return (
    <>
      <Suspense fallback={null}>
        <Hero />
      </Suspense>
      <Suspense fallback={null}>
        <Products />
      </Suspense>
      <Suspense fallback={null}>
        <Stage />
      </Suspense>
      <Suspense fallback={null}>
        <Ai />
      </Suspense>
      <Suspense fallback={null}>
        <Process />
      </Suspense>
      <Suspense fallback={null}>
        <People />
      </Suspense>
      <Suspense fallback={null}>
        <Work />
      </Suspense>
      <Suspense fallback={null}>
        <div data-station={10} data-m-surface="ink">
          <Contact />
        </div>
      </Suspense>
      <Gauge />
    </>
  )
}

import { Suspense } from 'react'
import { Hero } from '../components/Hero'
import { Manifesto } from '../components/Manifesto'
import { Pulse } from '../components/Pulse'
import { DayTrack } from '../components/DayTrack'
import { Engine } from '../components/Engine'
import { Process } from '../components/Process'
import { Products } from '../components/Products'
import { People } from '../components/People'
import { Contact } from '../components/Contact'
import { Gauge } from '../features/observatory/Gauge'

/**
 * The Observatory (.firm/runs/2026-11-01-observatory-build/plan.md): nine stations on the depth
 * gauge over six screens. The hero is on the storyboard; the sections after it are the previous
 * design's until WP-D … WP-F rebuild them, each wrapped as a station so the gauge already descends.
 */
export function Home() {
  // Each station is its own Suspense boundary: the HTML is identical, but React hydrates
  // the page one station at a time and lets the browser breathe in between.
  const stations = [Manifesto, Pulse, Engine, DayTrack, Process, Products, People, Contact]
  return (
    <>
      <Suspense fallback={null}>
        <Hero />
      </Suspense>
      {stations.map((Station, i) => (
        <Suspense key={Station.name} fallback={null}>
          <div data-station={i + 2}>
            <Station />
          </div>
        </Suspense>
      ))}
      <Gauge />
    </>
  )
}

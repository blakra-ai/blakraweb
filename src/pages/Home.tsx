import { Suspense } from 'react'
import { Hero } from '../components/Hero'
import { Pulse } from '../components/Pulse'
import { DayTrack } from '../components/DayTrack'
import { Engine } from '../components/Engine'
import { Process } from '../components/Process'
import { Products } from '../components/Products'
import { People } from '../components/People'
import { Contact } from '../components/Contact'

/**
 * The film "Gravity", in the order of its acts (src/features/experience/timeline.ts):
 * scattered → gravity (hero) → your need (pulse) → built up: seven layers (engine) → launched:
 * five systems (proof) → our product → how we work → the people → your system, running (contact).
 */
export function Home() {
  // Each station is its own Suspense boundary: the HTML is identical, but React hydrates
  // the page one station at a time and lets the browser breathe in between.
  const stations = [Hero, Pulse, Engine, DayTrack, Products, Process, People, Contact]
  return (
    <>
      {stations.map((Station) => (
        <Suspense key={Station.name} fallback={null}>
          <Station />
        </Suspense>
      ))}
    </>
  )
}

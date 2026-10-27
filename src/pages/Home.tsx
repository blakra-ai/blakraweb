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
 * A descent through a black hole, one visitor question per station: what is this (hero)
 * → why one team, and what do you need (pulse) → proof: five businesses, five systems →
 * how: seven layers, one engine → depth: the products the engine sends outward → risk:
 * how a project runs → trust: the people → action: three doors at the event horizon.
 */
export function Home() {
  // Each station is its own Suspense boundary: the HTML is identical, but React hydrates
  // the page one station at a time and lets the browser breathe in between.
  const stations = [Hero, Pulse, DayTrack, Engine, Products, Process, People, Contact]
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

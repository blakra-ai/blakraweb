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

/**
 * The Navigator's page (.firm/runs/2026-10-29-blakra-identity/screenplay.md): the hook (hero),
 * the thesis (manifesto), the question (mission), the promise (seven systems), the proof, the
 * terms, the payload, the crew, and the payoff (the reply signal).
 */
export function Home() {
  // Each station is its own Suspense boundary: the HTML is identical, but React hydrates
  // the page one station at a time and lets the browser breathe in between.
  const stations = [Hero, Manifesto, Pulse, Engine, DayTrack, Products, Process, People, Contact]
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

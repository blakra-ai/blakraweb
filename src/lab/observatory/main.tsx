import { createRoot } from 'react-dom/client'
import { StrictMode, useEffect, useRef } from 'react'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import { MotionProvider } from '../../motion/MotionProvider'
import { ObservatoryStage } from '../../features/observatory/Stage'
import { obs } from '../../features/observatory/state'
import { registerWindow, type WindowKind } from '../../features/observatory/windows'
import './observatory.css'

/* A stand-in for WP-A's <Window>: the 24 px inset frame, min-height 100svh, registering its rect. */
function Window({ id, kind, children }: { id: string; kind: WindowKind; children?: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => (ref.current ? registerWindow(id, ref.current, kind) : undefined), [id, kind])
  return (
    <section ref={ref} className="lab-window" data-kind={kind}>
      {children}
    </section>
  )
}

function Lab() {
  useEffect(() => {
    // The station follows the scroll: 1 in the hero, 9 at the contact window.
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      obs.station = 1 + Math.round((8 * window.scrollY) / Math.max(1, max))
      obs.progress = (window.scrollY % window.innerHeight) / window.innerHeight
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    const q = new URLSearchParams(location.search)
    if (q.has('line')) obs.line = { text: "I'm the Navigator. I've flown this descent before.", typed: 20, from: 0 }
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <>
      <header className="lab-nav">BLAKRA · lab · observatory</header>
      <main>
        <Window id="hero" kind="hero">
          <div className="lab-words">
            <p className="lab-eyebrow">Software with gravity</p>
            <h1>We build what carries your operation.</h1>
            <p className="lab-lede">One engineering company, seven layers, one team.</p>
          </div>
        </Window>
        <section className="lab-doc">
          <h2>A document screen (no canvas)</h2>
          <p>Proof rows, the porcelain screen: DOM only. The world draws nothing here.</p>
        </section>
        <Window id="stage" kind="stage">
          <div className="lab-words">
            <h2>Seven layers. One team.</h2>
          </div>
        </Window>
        <section className="lab-doc">
          <h2>Another document screen</h2>
        </section>
        <Window id="contact" kind="contact">
          <div className="lab-words">
            <h2>Start a project</h2>
            <button type="button" onClick={() => (obs.glowAt = obs.clock)}>
              Pulse the ring (event)
            </button>
          </div>
        </Window>
      </main>
      <ObservatoryStage />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionProvider>
      <Lab />
    </MotionProvider>
  </StrictMode>,
)

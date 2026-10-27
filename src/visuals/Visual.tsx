import { memo, useEffect, useRef, type CSSProperties } from 'react'
import type { SceneId } from '../content/shared'
import { useI18n } from '../i18n'
import { pad2 } from '../scenes/shared'
import s from './visuals.module.css'

/**
 * The system each business got, shown as the product it is: a live interface, not a
 * diagram. Animations are CSS, and run only on the card in view with motion on.
 */
/** Memoized: the day track re-renders when its active card changes; the scenes never need to. */
export const Visual = memo(function Visual({ scene }: { scene: SceneId }) {
  switch (scene) {
    case 'stock':
      return <Stock />
    case 'routes':
      return <Routes />
    case 'documents':
      return <Documents />
    case 'line':
      return <Line />
    case 'queue':
      return <Queue />
  }
})

const v = (value: number) => ({ '--v': `${Math.round(value * 100)}%` }) as CSSProperties
const delay = (i: number) => ({ '--i': i }) as CSSProperties

function Check() {
  return (
    <svg viewBox="0 0 16 16" className={s.check} aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  )
}

const levels = [0.82, 0.64, 0.71, 0.12, 0.9, 0.55, 0.77, 0.68, 0.09, 0.6, 0.85, 0.73]

function Stock() {
  const l = useI18n().t.scenes.stock
  return (
    <div className={s.panel} aria-hidden="true">
      <header className={s.bar}>
        <span className={s.live} />
        <span className={s.title}>{l.title}</span>
      </header>
      <div className={s.stores}>
        {levels.map((level, i) => (
          <div key={i} className={s.store} data-low={level < 0.2 ? '' : undefined} style={delay(i)}>
            <span className={s.storeName}>
              <span className={s.storeWord}>{l.store} </span>
              {pad2(i + 1)}
            </span>
            <span className={s.meter}>
              <i style={v(level)} />
            </span>
          </div>
        ))}
      </div>
      <div className={s.toast}>
        <span className={s.toastIcon}>
          <Check />
        </span>
        <span>
          <strong>{l.chip}</strong>
          <small>{l.chipSub}</small>
        </span>
      </div>
    </div>
  )
}

const routes = ['M40 250 C 120 240, 150 150, 230 140 S 330 70, 380 60', 'M40 250 C 110 280, 200 300, 270 250 S 360 210, 390 220', 'M40 250 C 60 180, 90 120, 150 90 S 220 40, 260 30']

function Routes() {
  const l = useI18n().t.scenes.routes
  const ref = useRef<HTMLDivElement>(null)
  // The vans follow the SVG routes; their layer is drawn at 420 px and scaled to the panel.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => el.style.setProperty('--k', String(entry.contentRect.width / 420)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={`${s.panel} ${s.map}`} aria-hidden="true">
      <svg viewBox="0 0 420 320" className={s.mapSvg} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="route-grad" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="rgba(255,255,255,0.05)" />
          </pattern>
        </defs>
        <rect width="420" height="320" fill="url(#map-grid)" />
        {routes.map((d, i) => (
          <g key={d}>
            <path d={d} className={s.routeBase} />
            <path d={d} className={s.routeFlow} stroke="url(#route-grad)" style={delay(i)} />
          </g>
        ))}
        <rect x="30" y="240" width="20" height="20" rx="6" className={s.depot} />
      </svg>
      <div className={s.vans}>
        {routes.map((d, i) => (
          <span key={d} className={s.van} style={{ offsetPath: `path('${d}')`, ...delay(i) } as CSSProperties} />
        ))}
      </div>
      <div className={`${s.chip} ${s.chipTop}`}>
        <span className={s.live} /> {l.live}
      </div>
      <div className={`${s.chip} ${s.chipBottom}`}>
        <Check /> <strong>{l.delivered}</strong> <small>{l.proof}</small>
      </div>
    </div>
  )
}

function Documents() {
  const l = useI18n().t.scenes.documents
  return (
    <div className={s.panel} aria-hidden="true">
      <header className={s.bar}>
        <span className={s.title}>{l.title}</span>
        <span className={s.subtitle}>{l.sub}</span>
      </header>
      <ul className={s.rows}>
        {l.rows.map((r, i) => (
          <li key={i} className={s.row} data-first={i === 0 ? '' : undefined} style={delay(i)}>
            <span className={s.file}>{i === 2 ? '↑' : i === 3 ? '✉' : 'PDF'}</span>
            <span className={s.rowText}>
              <strong>{r.title}</strong>
              <small>{r.sub}</small>
            </span>
            {i === 3 && (
              <span className={s.typing}>
                <i />
                <i />
                <i />
              </span>
            )}
          </li>
        ))}
      </ul>
      <span className={s.scan} />
    </div>
  )
}

const spark = (seed: number) =>
  Array.from({ length: 12 }, (_, k) => `${k * 9},${18 - Math.round(Math.abs(Math.sin(seed * 1.7 + k * 0.9)) * 12 + (k % 3) * 2)}`).join(' ')

function Line() {
  const l = useI18n().t.scenes.line
  return (
    <div className={s.panel} aria-hidden="true">
      <div className={s.lines}>
        {[0, 1, 2].map((line) => (
          <div key={line} className={s.lineRow}>
            <span className={s.lineName}>
              {l.line} {line + 1}
            </span>
            {Array.from({ length: 6 }, (_, m) => {
              const stalled = line === 2 && m === 3
              return (
                <span key={m} className={s.machine} data-stalled={stalled ? '' : undefined} style={delay(line * 6 + m)}>
                  <svg viewBox="0 0 100 22" preserveAspectRatio="none" className={s.spark}>
                    <polyline points={stalled ? '0,18 30,16 45,20 60,21 100,21' : spark(line * 6 + m)} />
                  </svg>
                  <span className={s.status} />
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <div className={s.alert}>
        <span className={s.alertDot} />
        <strong>{l.alert}</strong>
        <small>{l.now}</small>
      </div>
    </div>
  )
}

function Queue() {
  const l = useI18n().t.scenes.queue
  const statuses = [l.answered, l.returned, l.answered, l.person]
  return (
    <div className={s.panel} aria-hidden="true">
      <header className={s.bar}>
        <span className={s.title}>{l.title}</span>
        <span className={s.ring}>
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" className={s.ringTrack} />
            <circle cx="18" cy="18" r="15" className={s.ringValue} pathLength={100} />
          </svg>
          <span>
            <strong>65%</strong>
            <small>{l.auto}</small>
          </span>
        </span>
      </header>
      <ul className={s.inbox}>
        {l.messages.slice(0, 4).map((m, i) => (
          <li key={i} className={s.msg} data-person={i === 3 ? '' : undefined} style={delay(i)}>
            <span className={s.bubble}>{m}</span>
            <span className={s.reply}>
              {i === 3 ? <span className={s.handoff}>{statuses[i]} →</span> : <><Check /> {statuses[i]}</>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

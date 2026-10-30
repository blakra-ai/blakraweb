import type { CSSProperties } from 'react'
import { chakraColors, chakraOf } from '../content/shared'
import type { LayerId } from '../content/types'
import { yantraPath } from '../features/navigator/yantra'
import s from './Patch.module.css'

/** A small stable hash of a name, for the seal's guilloché. */
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * A mission patch: the embroidered badge of a mission, drawn from its facts. The ring carries
 * the layers it takes, each in its chakra's colour, in the order they stack; the field holds the
 * yantra of its highest layer; the guilloché behind it is woven from the name, so no two
 * patches are alike and none can be faked. Real embroidered patches are 7–9 cm; these are
 * drawn at that size, at arm's length.
 */
export function Patch({ name, layers, motto, highlight, size = 168, className, children }: { name: string; layers: readonly LayerId[]; motto?: string; highlight?: boolean; size?: number; className?: string; children?: React.ReactNode }) {
  const ks = [...layers].map((l) => chakraOf[l]).sort((a, b) => a - b)
  const top = ks[ks.length - 1] ?? 6
  const h = hash(name)
  const lobes = 5 + (h % 4) // 5 … 8
  const wobble = 0.08 + ((h >>> 8) % 5) * 0.02
  const phase = ((h >>> 16) % 360) * (Math.PI / 180)
  // The guilloché: three interwoven rosettes, from the name.
  const rosette = (k: number) =>
    Array.from({ length: 181 }, (_, i) => {
      const a = (i / 180) * Math.PI * 2
      const r = 0.62 + wobble * Math.sin(a * lobes + phase + k * 1.3) + 0.03 * Math.sin(a * (lobes * 3) + k)
      return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`
    }).join('')
  const seg = (Math.PI * 2) / Math.max(1, ks.length)
  const arc = (i: number) => {
    const a0 = -Math.PI / 2 + i * seg + 0.035
    const a1 = -Math.PI / 2 + (i + 1) * seg - 0.035
    const r = 0.9
    const large = a1 - a0 > Math.PI ? 1 : 0
    return `M${(Math.cos(a0) * r).toFixed(3)} ${(Math.sin(a0) * r).toFixed(3)}A${r} ${r} 0 ${large} 1 ${(Math.cos(a1) * r).toFixed(3)} ${(Math.sin(a1) * r).toFixed(3)}`
  }
  return (
    <span className={`${s.patch} ${className ?? ''}`} data-highlight={highlight ? '' : undefined} style={{ '--size': `${size}px`, '--chakra': chakraColors[top] } as CSSProperties}>
      <svg viewBox="-1.04 -1.04 2.08 2.08" className={s.badge} aria-hidden="true">
        <circle r="1" className={s.field} />
        <g className={s.guilloche}>
          <path d={rosette(0)} />
          <path d={rosette(1)} />
          <path d={rosette(2)} />
        </g>
        <g className={s.yantra}>
          <path d={yantraPath(top)} transform="scale(0.5)" />
          <circle r="0.038" />
        </g>
        <g className={s.ring}>
          {ks.map((k, i) => (
            <path key={k} d={arc(i)} stroke={chakraColors[k]} />
          ))}
        </g>
        <circle r="1" className={s.stitch} />
      </svg>
      {motto && <span className={s.motto}>{motto}</span>}
      {children}
    </span>
  )
}

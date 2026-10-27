import { memo } from 'react'
import type { ProductId } from '../content/types'
import s from './ProductPreview.module.css'

/** Sample points across the face, on a grid clipped to the contour. */
const points: [number, number][] = []
for (let y = 32; y <= 122; y += 10)
  for (let x = 26; x <= 94; x += 10) if (((x - 60) / 40) ** 2 + ((y - 76) / 54) ** 2 < 1) points.push([x, y])
const hot = new Set([9, 16, 23])

/**
 * A glimpse of each product, drawn as a quiet diagram (no fake copy, no fake numbers),
 * in the same glass language as the case-study cards.
 */
export const ProductPreview = memo(function ProductPreview({ id }: { id: ProductId }) {
  return (
    <div className={s.preview} data-product={id} aria-hidden="true">
      {id === 'skin' && (
        <div className={s.skin}>
          <span className={s.scanArea}>
            <svg viewBox="0 0 120 150" className={s.face} focusable="false">
              <ellipse cx="60" cy="76" rx="44" ry="60" className={s.contour} />
              {points.map(([x, y], i) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={hot.has(i) ? 2.2 : 1.3} className={s.point} data-hot={hot.has(i) ? '' : undefined} />
              ))}
            </svg>
            <span className={s.scan} />
          </span>
          <span className={s.recs}>
            {[60, 45, 70].map((w, i) => (
              <span key={w} className={s.rec} data-hot={i === 0 ? '' : undefined}>
                <i />
                <span className={s.line} style={{ width: `${w}%` }} />
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  )
})

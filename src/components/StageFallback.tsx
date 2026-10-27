import poster from '../assets/stage-poster.jpg'
import posterNarrow from '../assets/stage-poster-narrow.jpg'
import s from './StageFallback.module.css'

/**
 * The opening shot as a still, rendered by the 3D world itself on a real GPU: the page
 * shows the black hole from the first paint, and the live world crossfades over it once
 * it is ready. Also what stays without JS, without WebGL2, or on a software-only GPU.
 */
export function StageFallback() {
  return (
    <picture className={s.fallback} aria-hidden="true">
      <source media="(max-width: 899px)" srcSet={posterNarrow} />
      <img src={poster} alt="" width={1600} height={1000} decoding="async" fetchPriority="high" />
    </picture>
  )
}

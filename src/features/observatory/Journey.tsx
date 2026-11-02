import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PerspectiveCamera } from 'three'
import { onReflow } from '../../motion/reflow'
import { createGuideHandle, fitGuideCamera, Guide, placeGuide } from './Guide'
import { obs } from './state'
import { onWindows, stickyOf, type Rect } from './windows'

/*
 * The journey's overlay: a second fixed canvas ABOVE the document (z 2, pointer-events none; journey.ts keeps her clear of the words)
 * that draws her alone while she travels the paper between the dark windows (World.tsx draws
 * her inside them, behind the words). It never paints a background and only renders when she is
 * the paper's (`obs.journeyOwner === 'paper'`) and motion is on. The world steps the journey
 * (journey.ts) each frame; this canvas reads the result through one full-viewport perspective
 * camera with world units = CSS px. Her anchors on the paper (the proof's rows, the sealed well)
 * are measured here on reflow only.
 */

function measureAnchors() {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-row]')].map((el) => {
    const r = el.getBoundingClientRect()
    return { id: el.id, rect: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height } }
  })
  const near = document.querySelector<HTMLElement>('[data-row][data-near]')
  const well = document.querySelector<HTMLElement>('#products [data-hold]')
  const wr = well?.getBoundingClientRect()
  // The stage's ink well inside its sticky hold: the hold's page rect and the well's centre within it.
  const hold = document.querySelector<HTMLElement>('[data-beat="systems"] [data-hold]')
  const ink = hold?.querySelector<SVGElement>('svg')
  let stage: typeof obs.journeyAnchors.stage = null
  if (hold && ink) {
    const hr = hold.getBoundingClientRect()
    const ir = ink.getBoundingClientRect()
    stage = { hold: { x: hr.left + window.scrollX, y: hr.top + window.scrollY, w: hr.width, h: hr.height }, sticky: stickyOf(ink as unknown as HTMLElement), ring: { x: ir.left - hr.left + ir.width / 2, y: ir.top - hr.top + ir.height / 2, r: ir.width / 2 } }
  }
  // The words: every text block's page rect, so she never stands over a line.
  // A block in a sticky hold travels with the hold: it counts over the hold's whole height (conservative).
  const text: Rect[] = []
  for (const el of document.querySelectorAll<HTMLElement>('main :is(h1, h2, h3, h4, p, li, dt, dd, blockquote, figcaption, a, button, label, input, textarea, [data-row])')) {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const st = stickyOf(el)
    if (st) text.push({ x: r.left + window.scrollX, y: st.containerY, w: r.width, h: st.containerH })
    else text.push({ x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height })
  }
  obs.journeyAnchors = { text, rows, nearest: near?.id ?? null, well: wr ? { x: wr.left + window.scrollX, y: wr.top + window.scrollY, w: wr.width, h: wr.height } : null, stage }
}

function Pass({ handle }: { handle: ReturnType<typeof createGuideHandle> }) {
  const { gl, scene, size, invalidate } = useThree()
  const persp = useMemo(() => new PerspectiveCamera(30, 1, 1, 20000), [])
  const raf = useRef(0)

  useEffect(() => {
    gl.autoClear = false
    gl.setClearColor(0x000000, 0)
    const input = () => {
      if (!raf.current) raf.current = requestAnimationFrame(() => {
        raf.current = 0
        invalidate()
      })
    }
    const move = () => {
      if (obs.journeyOwner === 'paper') input()
    }
    window.addEventListener('scroll', input, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    const offWindows = onWindows(input)
    const offReflow = onReflow(() => {
      measureAnchors()
      input()
    })
    measureAnchors()
    invalidate()
    return () => {
      window.removeEventListener('scroll', input)
      window.removeEventListener('pointermove', move)
      offWindows()
      offReflow()
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [gl, invalidate])

  useFrame(() => {
    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
    gl.clear(true, true, false)
    const g = handle.group
    if (g) g.visible = false
    const j = obs.journey
    const box = gl.domElement.closest<HTMLElement>('.obs-journey')
    if (obs.still || obs.journeyOwner !== 'paper' || !g) {
      if (box) box.style.visibility = 'hidden'
      return
    }
    // The box (BOX_W × BOX_H of the viewport) rides with her: her eyes at its (0.5, 0.3).
    if (box) {
      box.style.visibility = j.alpha > 0.01 ? 'visible' : 'hidden'
      box.style.opacity = j.alpha.toFixed(3)
      box.style.transform = `translate(${(j.x - 0.5 * size.width).toFixed(1)}px, ${(j.y + j.hover - 0.3 * size.height).toFixed(1)}px)`
    }
    handle.systems(false)
    const view = { x: 0, y: 0, w: size.width, h: size.height }
    fitGuideCamera(persp, size.width, size.height)
    if (placeGuide(handle, { x: 0.5 * size.width, y: 0.3 * size.height, figurePx: j.figurePx, bank: j.bank, pitch: j.pitch, facing: j.facing, key: -1 }, view, persp)) {
      g.visible = true
      gl.render(scene, persp)
      g.visible = false
    }
    // While she is the paper's she travels, hovers and breathes: the frames keep coming at the world's pace.
    invalidate()
  }, 1)
  return null
}

export default function Journey() {
  const handle = useMemo(createGuideHandle, [])
  return createPortal(
    <div className="obs-journey" aria-hidden="true" style={{ visibility: 'hidden' }}>
      <Canvas frameloop="demand" dpr={1} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }} style={{ width: '100%', height: '100%' }}>
        <Guide handle={handle} variant="journey" />
        <Pass handle={handle} />
      </Canvas>
    </div>,
    document.body,
  )
}

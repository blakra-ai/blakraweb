import { HalfFloatType, NoToneMapping, type Object3D, PerspectiveCamera, Scene, SRGBColorSpace, UnsignedByteType, Vector3, WebGLRenderer } from 'three'
import { BloomEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, ShaderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect, BlendFunction } from 'postprocessing'
import { cameraFrom } from '../engine3d/stage'
import type { EngineRenderer, Frame } from '../engine3d/frame'
import { createBakes } from './bake'
import { createColumn } from './column'
import { createDebris } from './debris'
import { createDisk } from './disk'
import { createInfall } from './infall'
import { createJets } from './jets'
import { createOrbiters } from './orbiters'
import { createLensMaterial } from './lens'
import { createSky } from './sky'

/**
 * The 3D world behind the page, in three.js. Two layers make the black hole:
 * everything behind it (stars, the far half of the disk, far debris) is rendered to a
 * buffer and lensed in screen space; everything in front of it (the near half of the
 * disk, near debris, the column of centres) is drawn on top, unbent. Then bloom,
 * filmic tone mapping, grain and a vignette.
 */

// Vertical field of view matching the earlier ray-marched stage, so poses frame the same.
const FOV = 2 * Math.atan(0.5 / 1.55) * (180 / Math.PI)
/** Pixel ratio per quality level, richest first (before capping at the device's own). */
const levels = [1.25, 1, 0.85, 0.7, 0.55]

export function createWorld(canvas: HTMLCanvasElement, onLost: () => void): EngineRenderer | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  const gl = renderer.getContext()
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const forced = new URLSearchParams(location.search).get('gl') === 'force'
  if (!forced && /swiftshader|llvmpipe|software|basic render/i.test(String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : ''))) {
    // Release the context outright: a live context on a fixed full-screen canvas still costs compositing.
    renderer.forceContextLoss()
    renderer.dispose()
    return null
  }
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping
  renderer.setClearColor(0x000000, 1)

  const camera = new PerspectiveCamera(FOV, 1, 0.05, 2400)
  const behind = new Scene()
  const front = new Scene()
  const bakes = createBakes(renderer)
  const sky = createSky(bakes.nebula)
  const disk = createDisk(bakes.disk)
  const debris = createDebris()
  const column = createColumn()
  const jets = createJets()
  const infall = createInfall()
  const orbiters = createOrbiters()
  behind.add(sky.nebula, sky.stars, disk.far, debris.far, orbiters.far)
  front.add(disk.near, debris.near, orbiters.near, column.group, column.bands, jets.mesh, infall.mesh)

  const debug = new URLSearchParams(location.search)
  // 8-bit buffers: half the memory traffic of half-float, which is what an integrated GPU runs out of.
  // The glow loses a little headroom and nothing visible; ?fb=16 compares.
  const composer = new EffectComposer(renderer, { frameBufferType: debug.get('fb') === '16' ? HalfFloatType : UnsignedByteType })
  const lens = createLensMaterial()
  const frontPass = new RenderPass(front, camera)
  // Keep the lensed picture; clear only depth before drawing what is in front.
  frontPass.clearPass.setClearFlags(false, true, false)
  const grain = new NoiseEffect({ blendFunction: BlendFunction.SCREEN, premultiply: true })
  grain.blendMode.opacity.value = 0.22
  composer.addPass(new RenderPass(behind, camera))
  composer.addPass(new ShaderPass(lens, 'inputBuffer'))
  composer.addPass(frontPass)
  composer.addPass(
    new EffectPass(
      camera,
      new BloomEffect({ mipmapBlur: true, intensity: 1.15, luminanceThreshold: 0.55, luminanceSmoothing: 0.3, radius: 0.72, levels: 6, resolutionScale: 0.5 }),
      new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
      new VignetteEffect({ offset: 0.32, darkness: 0.62 }),
      grain,
    ),
  )

  // Parts hidden on the first screen (the column, jets, infall, orbits) would otherwise upload
  // their buffers and textures, and link the programs the composer's targets need, the first
  // time they appear: a frozen frame in the middle of the first scroll. One full render with
  // everything shown and nothing culled does all of it at load, before the world is visible.
  const warm = () => {
    const changed: [Object3D, boolean, boolean][] = []
    for (const scene of [behind, front])
      scene.traverse((o) => {
        changed.push([o, o.visible, o.frustumCulled])
        o.visible = true
        o.frustumCulled = false
      })
    composer.render()
    for (const [o, visible, culled] of changed) {
      o.visible = visible
      o.frustumCulled = culled
    }
  }

  let compiled = false
  let failed = false
  renderer
    .compileAsync(behind, camera)
    .then(() => renderer.compileAsync(front, camera))
    .then(() => {
      warm()
      compiled = true
    })
    .catch(() => {
      failed = true
      onLost()
    })

  const lost = (e: Event) => {
    e.preventDefault()
    onLost()
  }
  canvas.addEventListener('webglcontextlost', lost)

  // ?q=0…4 pins a quality level (for measuring); otherwise small screens start lower.
  const pinnedLevel = Number(new URLSearchParams(location.search).get('q'))
  const pinned = Number.isInteger(pinnedLevel) && pinnedLevel >= 0 && pinnedLevel < levels.length && location.search.includes('q=')
  let level = pinned ? pinnedLevel : canvas.clientWidth < 900 ? 3 : 2
  const richest = 0
  const resize = () => {
    const ratio = Math.min(levels[level], Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setPixelRatio(ratio)
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    composer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight)
  }
  resize()

  // ?profile: exposes GPU timings per part of the scene (for tuning on real hardware).
  if (new URLSearchParams(location.search).has('profile')) {
    const parts: Record<string, { visible: boolean }[]> = {
      stars: [sky.stars], nebula: [sky.nebula], disk: [disk.far, disk.near], debris: [debris.far, debris.near], column: [column.group],
    }
    const passes = composer.passes
    ;(window as unknown as { __world: unknown }).__world = {
      time(n = 30) {
        gl.finish()
        const t0 = performance.now()
        for (let i = 0; i < n; i++) composer.render()
        gl.finish()
        return (performance.now() - t0) / n
      },
      hide(name: string, hidden: boolean) {
        for (const o of parts[name] ?? []) o.visible = !hidden
      },
      pass(i: number, on: boolean) {
        passes[i].enabled = on
      },
      size: () => [renderer.domElement.width, renderer.domElement.height],
      front,
      camera: () => camera.position.toArray(),
      ratio: () => renderer.getPixelRatio(),
    }
  }

  const cam = new Vector3()
  const hole = new Vector3()
  const toHole = new Vector3()
  const forward = new Vector3()

  return {
    ready: () => compiled && !failed,
    draw(f: Frame) {
      if (!compiled || failed) return false
      const p = f.pose
      const c = cameraFrom(p, f.time)
      camera.position.set(...c.pos)
      camera.lookAt(...c.target)
      // Shift the optical centre so the axis sits beside the text.
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      camera.setViewOffset(w, h, -p.shift[0] * h, p.shift[1] * h, w, h)
      camera.updateMatrixWorld()
      cam.copy(camera.position)

      const form = f.form
      disk.update(f.time, p.disk * (0.15 + 0.85 * Math.min(1, Math.max(0, (form - 0.2) / 0.8))), p.isco, cam)
      debris.update(f.time, Math.max(1 - form, p.chaos), Math.max(1 - form, p.chaos * 0.8), cam, renderer.getPixelRatio() * (h / 900))
      sky.setPixel(renderer.getPixelRatio())
      column.update({ lit: f.lit, open: f.open, boost: f.boost, flow: f.flow, focus: f.focus, lift: p.lift, column: p.column, time: f.time, cam })
      jets.update(f.time, p.jets, cam)
      infall.update(f.time, p.infall)
      orbiters.update(f.time, p.orbiters, cam)

      // The lens follows the hole on screen; its size is the shadow's angular size.
      hole.set(0, 0, 0).project(camera)
      camera.getWorldDirection(forward)
      toHole.copy(cam).negate()
      const dist = toHole.length()
      const inFront = toHole.dot(forward) > 0
      const shadow = (2.598 / Math.max(dist, 0.1)) / (2 * Math.tan((FOV * Math.PI) / 360))
      const u = lens.uniforms
      u.uCenter.value.set(hole.x * 0.5 + 0.5, hole.y * 0.5 + 0.5)
      u.uAspect.value = w / Math.max(1, h)
      u.uShadow.value = shadow
      u.uEinstein.value = shadow * 1.22
      u.uVisible.value = inFront ? 1 : 0
      u.uPointer.value.set(f.pointer[0], f.pointer[1], f.pointer[2])

      composer.render()
      return true
    },
    resize,
    adjust(step) {
      if ((forced && step < 0) || pinned) return false
      const next = Math.min(levels.length - 1, Math.max(richest, level - step))
      if (next === level) return false
      level = next
      resize()
      return true
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', lost)
      composer.dispose()
      sky.dispose()
      disk.dispose()
      debris.dispose()
      column.dispose()
      jets.dispose()
      infall.dispose()
      orbiters.dispose()
      bakes.dispose()
      lens.dispose()
      renderer.dispose()
    },
  }
}

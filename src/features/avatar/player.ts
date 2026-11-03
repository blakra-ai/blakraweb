import stillUrl from '../../assets/avatar/avatar-still.webp?url'
import mp4Url from '../../assets/avatar/avatar-stack.mp4?url'
import webmUrl from '../../assets/avatar/avatar.webm?url'
import { AVATAR_H, AVATAR_W, holoFrame, needsStackedVideo, paintHolo, restoreAlpha, seeded } from './holo'

/*
 * The avatar's picture as a canvas, for the world's texture (Guide.tsx) and the phone's overlay
 * (HoloAvatar.tsx). One idle loop, a transparent VP9 WebM (Chrome, Edge, Firefox); WebKit gets the
 * stacked H.264 (colour over alpha) and rebuilds the alpha here; any failure, and reduced motion,
 * keep the still. The player reads no layout: the caller says when a frame is due.
 */

/** The painted frames per second at most (the loop is 24 fps). */
const FPS = 30

export type AvatarState = 'idle' | 'poster' | 'live' | 'failed'

export interface AvatarPlayer {
  canvas: HTMLCanvasElement
  /** What it shows now: nothing yet, the still, the video, or nothing (everything failed). */
  state(): AvatarState
  /** The video runs only while it shows (a hidden avatar costs nothing); a still avatar never loads it. */
  setActive(on: boolean): void
  /** Reduced motion: the still, no video. */
  setStill(still: boolean): void
  /** Paints when something is due (a new video frame, or the still once); true when the canvas changed. */
  frame(clock: number, now: number): boolean
  dispose(): void
}

export function createAvatarPlayer(onChange: () => void): AvatarPlayer {
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_W
  canvas.height = AVATAR_H
  const x = canvas.getContext('2d')!
  let posterImg: HTMLImageElement | null = null
  let posterReady = false
  let isStill = false
  let active = false
  let video: HTMLVideoElement | null = null
  let stacked = needsStackedVideo(navigator.userAgent)
  let failed = false
  let live = false
  let last = -1e9
  let dirty = true
  let disposed = false
  // The stacked path's scratch canvases (colour, alpha), only made when WebKit needs them.
  let raw: { c: HTMLCanvasElement; cx: CanvasRenderingContext2D; ax: CanvasRenderingContext2D } | null = null

  const loadPoster = () => {
    if (posterImg) return
    posterImg = new Image()
    posterImg.decoding = 'async'
    posterImg.onload = () => {
      posterReady = true
      dirty = true
      onChange()
    }
    posterImg.src = stillUrl
  }

  const startVideo = () => {
    if (video || failed || disposed) return
    const v = document.createElement('video')
    v.muted = true
    v.defaultMuted = true
    v.loop = true
    v.playsInline = true
    v.autoplay = true
    v.preload = 'none'
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.setAttribute('aria-hidden', 'true')
    v.tabIndex = -1
    // In the document (WebKit does not decode a detached video) but never seen.
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none'
    v.onplaying = () => onChange()
    v.onerror = () => {
      if (!stacked) {
        // Not VP9 with alpha here: the other cut.
        stacked = true
        v.remove()
        video = null
        live = false
        startVideo()
      } else {
        failed = true
        live = false
        v.remove()
        video = null
        dirty = true
        onChange()
      }
    }
    v.src = stacked ? mp4Url : webmUrl
    document.body.appendChild(v)
    video = v
    if (active) void v.play().catch(() => {})
  }

  const paintStacked = (v: HTMLVideoElement, f: ReturnType<typeof holoFrame>) => {
    if (!raw) {
      const c = document.createElement('canvas')
      c.width = AVATAR_W
      c.height = AVATAR_H
      const cx = c.getContext('2d', { willReadFrequently: true })!
      const a = document.createElement('canvas')
      a.width = AVATAR_W
      a.height = AVATAR_H
      raw = { c, cx, ax: a.getContext('2d', { willReadFrequently: true })! }
    }
    const { c, cx, ax } = raw
    cx.drawImage(v, 0, 0, AVATAR_W, AVATAR_H, 0, 0, AVATAR_W, AVATAR_H)
    ax.drawImage(v, 0, AVATAR_H, AVATAR_W, AVATAR_H, 0, 0, AVATAR_W, AVATAR_H)
    const col = cx.getImageData(0, 0, AVATAR_W, AVATAR_H)
    restoreAlpha(col.data, ax.getImageData(0, 0, AVATAR_W, AVATAR_H).data)
    cx.putImageData(col, 0, 0)
    paintHolo(x, c, f, Math.random)
  }

  loadPoster()

  return {
    canvas,
    state: () => (live ? 'live' : posterReady ? 'poster' : failed ? 'failed' : 'idle'),
    setActive(on) {
      if (on === active) return
      active = on
      if (on && !isStill && !failed) {
        if (!video) startVideo()
        else void video.play().catch(() => {})
      } else video?.pause()
    },
    setStill(s) {
      if (s === isStill) return
      isStill = s
      dirty = true
      if (s) {
        live = false
        video?.pause()
      } else if (active) {
        if (!video) startVideo()
        else void video.play().catch(() => {})
      }
    },
    frame(clock, now) {
      if (isStill || failed || !video || video.readyState < 2 || video.paused) {
        // The still: painted once (and again when its mode changes), deterministic.
        if (!dirty || !posterReady || (live && !isStill)) return false
        paintHolo(x, posterImg!, holoFrame(0, AVATAR_H, Math.random, true), seeded(7))
        dirty = false
        live = false
        return true
      }
      if (now - last < 1000 / FPS) return false
      last = now
      const f = holoFrame(clock, AVATAR_H, Math.random, false)
      if (stacked) paintStacked(video, f)
      else paintHolo(x, video, f, Math.random)
      live = true
      dirty = true
      return true
    },
    dispose() {
      disposed = true
      video?.pause()
      video?.remove()
      video = null
    },
  }
}

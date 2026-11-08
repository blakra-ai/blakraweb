/**
 * Whether this device should run the 3D world, decided before three.js is downloaded:
 * WebGL2 on real graphics hardware. Software renderers (lab tools, VMs, some remote
 * desktops) keep the rendered still instead. ?gl=force runs the world anyway.
 */
export function canRunWorld(): boolean {
  if (new URLSearchParams(location.search).get('gl') === 'force') return true
  // Chrome and Firefox refuse this flag on software rasterizers. Phones are taken generously: a
  // phone GPU that declines the flag still runs the world (the governor scales it down), unless its
  // renderer is a software one.
  let gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true })
  if (!gl && window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches) gl = document.createElement('canvas').getContext('webgl2')
  if (!gl) return false
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '')
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return !/swiftshader|llvmpipe|software|basic render/i.test(name)
}

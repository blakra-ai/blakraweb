import { DataTexture, LinearFilter, RedFormat, RepeatWrapping, UnsignedByteType } from 'three'

let shared: DataTexture | null = null

/** A 256×256 tiling value-noise texture (one channel), baked once for every shader that needs noise. */
export function noiseTexture() {
  if (shared) return shared
  const N = 256
  const G = 16
  const grid = new Float32Array(G * G)
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < grid.length; i++) grid[i] = rnd()
  const at = (x: number, y: number) => grid[((y + G) % G) * G + ((x + G) % G)]
  const data = new Uint8Array(N * N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const gx = (x / N) * G
      const gy = (y / N) * G
      const ix = Math.floor(gx)
      const iy = Math.floor(gy)
      const fx = gx - ix
      const fy = gy - iy
      const ux = fx * fx * (3 - 2 * fx)
      const uy = fy * fy * (3 - 2 * fy)
      const v = (at(ix, iy) * (1 - ux) + at(ix + 1, iy) * ux) * (1 - uy) + (at(ix, iy + 1) * (1 - ux) + at(ix + 1, iy + 1) * ux) * uy
      data[y * N + x] = Math.round(v * 255)
    }
  shared = new DataTexture(data, N, N, RedFormat, UnsignedByteType)
  shared.wrapS = shared.wrapT = RepeatWrapping
  shared.magFilter = shared.minFilter = LinearFilter
  shared.needsUpdate = true
  return shared
}

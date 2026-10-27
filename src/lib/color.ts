// Small sRGB helpers shared by the sky shader, the live ink switch and the contrast tests.

export type RGB = readonly [number, number, number] // 0..1, sRGB-encoded

export function hex(value: string): RGB {
  const h = value.replace('#', '')
  const n = Number.parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function toHex([r, g, b]: RGB): string {
  const to = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function add(a: RGB, b: RGB, k: number): RGB {
  return [Math.min(1, a[0] + b[0] * k), Math.min(1, a[1] + b[1] * k), Math.min(1, a[2] + b[2] * k)]
}

/** WCAG 2.x relative luminance. */
export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

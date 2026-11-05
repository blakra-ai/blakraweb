/**
 * The path the site is served under: '/' on blakra.us, '/blakraweb/' on the GitHub Pages copy
 * (set at build time by SITE_BASE, vite.config.ts). Everything that asks the browser for one of our
 * own URLs goes through withBase; everything written for search (canonical, hreflang, OG, sitemap,
 * llms) goes through stripBase, so it always names blakra.us at the root.
 */
export const BASE: string = import.meta.env.BASE_URL

export function withBase(path: string): string {
  return `${BASE.slice(0, -1)}${path}`
}

export function stripBase(path: string): string {
  if (BASE === '/') return path
  if (path === BASE.slice(0, -1)) return '/'
  return path.startsWith(BASE) ? path.slice(BASE.length - 1) : path
}

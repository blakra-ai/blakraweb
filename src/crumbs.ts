import type { Dict } from './content/types'
import { work } from './content/work'
import { pathFor, workPath, type Route } from './routes'

/** The breadcrumb trail a page shows (and marks up): name and absolute URL, home first. */
export function breadcrumbs(route: Pick<Route, 'id' | 'locale' | 'slug'>, t: Dict): { name: string; href: string }[] {
  const home = { name: t.ui.crumbs.home, href: pathFor('home', route.locale) }
  switch (route.id) {
    case 'about':
      return [home, { name: t.about.eyebrow, href: pathFor('about', route.locale) }]
    case 'investors':
      return [home, { name: t.investors.eyebrow, href: pathFor('investors', route.locale) }]
    case 'privacy':
      return [home, { name: t.privacy.eyebrow, href: pathFor('privacy', route.locale) }]
    case 'legal':
      return [home, { name: t.footer.legal, href: pathFor('legal', route.locale) }]
    case 'work': {
      const project = work.find((p) => p.slug === route.slug)!
      return [home, { name: t.work.eyebrow, href: pathFor('home', route.locale, '#work') }, { name: project.name, href: workPath(project.slug, route.locale) }]
    }
    default:
      return [home]
  }
}

import { breadcrumbs } from '../crumbs'
import { useI18n } from '../i18n'
import type { PageId } from '../routes'
import type { WorkSlug } from '../content/work'
import s from './Breadcrumbs.module.css'

/** The visible trail on inner pages; the same items are marked up as BreadcrumbList in head.ts. */
export function Breadcrumbs({ id, slug, className = '' }: { id: PageId; slug?: WorkSlug; className?: string }) {
  const { t, locale } = useI18n()
  const items = breadcrumbs({ id, locale, slug }, t)
  return (
    <nav className={`mono ${s.crumbs} ${className}`} aria-label={t.ui.crumbs.label}>
      <ol>
        {items.map((c, i) => (
          <li key={c.href}>
            {i < items.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

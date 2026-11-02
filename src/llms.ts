import { aiTools, company, layerOrder, products } from './content/shared'
import type { Dict } from './content/types'
import { work } from './content/work'
import { availableLocales, locales } from './i18n'
import { pathFor, workPath } from './routes'

/**
 * llms.txt (llmstxt.org) and llms-full.txt: the site's own English words for language models and
 * answer engines, written at build time from the same dictionary the pages render, so neither file
 * can say more than the site does. scripts/prerender.mjs writes them to dist/.
 */
export function renderLlms(t: Dict, full: boolean): string {
  const u = (p: string) => `${company.url}${p}`
  const lines: string[] = []
  const p = (...s: string[]) => lines.push(...s, '')

  p(`# ${company.name}`)
  p(`> ${t.meta.homeDescription}`)
  p(
    `- Legal name: ${company.legalName}, founded ${company.founded}, ${company.address.street}, ${company.address.city}, ${company.address.region} ${company.address.postalCode}, USA`,
    `- Contact: ${company.email} (reply within ${company.replyHours} hours) or the form at ${u(pathFor('home', 'en', '#contact'))}`,
    `- Languages of this site: ${availableLocales.map((l) => `${locales[l].label} (${u(pathFor('home', l))})`).join(', ')}`,
  )

  p('## Pages')
  p(
    `- [Home](${u('/')}): ${t.meta.homeDescription}`,
    `- [About](${u(pathFor('about', 'en'))}): ${t.meta.aboutDescription}`,
    `- [Sponsors and buyers](${u(pathFor('investors', 'en'))}): ${t.meta.investorsDescription}`,
    `- [Privacy](${u(pathFor('privacy', 'en'))}): ${t.meta.privacyDescription}`,
    `- [Legal notice](${u(pathFor('legal', 'en'))}): ${t.meta.legalDescription}`,
  )

  p(`## ${t.work.eyebrow}`, t.work.note)
  p(...work.map((w) => `- [${w.name}: ${t.work.projects[w.slug].category}](${u(workPath(w.slug, 'en'))}): ${t.work.projects[w.slug].line}`))

  p('## Products')
  p(...products.filter((x) => !x.draft).map((x) => `- ${x.name} (${x.platforms.join(', ')}${x.href ? `, ${x.href}` : ''}): ${t.products.items[x.id].line}`))

  if (!full) {
    p('## Optional', `- [Full text of the site](${u('/llms-full.txt')}): the site's English text in one file`)
    return lines.join('\n')
  }

  p(`## ${t.prologue.title.before} ${t.prologue.title.human}${t.prologue.title.after}`, t.prologue.lede, t.prologue.facts)

  p(`## ${t.engine.title}`, t.engine.lede)
  p(...layerOrder.map((id) => `- ${t.engine.layers[id].name}: ${t.engine.layers[id].text}`))

  p(`## ${t.ai.title}`, t.ai.lede)
  p(...Object.values(t.ai.blocks).map((b) => `- ${b.name}: ${b.text}`))
  p(`- ${t.ai.open.name}: ${t.ai.open.text} (${aiTools.open.join(', ')})`, `- ${t.ai.platforms.name}: ${t.ai.platforms.text} (${aiTools.platforms.join(', ')})`)
  p(t.ai.closer)

  p(`## ${t.products.title}`, t.products.lede)
  p(...products.filter((x) => !x.draft).map((x) => `- ${x.name}: ${t.products.items[x.id].line} ${t.products.items[x.id].detail} ${t.products.items[x.id].offer}`), t.products.more)

  p(`## ${t.process.title}`, t.process.lede)
  p(...t.process.steps.map((s) => `- ${s.name}: ${s.text}`))
  p(...t.process.terms.map((s) => `- ${s}`))
  p(t.process.notFit)

  p(`## ${t.people.title}`, t.people.lede)
  p(...t.people.roles.map((r) => `- ${r.role}: ${r.owns}`), t.people.bench)

  p(`## ${t.about.title}`, ...t.about.story)
  p(`### ${t.about.trustTitle}`, ...t.about.trust.map((s) => `- ${s}`))
  lines.push('')
  p(`### ${t.about.engageTitle}`, ...t.about.engage.map((s) => `- ${s.name}: ${s.text}`))
  lines.push('')
  p(`### ${t.about.industriesTitle}`, t.about.industries.join(', '), t.about.nda)
  p(`### ${t.about.faqTitle}`)
  for (const f of t.about.faq) p(`**${f.q}**`, f.a)

  p(`## ${t.work.title}`, t.work.lede, t.work.note)
  for (const w of work) {
    const x = t.work.projects[w.slug]
    p(`### ${w.name}: ${x.category}`, `${u(workPath(w.slug, 'en'))}`, x.line, x.about, `${t.work.platforms}: ${x.platforms}`, `${t.work.problem}: ${x.problem}`)
    p(`${t.work.design}:`, ...x.design.map((d) => `- ${d}`))
  }

  p(`## ${t.investors.title}`, t.investors.lede, ...t.investors.thesis, t.investors.ask, t.investors.deck)

  p(`## ${t.contact.title}`, t.contact.lede, `${company.email}`)
  return lines.join('\n')
}

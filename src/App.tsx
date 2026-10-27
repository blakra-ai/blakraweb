import './styles/global.css'
import type { JSX } from 'react'
import type { Dict } from './content/types'
import { times } from './content/shared'
import type { SkyId } from './motion/sky/palettes'
import { I18nProvider } from './i18n'
import type { PageId, Route } from './routes'
import { MotionProvider } from './motion/MotionProvider'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { Investors, Legal, NotFound, Privacy } from './pages/Simple'

const pages: Record<PageId, { Page: () => JSX.Element; footer: SkyId; time: number }> = {
  home: { Page: Home, footer: 'dawn', time: times.tomorrow + 1 },
  investors: { Page: Investors, footer: 'night', time: 120 },
  privacy: { Page: Privacy, footer: 'ink', time: 780 },
  legal: { Page: Legal, footer: 'ink', time: 780 },
  notFound: { Page: NotFound, footer: 'night', time: 0 },
}

export function App({ route, dict }: { route: Route; dict: Dict }) {
  const { Page, footer, time } = pages[route.id]
  return (
    <I18nProvider locale={route.locale} dict={dict}>
      <MotionProvider>
        <a className="skip" href="#main">
          {dict.ui.skip}
        </a>
        <Header route={route} />
        <main id="main" tabIndex={-1}>
          <Page />
        </main>
        <Footer route={route} sky={footer} time={time} />
        <div className="grain" aria-hidden="true" />
      </MotionProvider>
    </I18nProvider>
  )
}

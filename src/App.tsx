import './styles/global.css'
import type { JSX } from 'react'
import type { Dict } from './content/types'
import { I18nProvider } from './i18n'
import type { PageId, Route } from './routes'
import { MotionProvider } from './motion/MotionProvider'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ObservatoryStage } from './features/observatory/Stage'
import { Home } from './pages/Home'
import { Investors, Legal, NotFound, Privacy } from './pages/Simple'

const pages: Record<PageId, { Page: () => JSX.Element; world?: boolean }> = {
  // The home page is the Observatory: its world (src/features/observatory) mounts once behind it; the others are plain.
  home: { Page: Home, world: true },
  investors: { Page: Investors },
  privacy: { Page: Privacy },
  legal: { Page: Legal },
  notFound: { Page: NotFound },
}

export function App({ route, dict }: { route: Route; dict: Dict }) {
  const { Page, world } = pages[route.id]
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
        <Footer route={route} />
        {world && <ObservatoryStage />}
      </MotionProvider>
    </I18nProvider>
  )
}

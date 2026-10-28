import './styles/global.css'
import type { JSX } from 'react'
import type { Dict } from './content/types'
import { I18nProvider } from './i18n'
import type { PageId, Route } from './routes'
import { MotionProvider } from './motion/MotionProvider'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Cursor } from './features/experience/cursor/Cursor'
import { FilmStage } from './features/experience/FilmStage'
import { Home } from './pages/Home'
import { Investors, Legal, NotFound, Privacy } from './pages/Simple'

const pages: Record<PageId, { Page: () => JSX.Element; film?: boolean }> = {
  // The home page is the film; the other pages are its paper.
  home: { Page: Home, film: true },
  investors: { Page: Investors },
  privacy: { Page: Privacy },
  legal: { Page: Legal },
  notFound: { Page: NotFound },
}

export function App({ route, dict }: { route: Route; dict: Dict }) {
  const { Page, film } = pages[route.id]
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
        {film && <FilmStage />}
        <Cursor />
      </MotionProvider>
    </I18nProvider>
  )
}

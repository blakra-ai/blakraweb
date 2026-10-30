import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/newsreader/opsz-italic.css'
import { Navigator } from './navigator/Navigator'
import './navigator/navigator.css'

createRoot(document.getElementById('root')!).render(<Navigator />)

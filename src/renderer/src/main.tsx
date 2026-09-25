import { createRoot } from 'react-dom/client'
import '@fontsource-variable/josefin-sans/wght.css'
import '@fontsource-variable/jost/wght.css'
import '@fontsource-variable/jost/wght-italic.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource-variable/jetbrains-mono/wght-italic.css'
import App from './App'
import './styles/base.css'

createRoot(document.getElementById('root')!).render(<App />)

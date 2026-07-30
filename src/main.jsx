import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './components/ThemeProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="localizer-theme">
      <App />
    </ThemeProvider>
  </StrictMode>,
)

// App booted successfully — allow the boot-recovery reload in index.html to trigger again on future failures
sessionStorage.removeItem('sl-boot-retry')

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { mediaPipeService } from './services/mediaPipeService'

// Asynchronously pre-warm the MediaPipe vision engine in background for instant detection startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    mediaPipeService.warmUp().catch(() => {});
  }, 100);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

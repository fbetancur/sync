import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initializeCrediSync } from './lib/app-config'
import { errorLogger } from './lib/monitoring/error-logger'

// Initialize Error Logger / Sentry
errorLogger.initialize({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION || '1.0.0',
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  enableLocalLogs: true,
})

// Register Service Worker (solo en producción)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('✅ Service Worker registered:', registration)
      },
      (error) => {
        console.error('❌ Service Worker registration error:', error)
      }
    )
  })
} else if (import.meta.env.DEV) {
  console.log('🔧 Modo desarrollo: Service Worker deshabilitado')
}

// Initialize CrediSync App using centralized configuration
initializeCrediSync().then(() => {
  console.log('✅ CrediSync App initialized successfully')
}).catch(err => {
  console.error('❌ Failed to initialize CrediSync App:', err)
})

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app

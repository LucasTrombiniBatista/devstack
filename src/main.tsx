import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from '@/app/App'
import { startApplyingSettings } from '@/app/apply-settings'
import { isDesktop } from '@/platform/runtime'

// Aplica tema e idioma antes do primeiro render para não piscar.
startApplyingSettings()()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (isDesktop) {
  void import('@/platform/desktop').then(({ initDesktop }) => initDesktop())
} else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Guarda o app para abrir sem internet depois da primeira visita.
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`./sw.js?v=${__BUILD_ID__}`)
  })
}

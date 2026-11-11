import i18n from '@/app/i18n'
import { useSettings, type Density, type Language, type Theme } from '@/app/settings-store'

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && Boolean(darkQuery()?.matches))
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

function applyDensity(density: Density) {
  document.documentElement.dataset.density = density
}

function applyLanguage(language: Language) {
  document.documentElement.lang = language
  if (i18n.language !== language) void i18n.changeLanguage(language)
}

function applyAll() {
  const { theme, density, language } = useSettings.getState()
  applyTheme(theme)
  applyDensity(density)
  applyLanguage(language)
}

/**
 * Aplica as preferências no documento e mantém tudo em dia quando elas mudam
 * (inclusive quando o sistema troca entre claro e escuro). Devolve a função de limpeza.
 */
export function startApplyingSettings(): () => void {
  applyAll()
  const unsubscribe = useSettings.subscribe(applyAll)
  const query = darkQuery()
  query?.addEventListener('change', applyAll)
  return () => {
    unsubscribe()
    query?.removeEventListener('change', applyAll)
  }
}

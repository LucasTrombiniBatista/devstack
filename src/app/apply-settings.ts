import { APPEARANCE_TOKENS, resolveAppearance, type Destaque, type Fundo } from '@/app/appearance'
import i18n from '@/app/i18n'
import { useSettings, type Density, type Language, type Theme } from '@/app/settings-store'

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function isDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && Boolean(darkQuery()?.matches))
}

function applyTheme(theme: Theme, fundo: Fundo, destaque: Destaque) {
  const dark = isDark(theme)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  const { tokens } = resolveAppearance(fundo, destaque, dark)
  for (const name of APPEARANCE_TOKENS) root.style.removeProperty(name)
  for (const [name, value] of Object.entries(tokens)) root.style.setProperty(name, value)
}

function applyDensity(density: Density) {
  document.documentElement.dataset.density = density
}

function applyLanguage(language: Language) {
  document.documentElement.lang = language
  if (i18n.language !== language) void i18n.changeLanguage(language)
}

function applyAll() {
  const { theme, density, language, fundo, destaque, navPosition, toolbarSide } =
    useSettings.getState()
  applyTheme(theme, fundo, destaque)
  document.documentElement.dataset.nav = navPosition
  document.documentElement.dataset.toolbar = toolbarSide
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

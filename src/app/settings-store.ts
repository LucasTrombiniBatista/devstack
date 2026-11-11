import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact'
export type Language = 'pt-BR' | 'en'

export const LANGUAGES: Language[] = ['pt-BR', 'en']

type SettingsState = {
  theme: Theme
  density: Density
  language: Language
  setTheme: (theme: Theme) => void
  setDensity: (density: Density) => void
  setLanguage: (language: Language) => void
}

function detectLanguage(): Language {
  const nav = typeof navigator === 'undefined' ? '' : navigator.language
  return nav.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export const defaultSettings = {
  theme: 'system' as Theme,
  density: 'comfortable' as Density,
  language: detectLanguage(),
}

/** Preferências de interface. Ficam no localStorage para aplicar antes do primeiro render. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'devstack:settings', version: 1 },
  ),
)

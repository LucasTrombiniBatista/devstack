import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Destaque, Fundo } from '@/app/appearance'

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact'
export type Language = 'pt-BR' | 'en'
export type NavPosition = 'side' | 'top'
export type ToolbarSide = 'right' | 'left'

export const LANGUAGES: Language[] = ['pt-BR', 'en']

type SettingsState = {
  theme: Theme
  density: Density
  language: Language
  /** Notificação do sistema quando uma fase do timer termina. */
  notify: boolean
  /** Som quando uma fase do timer termina. */
  sound: boolean
  /** Abrir o link do card em outra aba ao iniciar o foco. */
  openContent: boolean
  /** Paleta das superfícies e do texto. */
  fundo: Fundo
  /** Cor de botões, item ativo, foco e gráficos. */
  destaque: Destaque
  navPosition: NavPosition
  toolbarSide: ToolbarSide
  setTheme: (theme: Theme) => void
  setDensity: (density: Density) => void
  setLanguage: (language: Language) => void
  setNotify: (notify: boolean) => void
  setSound: (sound: boolean) => void
  setOpenContent: (openContent: boolean) => void
  setFundo: (fundo: Fundo) => void
  setDestaque: (destaque: Destaque) => void
  setNavPosition: (navPosition: NavPosition) => void
  setToolbarSide: (toolbarSide: ToolbarSide) => void
  /** Aplica fundo, destaque e tema de uma vez (combinações prontas). */
  setPalette: (palette: { fundo: Fundo; destaque: Destaque; theme: Theme }) => void
  resetAppearance: () => void
}

function detectLanguage(): Language {
  const nav = typeof navigator === 'undefined' ? '' : navigator.language
  return nav.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export const defaultSettings = {
  theme: 'system' as Theme,
  density: 'comfortable' as Density,
  language: detectLanguage(),
  notify: true,
  sound: true,
  openContent: true,
  fundo: 'creme' as Fundo,
  destaque: 'padrao' as Destaque,
  navPosition: 'side' as NavPosition,
  toolbarSide: 'right' as ToolbarSide,
}

/** Preferências de interface. Ficam no localStorage para aplicar antes do primeiro render. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setLanguage: (language) => set({ language }),
      setNotify: (notify) => set({ notify }),
      setSound: (sound) => set({ sound }),
      setOpenContent: (openContent) => set({ openContent }),
      setFundo: (fundo) => set({ fundo }),
      setDestaque: (destaque) => set({ destaque }),
      setNavPosition: (navPosition) => set({ navPosition }),
      setToolbarSide: (toolbarSide) => set({ toolbarSide }),
      setPalette: (palette) => set(palette),
      resetAppearance: () =>
        set({
          theme: defaultSettings.theme,
          fundo: defaultSettings.fundo,
          destaque: defaultSettings.destaque,
          navPosition: defaultSettings.navPosition,
          toolbarSide: defaultSettings.toolbarSide,
        }),
    }),
    {
      name: 'devstack:settings',
      version: 2,
      // Versão 1 não tinha aparência; os campos novos começam no padrão.
      migrate: (persisted) => ({ ...defaultSettings, ...(persisted as object) }) as SettingsState,
    },
  ),
)

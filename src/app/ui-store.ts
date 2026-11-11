import { create } from 'zustand'

type UiState = {
  /** Card aberto no painel lateral. */
  openCardId: string | null
  openCard: (id: string) => void
  closeCard: () => void

  /** Paleta de comandos (Ctrl/Cmd + K). */
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void

  /** Texto no diálogo de importar lista; `null` quando fechado. */
  importText: string | null
  openImport: (text?: string) => void
  closeImport: () => void
}

export const useUi = create<UiState>()((set) => ({
  openCardId: null,
  openCard: (openCardId) => set({ openCardId }),
  closeCard: () => set({ openCardId: null }),

  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

  importText: null,
  openImport: (text = '') => set({ importText: text, paletteOpen: false }),
  closeImport: () => set({ importText: null }),
}))

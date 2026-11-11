import { create } from 'zustand'

type UiState = {
  /** Card aberto no painel lateral. */
  openCardId: string | null
  openCard: (id: string) => void
  closeCard: () => void
}

export const useUi = create<UiState>()((set) => ({
  openCardId: null,
  openCard: (openCardId) => set({ openCardId }),
  closeCard: () => set({ openCardId: null }),
}))

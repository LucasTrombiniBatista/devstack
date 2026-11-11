import { create } from 'zustand'
import type { Card, CardPrioridade, CardTipo } from '@/data/types'
import { normalizeText } from '@/lib/format'

export type BoardFilters = {
  search: string
  /** `null` mostra todas as trilhas. */
  trackId: string | null
  tipos: CardTipo[]
  prioridades: CardPrioridade[]
  plataformas: string[]
  tags: string[]
}

export const EMPTY_FILTERS: BoardFilters = {
  search: '',
  trackId: null,
  tipos: [],
  prioridades: [],
  plataformas: [],
  tags: [],
}

/** Busca em título, tags, plataforma e notas; cada grupo de filtro restringe o resultado. */
export function matchesFilters(card: Card, filters: BoardFilters): boolean {
  if (filters.trackId !== null && card.trackId !== filters.trackId) return false
  if (filters.tipos.length > 0 && !filters.tipos.includes(card.tipo)) return false
  if (filters.prioridades.length > 0 && !filters.prioridades.includes(card.prioridade)) return false
  if (
    filters.plataformas.length > 0 &&
    (card.plataforma === null || !filters.plataformas.includes(card.plataforma))
  ) {
    return false
  }
  if (!filters.tags.every((tag) => card.tags.includes(tag))) return false

  const terms = normalizeText(filters.search).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizeText(
    [card.titulo, card.plataforma ?? '', card.notasMd, ...card.tags.map((tag) => `#${tag}`)].join(
      '\n',
    ),
  )
  return terms.every((term) => haystack.includes(term))
}

/** Quantos grupos do painel de filtros estão em uso (busca e trilha têm controles próprios). */
export function activeFilterCount(filters: BoardFilters): number {
  return [filters.tipos, filters.prioridades, filters.plataformas, filters.tags].filter(
    (group) => group.length > 0,
  ).length
}

export function hasAnyFilter(filters: BoardFilters): boolean {
  return filters.search.trim() !== '' || filters.trackId !== null || activeFilterCount(filters) > 0
}

type ListKey = 'tipos' | 'prioridades' | 'plataformas' | 'tags'

type BoardViewState = BoardFilters & {
  groupByTrack: boolean
  setSearch: (search: string) => void
  setTrack: (trackId: string | null) => void
  toggle: (key: ListKey, value: string) => void
  setGroupByTrack: (groupByTrack: boolean) => void
  clearPanel: () => void
  reset: () => void
}

export const useBoardView = create<BoardViewState>()((set) => ({
  ...EMPTY_FILTERS,
  groupByTrack: false,
  setSearch: (search) => set({ search }),
  setTrack: (trackId) => set({ trackId }),
  toggle: (key, value) =>
    set((state) => {
      const list = state[key] as string[]
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      return { [key]: next } as Partial<BoardViewState>
    }),
  setGroupByTrack: (groupByTrack) => set({ groupByTrack }),
  clearPanel: () => set({ tipos: [], prioridades: [], plataformas: [], tags: [] }),
  reset: () => set({ ...EMPTY_FILTERS, groupByTrack: false }),
}))

import type { Card, Column, Track } from '@/data/types'
import { matchesFilters, type BoardFilters } from './filters'

/** Raia única, usada quando o quadro não está agrupado por trilha. */
export const NO_LANE = '*'
/** Raia dos cards sem trilha, no quadro agrupado. */
export const NO_TRACK = 'none'
/** Quantos cards cada célula mostra antes do "Mostrar mais". Mantém o arrastar leve com backlog grande. */
export const PAGE_SIZE = 50

export type Lane = { id: string; track: Track | null }
/** Ids dos cards visíveis em cada célula (raia × coluna), já em ordem. */
export type Cells = Record<string, string[]>

export const cellKey = (laneId: string, columnId: string) => `${laneId}|${columnId}`

export function parseCell(key: string): { laneId: string; columnId: string } {
  const i = key.indexOf('|')
  return { laneId: key.slice(0, i), columnId: key.slice(i + 1) }
}

export function buildLanes(tracks: Track[], grouped: boolean, trackId: string | null): Lane[] {
  if (!grouped) return [{ id: NO_LANE, track: null }]
  const lanes: Lane[] = tracks.map((track) => ({ id: track.id, track }))
  if (trackId !== null) return lanes.filter((lane) => lane.id === trackId)
  return [...lanes, { id: NO_TRACK, track: null }]
}

const inLane = (card: Card, laneId: string) =>
  laneId === NO_LANE || (laneId === NO_TRACK ? card.trackId === null : card.trackId === laneId)

/**
 * Distribui os cards (já ordenados) pelas células, aplicando filtros e o limite por célula.
 * `totals` guarda quantos cards passam no filtro em cada célula, antes do limite.
 */
export function buildCells(
  cards: Card[],
  columns: Column[],
  lanes: Lane[],
  filters: BoardFilters,
  limits: Record<string, number>,
): { cells: Cells; totals: Record<string, number> } {
  const cells: Cells = {}
  const totals: Record<string, number> = {}
  for (const lane of lanes) {
    for (const column of columns) {
      cells[cellKey(lane.id, column.id)] = []
      totals[cellKey(lane.id, column.id)] = 0
    }
  }
  for (const card of cards) {
    if (!matchesFilters(card, filters)) continue
    const lane = lanes.find((l) => inLane(card, l.id))
    if (!lane) continue
    const key = cellKey(lane.id, card.columnId)
    if (!(key in cells)) continue
    totals[key] += 1
    if (cells[key].length < (limits[key] ?? PAGE_SIZE)) cells[key].push(card.id)
  }
  return { cells, totals }
}

/** Célula que contém o id (ou a própria célula, se o id for de uma). */
export function findCell(cells: Cells, id: string): string | undefined {
  if (id in cells) return id
  return Object.keys(cells).find((key) => cells[key].includes(id))
}

/**
 * Posição na coluna completa para um card solto entre dois vizinhos visíveis.
 * Com filtros ou "Mostrar mais", a lista visível é só parte da coluna; por isso a
 * posição é calculada em relação ao vizinho, não ao índice na tela.
 */
export function targetIndex(
  siblingIds: string[],
  prevVisibleId: string | undefined,
  nextVisibleId: string | undefined,
): number {
  const prev = prevVisibleId === undefined ? -1 : siblingIds.indexOf(prevVisibleId)
  if (prev >= 0) return prev + 1
  const next = nextVisibleId === undefined ? -1 : siblingIds.indexOf(nextVisibleId)
  if (next >= 0) return next
  return siblingIds.length
}

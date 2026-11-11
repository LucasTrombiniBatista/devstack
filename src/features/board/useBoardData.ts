import { useLiveQuery } from 'dexie-react-hooks'
import {
  boardsRepo,
  cardsRepo,
  checklistRepo,
  columnsRepo,
  sessionsRepo,
  tracksRepo,
} from '@/data/repos'
import type { Board, Card, Column, Track } from '@/data/types'

export type ChecklistCount = { done: number; total: number }

export type BoardData = {
  board: Board
  columns: Column[]
  /** Todos os cards do quadro, em ordem. */
  cards: Card[]
  tracks: Track[]
  checklist: Map<string, ChecklistCount>
  /** Minutos de foco registrados por card. */
  spent: Map<string, number>
}

async function loadBoard(): Promise<BoardData | null> {
  const [board] = await boardsRepo.list()
  if (!board) return null
  const [columns, cards, tracks, items, spent] = await Promise.all([
    columnsRepo.listByBoard(board.id),
    cardsRepo.listByBoard(board.id),
    tracksRepo.listSorted(),
    checklistRepo.list(),
    sessionsRepo.focusMinutesByCard(),
  ])
  const checklist = new Map<string, ChecklistCount>()
  for (const item of items) {
    const count = checklist.get(item.cardId) ?? { done: 0, total: 0 }
    count.total += 1
    if (item.feito) count.done += 1
    checklist.set(item.cardId, count)
  }
  return { board, columns, cards, tracks, checklist, spent }
}

/** Dados do quadro, atualizados sozinhos quando o banco muda. `undefined` enquanto carrega. */
export function useBoardData(): BoardData | null | undefined {
  return useLiveQuery(loadBoard)
}

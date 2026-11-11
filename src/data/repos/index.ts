import { db } from '@/data/db'
import type { ChecklistItem, Column, Data, Track } from '@/data/types'
import { byOrdem, ordemAtEnd, ordemAtIndex } from '@/lib/order'
import { bump, createRepo } from './base'

export { cardsRepo, type NewCard } from './cards'

export const boardsRepo = createRepo(db.boards)
export const sessionsRepo = createRepo(db.sessions)
export const planBlocksRepo = createRepo(db.planBlocks)
export const dailyGoalsRepo = createRepo(db.dailyGoals)
export const settingsRepo = createRepo(db.settings)

const tracksBase = createRepo(db.tracks)

export const tracksRepo = {
  ...tracksBase,

  /** Trilhas na ordem em que foram criadas. */
  async listSorted(): Promise<Track[]> {
    return (await tracksBase.list()).sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1))
  },

  /** Apaga a trilha e deixa os cards dela sem trilha. */
  async removeAndDetach(id: string): Promise<void> {
    await db.transaction('rw', db.tracks, db.cards, async () => {
      const cards = (await db.cards.where('trackId').equals(id).toArray()).filter(
        (card) => card.removidoEm === null,
      )
      await db.cards.bulkPut(cards.map((card) => bump(card, { trackId: null })))
      await tracksBase.remove(id)
    })
  },
}

const columnsBase = createRepo(db.columns)

async function listColumns(boardId: string): Promise<Column[]> {
  return (await columnsBase.listBy('boardId', boardId)).sort(byOrdem)
}

export const columnsRepo = {
  ...columnsBase,
  listByBoard: listColumns,

  /** Cria a coluna no fim do quadro. */
  async create(input: Pick<Column, 'boardId' | 'nome'> & Partial<Data<Column>>): Promise<Column> {
    return db.transaction('rw', db.columns, async () =>
      columnsBase.create({
        limiteWip: null,
        papel: null,
        ordem: ordemAtEnd(await listColumns(input.boardId)),
        ...input,
      }),
    )
  },

  /** Move a coluna para a posição `index` do quadro (contando sem ela). */
  async move(id: string, index: number): Promise<Column> {
    return db.transaction('rw', db.columns, async () => {
      const column = await columnsBase.get(id)
      if (!column) throw new Error(`columns: registro ${id} não encontrado`)
      const siblings = (await listColumns(column.boardId)).filter((c) => c.id !== id)
      const next = bump(column, { ordem: ordemAtIndex(siblings, index) })
      await db.columns.put(next)
      return next
    })
  },
}

const checklistBase = createRepo(db.checklistItems)

async function listChecklist(cardId: string): Promise<ChecklistItem[]> {
  return (await checklistBase.listBy('cardId', cardId)).sort(byOrdem)
}

export const checklistRepo = {
  ...checklistBase,
  listByCard: listChecklist,

  /** Acrescenta o item no fim da checklist do card. */
  async create(input: Pick<ChecklistItem, 'cardId' | 'texto'> & { feito?: boolean }) {
    return db.transaction('rw', db.checklistItems, async () =>
      checklistBase.create({
        feito: false,
        ...input,
        ordem: ordemAtEnd(await listChecklist(input.cardId)),
      }),
    )
  },
}

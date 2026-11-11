import { db } from '@/data/db'
import type {
  ChecklistItem,
  Column,
  DailyGoal,
  Data,
  PlanBlock,
  Session,
  Track,
} from '@/data/types'
import { byOrdem, ordemAtEnd, ordemAtIndex } from '@/lib/order'
import { bump, createRepo } from './base'

export { cardsRepo, type NewCard } from './cards'

export const boardsRepo = createRepo(db.boards)
export const settingsRepo = createRepo(db.settings)

const sessionsBase = createRepo(db.sessions)

export const sessionsRepo = {
  ...sessionsBase,

  /** Sessões do card, da mais recente para a mais antiga. */
  async listByCard(cardId: string): Promise<Session[]> {
    return (await sessionsBase.listBy('cardId', cardId)).sort((a, b) =>
      a.inicio < b.inicio ? 1 : -1,
    )
  },

  /** Minutos de foco somados por card. */
  async focusMinutesByCard(): Promise<Map<string, number>> {
    const total = new Map<string, number>()
    for (const session of await sessionsBase.list()) {
      if (session.tipo !== 'foco' || session.cardId === null) continue
      total.set(session.cardId, (total.get(session.cardId) ?? 0) + session.duracaoMin)
    }
    return total
  },

  /**
   * Grava um foco medido pelo timer. Duas abas abertas fecham a mesma fase ao mesmo
   * tempo; o início igual identifica a repetição e só a primeira gravação vale.
   */
  async recordFocus(focus: {
    cardId: string | null
    inicio: number
    fim: number
    duracaoMin: number
  }): Promise<Session | null> {
    const inicio = new Date(focus.inicio).toISOString()
    return db.transaction('rw', db.sessions, async () => {
      if ((await db.sessions.where('inicio').equals(inicio).count()) > 0) return null
      return sessionsBase.create({
        cardId: focus.cardId,
        inicio,
        fim: new Date(focus.fim).toISOString(),
        duracaoMin: focus.duracaoMin,
        tipo: 'foco',
        origem: 'timer',
      })
    })
  },

  /** Sessão lançada à mão, para quando o timer não foi iniciado. */
  async createManual(cardId: string, inicio: Date, duracaoMin: number): Promise<Session> {
    return sessionsBase.create({
      cardId,
      inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + duracaoMin * 60_000).toISOString(),
      duracaoMin,
      tipo: 'foco',
      origem: 'manual',
    })
  },

  /** Corrige a data ou a duração, mantendo o fim coerente com o início. */
  async reschedule(id: string, inicio: Date, duracaoMin: number): Promise<Session> {
    return sessionsBase.update(id, {
      inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + duracaoMin * 60_000).toISOString(),
      duracaoMin,
    })
  },
}

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

const planBase = createRepo(db.planBlocks)

export const planBlocksRepo = {
  ...planBase,

  /** Blocos dos dias pedidos, em ordem de dia e horário. */
  async listByDays(days: string[]): Promise<PlanBlock[]> {
    return (await db.planBlocks.where('dia').anyOf(days).toArray())
      .filter((block) => block.removidoEm === null)
      .sort((a, b) => (a.dia + a.inicio < b.dia + b.inicio ? -1 : 1))
  },
}

/** Meta usada quando a pessoa nunca definiu uma: 2 horas de foco. */
export const DEFAULT_GOAL = { tipoMeta: 'horas', valorMeta: 120 } as const

const goalsBase = createRepo(db.dailyGoals)

export const dailyGoalsRepo = {
  ...goalsBase,

  /** Meta do dia. Sem meta própria, o dia herda a última definida antes dele. */
  async forDay(
    day: string,
  ): Promise<Pick<DailyGoal, 'tipoMeta' | 'valorMeta'> & { id: string | null }> {
    const goals = (await goalsBase.list())
      .filter((goal) => goal.data <= day)
      .sort((a, b) => (a.data < b.data ? 1 : -1))
    const [latest] = goals
    if (!latest) return { ...DEFAULT_GOAL, id: null }
    return {
      tipoMeta: latest.tipoMeta,
      valorMeta: latest.valorMeta,
      id: latest.data === day ? latest.id : null,
    }
  },

  async setForDay(day: string, tipoMeta: DailyGoal['tipoMeta'], valorMeta: number) {
    const current = await dailyGoalsRepo.forDay(day)
    if (current.id) return goalsBase.update(current.id, { tipoMeta, valorMeta })
    return goalsBase.create({ data: day, tipoMeta, valorMeta })
  },
}

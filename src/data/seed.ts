import { db } from '@/data/db'
import type { Board, Column, ColumnPapel, Settings } from '@/data/types'
import { ordemSequence } from '@/lib/order'
import { stamp } from './repos/base'

export const SETTINGS_ID = 'app'

/** Colunas padrão do DevStack.md, seção 3.1, na ordem do fluxo. */
export const DEFAULT_COLUMNS: { papel: ColumnPapel; limiteWip: number | null }[] = [
  { papel: 'backlog', limiteWip: null },
  { papel: 'semana', limiteWip: null },
  { papel: 'hoje', limiteWip: null },
  { papel: 'estudando', limiteWip: 2 },
  { papel: 'revisao', limiteWip: null },
  { papel: 'feito', limiteWip: null },
]

export const DEFAULT_SETTINGS = {
  capacidadeSemanalMin: 10 * 60,
  pomodoro: { focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15, ciclosAtePausaLonga: 4 },
}

export type SeedLabels = { board: string; columns: Record<ColumnPapel, string> }

/**
 * Cria o quadro inicial e as configurações se o banco estiver vazio.
 * Roda numa transação, então chamar duas vezes ao mesmo tempo não duplica nada.
 */
export async function ensureSeed(labels: SeedLabels): Promise<void> {
  await db.transaction('rw', db.boards, db.columns, db.settings, async () => {
    if ((await db.settings.get(SETTINGS_ID)) === undefined) {
      await db.settings.add(stamp<Settings>(DEFAULT_SETTINGS, SETTINGS_ID))
    }

    if ((await db.boards.count()) > 0) return

    const board = stamp<Board>({ nome: labels.board })
    const ordens = ordemSequence(DEFAULT_COLUMNS.length)
    await db.boards.add(board)
    await db.columns.bulkAdd(
      DEFAULT_COLUMNS.map(({ papel, limiteWip }, i) =>
        stamp<Column>({
          boardId: board.id,
          nome: labels.columns[papel],
          ordem: ordens[i],
          limiteWip,
          papel,
        }),
      ),
    )
  })
}

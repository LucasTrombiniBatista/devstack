import { db } from '@/data/db'
import type { Card, Data } from '@/data/types'
import { byOrdem, ordemAtEnd, ordemAtIndex } from '@/lib/order'
import { nowIso } from '@/lib/ids'
import { bump, createRepo } from './base'

const base = createRepo(db.cards)

export type NewCard = Pick<Card, 'boardId' | 'columnId' | 'titulo'> &
  Partial<Omit<Data<Card>, 'ordem' | 'concluidoEm'>> & {
    /** Onde entra na coluna; o padrão é o fim. */
    posicao?: 'inicio' | 'fim'
  }

async function listByColumn(columnId: string): Promise<Card[]> {
  return (await base.listBy('columnId', columnId)).sort(byOrdem)
}

/** Data de conclusão segue a coluna: entra em "Feito", ganha; sai, perde. */
async function concluidoEmFor(columnId: string, current: string | null): Promise<string | null> {
  const column = await db.columns.get(columnId)
  if (column?.papel !== 'feito') return null
  return current ?? nowIso()
}

export const cardsRepo = {
  ...base,
  listByColumn,

  async listByBoard(boardId: string): Promise<Card[]> {
    return (await base.listBy('boardId', boardId)).sort(byOrdem)
  },

  /** Cria o card no fim da coluna (ou no início, com `posicao`). */
  async create({ posicao = 'fim', ...input }: NewCard): Promise<Card> {
    return db.transaction('rw', db.cards, db.columns, async () => {
      const siblings = await listByColumn(input.columnId)
      return base.create({
        trackId: null,
        url: null,
        tipo: 'leitura',
        plataforma: null,
        tags: [],
        prioridade: 'media',
        estimativaMin: null,
        progresso: 0,
        dataAlvo: null,
        notasMd: '',
        miniaturaUrl: null,
        links: [],
        ...input,
        ordem: posicao === 'inicio' ? ordemAtIndex(siblings, 0) : ordemAtEnd(siblings),
        concluidoEm: await concluidoEmFor(input.columnId, null),
      })
    })
  },

  /**
   * Move o card para a posição `index` da coluna (contando sem ele).
   * Só o registro do card movido é gravado, graças ao índice fracionário.
   * `patch` troca a trilha junto, quando o card é solto em outra raia.
   */
  async move(
    id: string,
    columnId: string,
    index: number,
    patch: Partial<Pick<Card, 'trackId'>> = {},
  ): Promise<Card> {
    return db.transaction('rw', db.cards, db.columns, async () => {
      const card = await base.get(id)
      if (!card) throw new Error(`cards: registro ${id} não encontrado`)
      const siblings = (await listByColumn(columnId)).filter((c) => c.id !== id)
      const next = bump(card, {
        ...patch,
        columnId,
        ordem: ordemAtIndex(siblings, index),
        concluidoEm: await concluidoEmFor(columnId, card.concluidoEm),
      })
      await db.cards.put(next)
      return next
    })
  },
}

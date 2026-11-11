import { db } from '@/data/db'
import { stamp } from '@/data/repos/base'
import type { Card, ChecklistItem, Column, Track } from '@/data/types'
import { TRACK_COLORS } from '@/features/tracks/colors'
import { normalizeText } from '@/lib/format'
import { nowIso } from '@/lib/ids'
import { byOrdem, ordemSequence } from '@/lib/order'
import type { ParsedCard } from './parse'

const alive = <T extends { removidoEm: string | null }>(entity: T) => entity.removidoEm === null

/** Um card é "o mesmo" se tem o mesmo link; sem link, se tem o mesmo título na mesma trilha. */
const keyOf = (card: { url: string | null; titulo: string }, trilha: string | null) =>
  card.url ? `u:${card.url}` : `t:${normalizeText(card.titulo)}|${normalizeText(trilha ?? '')}`

export type ImportPlan = {
  /** Cards que ainda não existem no quadro. */
  novos: ParsedCard[]
  /** Quantos foram ignorados por já existirem (ou por se repetirem no próprio texto). */
  repetidos: number
}

/** Separa o que é novo do que já está no quadro, para importar a mesma lista duas vezes sem duplicar. */
export async function planImport(cards: ParsedCard[], boardId: string): Promise<ImportPlan> {
  const [existing, tracks] = await Promise.all([
    db.cards.where('boardId').equals(boardId).toArray(),
    db.tracks.toArray(),
  ])
  const trackNames = new Map(tracks.map((track) => [track.id, track.nome]))
  const onBoard = new Set(
    existing
      .filter(alive)
      .map((card) => keyOf(card, card.trackId ? (trackNames.get(card.trackId) ?? null) : null)),
  )
  // Dentro do próprio texto, dois cards podem apontar para o mesmo link (um curso e a
  // carreira que o contém); só é repetição se o título também for igual.
  const inText = new Set<string>()
  const novos: ParsedCard[] = []
  for (const card of cards) {
    if (!card.titulo) continue
    const key = keyOf(card, card.trilha)
    const exact = key + '|' + normalizeText(card.titulo)
    if (onBoard.has(key) || inText.has(exact)) continue
    inText.add(exact)
    novos.push(card)
  }
  return { novos, repetidos: cards.length - novos.length }
}

/**
 * Grava os cards no quadro numa única transação: cria as trilhas que faltam, põe os
 * pendentes no Backlog e os concluídos em Feito, com as checklists.
 */
export async function applyImport(
  cards: ParsedCard[],
  boardId: string,
): Promise<{ cards: number; trilhas: number }> {
  return db.transaction('rw', db.tracks, db.cards, db.columns, db.checklistItems, async () => {
    const columns = (await db.columns.where('boardId').equals(boardId).toArray())
      .filter(alive)
      .sort(byOrdem)
    if (columns.length === 0) throw new Error('O quadro não tem colunas para receber os cards.')
    const backlog = columns.find((column) => column.papel === 'backlog') ?? columns[0]
    const feito = columns.find((column) => column.papel === 'feito') ?? columns.at(-1)!

    // Trilhas: reaproveita as que já existem pelo nome.
    const tracks = (await db.tracks.toArray()).filter(alive)
    const trackByName = new Map(tracks.map((track) => [normalizeText(track.nome), track.id]))
    const newTracks: Track[] = []
    for (const card of cards) {
      if (!card.trilha || trackByName.has(normalizeText(card.trilha))) continue
      const track = stamp<Track>({
        nome: card.trilha,
        cor: TRACK_COLORS[(tracks.length + newTracks.length) % TRACK_COLORS.length],
        metaData: null,
      })
      // Mantém a ordem das seções: a lista lateral ordena pela criação.
      track.criadoEm = new Date(Date.now() + newTracks.length).toISOString()
      newTracks.push(track)
      trackByName.set(normalizeText(card.trilha), track.id)
    }
    await db.tracks.bulkAdd(newTracks)

    const now = nowIso()
    const newCards: Card[] = []
    const newItems: ChecklistItem[] = []
    const place = async (column: Column, list: ParsedCard[]) => {
      const last = (await db.cards.where('columnId').equals(column.id).toArray())
        .filter(alive)
        .sort(byOrdem)
        .at(-1)
      const ordens = ordemSequence(list.length, last?.ordem ?? null)
      list.forEach((parsed, i) => {
        const card = stamp<Card>({
          boardId,
          columnId: column.id,
          trackId: parsed.trilha ? (trackByName.get(normalizeText(parsed.trilha)) ?? null) : null,
          titulo: parsed.titulo,
          url: parsed.url,
          tipo: parsed.tipo,
          plataforma: parsed.plataforma,
          tags: parsed.tags,
          prioridade: 'media',
          estimativaMin: parsed.estimativaMin,
          progresso: 0,
          dataAlvo: null,
          notasMd: parsed.notasMd,
          ordem: ordens[i],
          concluidoEm: column.papel === 'feito' ? now : null,
          miniaturaUrl: null,
          links: [],
        })
        newCards.push(card)
        const itemOrdens = ordemSequence(parsed.checklist.length)
        parsed.checklist.forEach((item, j) => {
          newItems.push(stamp<ChecklistItem>({ cardId: card.id, ...item, ordem: itemOrdens[j] }))
        })
      })
    }
    await place(
      backlog,
      cards.filter((card) => !card.feito),
    )
    await place(
      feito,
      cards.filter((card) => card.feito),
    )
    await db.cards.bulkAdd(newCards)
    await db.checklistItems.bulkAdd(newItems)
    return { cards: newCards.length, trilhas: newTracks.length }
  })
}

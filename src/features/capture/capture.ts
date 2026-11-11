import { boardsRepo, cardsRepo, columnsRepo } from '@/data/repos'
import type { Card } from '@/data/types'
import { isUrl } from '@/lib/format'
import { getMetadataProvider } from './metadata'
import { fallbackTitle, platformFromUrl, tipoFromUrl } from './url'

type Target = { boardId: string; columnId: string; trackId?: string | null }

/** Quadro e coluna de entrada (Backlog, ou a primeira coluna se ele não existir mais). */
export async function captureTarget(): Promise<Target | null> {
  const [board] = await boardsRepo.list()
  if (!board) return null
  const columns = await columnsRepo.listByBoard(board.id)
  const column = columns.find((c) => c.papel === 'backlog') ?? columns[0]
  return column ? { boardId: board.id, columnId: column.id } : null
}

/**
 * Cria o card na hora, com um título provisório tirado do link, e completa depois com
 * título, miniatura e duração quando a fonte responde. Assim colar nunca espera a rede.
 * A promessa `enriched` termina quando essa segunda etapa acaba.
 */
export async function createCardFromUrl(
  url: string,
  target: Target,
  posicao: 'inicio' | 'fim' = 'inicio',
): Promise<{ card: Card; enriched: Promise<void> }> {
  const href = url.trim()
  const plataforma = platformFromUrl(href)
  const provisional = fallbackTitle(href)
  const card = await cardsRepo.create({
    ...target,
    posicao,
    titulo: provisional,
    url: href,
    plataforma,
    tipo: tipoFromUrl(href, plataforma),
  })

  const enriched = getMetadataProvider()
    .fetch(href)
    .then(async (meta) => {
      if (!meta) return
      const current = await cardsRepo.get(card.id)
      if (!current) return
      await cardsRepo.update(card.id, {
        // Só troca o título se a pessoa ainda não mexeu nele.
        ...(meta.titulo && current.titulo === provisional ? { titulo: meta.titulo } : {}),
        ...(meta.miniaturaUrl ? { miniaturaUrl: meta.miniaturaUrl } : {}),
        ...(meta.duracaoMin && current.estimativaMin === null
          ? { estimativaMin: meta.duracaoMin }
          : {}),
      })
    })
    .catch(() => undefined)

  return { card, enriched }
}

/** Cria um card a partir de um texto digitado ou colado: link vira card com link, o resto vira título. */
export async function createCardFromText(
  text: string,
  target: Target,
  posicao: 'inicio' | 'fim' = 'inicio',
): Promise<Card> {
  const value = text.trim()
  if (isUrl(value)) return (await createCardFromUrl(value, target, posicao)).card
  return cardsRepo.create({ ...target, posicao, titulo: value })
}

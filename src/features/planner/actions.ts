import { cardsRepo, columnsRepo, dailyGoalsRepo, planBlocksRepo, sessionsRepo } from '@/data/repos'
import type { Card, PlanBlock } from '@/data/types'
import { localDate } from '@/lib/format'
import {
  addDays,
  blockMin,
  clampStart,
  DAY_END,
  defaultDuration,
  fromMin,
  SLOT_MIN,
  snap,
  toMin,
} from './time'

/**
 * Põe o card na agenda. Um card do Backlog que ganha horário passa para "Esta semana":
 * planejar é o que tira o card da fila.
 */
export async function planCard(
  cardId: string,
  dia: string,
  inicioMin: number,
  durMin?: number,
): Promise<PlanBlock | null> {
  const card = await cardsRepo.get(cardId)
  if (!card) return null
  const dur = durMin ?? defaultDuration(card.estimativaMin)
  const start = clampStart(snap(inicioMin), dur)
  const block = await planBlocksRepo.create({
    cardId,
    dia,
    inicio: fromMin(start),
    fim: fromMin(start + dur),
    recorrente: false,
  })
  const columns = await columnsRepo.listByBoard(card.boardId)
  const semana = columns.find((column) => column.papel === 'semana')
  const current = columns.find((column) => column.id === card.columnId)
  if (current?.papel === 'backlog' && semana) await cardsRepo.move(card.id, semana.id, Infinity)
  return block
}

/** Muda o bloco de dia ou horário, mantendo a duração. */
export async function moveBlock(block: PlanBlock, dia: string, inicioMin: number) {
  const dur = blockMin(block)
  const start = clampStart(snap(inicioMin), dur)
  return planBlocksRepo.update(block.id, { dia, inicio: fromMin(start), fim: fromMin(start + dur) })
}

/** Muda o fim do bloco; no mínimo 30 minutos, no máximo até o fim da grade. */
export async function resizeBlock(block: PlanBlock, fimMin: number) {
  const start = toMin(block.inicio)
  const fim = Math.min(DAY_END, Math.max(start + SLOT_MIN, snap(fimMin)))
  return planBlocksRepo.update(block.id, { fim: fromMin(fim) })
}

/** Blocos do dia cujo card ainda não foi concluído. */
export async function pendingBlocks(day: string): Promise<{ block: PlanBlock; card: Card }[]> {
  const pending: { block: PlanBlock; card: Card }[] = []
  for (const block of await planBlocksRepo.listByDays([day])) {
    const card = await cardsRepo.get(block.cardId)
    if (card && card.concluidoEm === null) pending.push({ block, card })
  }
  return pending
}

/** Empurra os pendentes do dia para o dia seguinte, no mesmo horário. */
export async function pushPending(day: string): Promise<number> {
  const pending = await pendingBlocks(day)
  const next = addDays(day, 1)
  for (const { block } of pending) await planBlocksRepo.update(block.id, { dia: next })
  return pending.length
}

export type DaySummary = {
  focusMin: number
  cardsDone: Card[]
  goal: { tipoMeta: 'horas' | 'cards'; valorMeta: number }
  /** Quanto falta para a meta (minutos ou cards); 0 quando bateu. */
  faltam: number
  /** 0 a 100. */
  percent: number
}

/** O que foi feito no dia, comparado com a meta. */
export async function daySummary(day: string): Promise<DaySummary> {
  const [sessions, cards, goal] = await Promise.all([
    sessionsRepo.list(),
    cardsRepo.list(),
    dailyGoalsRepo.forDay(day),
  ])
  const focusMin = sessions
    .filter((session) => session.tipo === 'foco' && localDate(new Date(session.inicio)) === day)
    .reduce((sum, session) => sum + session.duracaoMin, 0)
  const cardsDone = cards.filter(
    (card) => card.concluidoEm !== null && localDate(new Date(card.concluidoEm)) === day,
  )
  const done = goal.tipoMeta === 'horas' ? focusMin : cardsDone.length
  const target = Math.max(1, goal.valorMeta)
  return {
    focusMin,
    cardsDone,
    goal: { tipoMeta: goal.tipoMeta, valorMeta: goal.valorMeta },
    faltam: Math.max(0, target - done),
    percent: Math.min(100, Math.round((done / target) * 100)),
  }
}

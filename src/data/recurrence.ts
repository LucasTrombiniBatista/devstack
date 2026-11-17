import type { PlanBlock } from './types'

/** Dia da semana (0 = domingo) de um AAAA-MM-DD, no fuso local. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Dias da semana em que a série se repete; sem lista, vale o dia da semana do início. */
export function repeatDays(block: PlanBlock): number[] {
  return block.diasSemana?.length ? block.diasSemana : [weekdayOf(block.dia)]
}

/** A série recorrente acontece neste dia? A partir do início, nos dias marcados, fora as exceções. */
export function occursOn(block: PlanBlock, day: string): boolean {
  return (
    block.recorrente &&
    day >= block.dia &&
    repeatDays(block).includes(weekdayOf(day)) &&
    !(block.excecoes ?? []).includes(day)
  )
}

/**
 * Chave única de um bloco na tela. A ocorrência de uma série guarda o `id` da série
 * e o `dia` da ocorrência, então só o id não basta quando ela aparece em vários dias.
 */
export function blockKey(block: PlanBlock): string {
  return block.recorrente ? `${block.id}@${block.dia}` : block.id
}

import type { Card } from '@/data/types'

/**
 * Progresso mostrado no card: quando há checklist, ela manda ("1/3");
 * sem checklist, vale a porcentagem manual. `null` quando não há nada a mostrar.
 */
export function cardProgress(
  card: Pick<Card, 'progresso'>,
  checklist: { done: number; total: number } | undefined,
): { percent: number; label: string } | null {
  if (checklist && checklist.total > 0) {
    return {
      percent: Math.round((checklist.done / checklist.total) * 100),
      label: `${checklist.done}/${checklist.total}`,
    }
  }
  if (card.progresso > 0) return { percent: card.progresso, label: `${card.progresso}%` }
  return null
}

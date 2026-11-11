import type { TFunction } from 'i18next'
import { formatDuration } from '@/lib/format'

/** "4h20 de 10h" quando há tempo registrado; senão só a estimativa ("10h" ou "?"). */
export function spentLabel(t: TFunction, spentMin: number, estimativaMin: number | null): string {
  const estimate = estimativaMin === null ? null : formatDuration(estimativaMin)
  if (spentMin <= 0) return estimate ?? '?'
  const spent = formatDuration(spentMin)
  return estimate ? t('timer.spentOf', { spent, estimate }) : spent
}

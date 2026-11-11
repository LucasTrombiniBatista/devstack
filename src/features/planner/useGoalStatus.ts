import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/lib/format'
import type { DaySummary } from './actions'

/** "Falta 1h10", "Faltam 2 cards" ou "Meta batida". */
export function useGoalStatus(summary: DaySummary): string {
  const { t } = useTranslation()
  if (summary.faltam === 0) return t('today.goalMet')
  return summary.goal.tipoMeta === 'horas'
    ? t('today.leftTime', { time: formatDuration(summary.faltam) })
    : t('today.leftCards', { count: summary.faltam })
}

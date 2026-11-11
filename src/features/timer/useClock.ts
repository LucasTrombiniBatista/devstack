import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/app/settings-store'
import { settingsRepo } from '@/data/repos'
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@/data/seed'
import type { Card, PomodoroConfig } from '@/data/types'
import {
  elapsedMs,
  formatClock,
  isEngaged,
  phaseDurationMs,
  remainingMs,
  type TimerMode,
  type TimerState,
} from './engine'
import { requestNotifyPermission } from './notify'
import { timer, useTimer } from './store'

/** Configuração do pomodoro, atualizada quando muda nas configurações. */
export function usePomodoroConfig(): PomodoroConfig {
  const settings = useLiveQuery(() => settingsRepo.get(SETTINGS_ID))
  return settings?.pomodoro ?? DEFAULT_SETTINGS.pomodoro
}

/** Relógio que só bate enquanto `active`: quem não mostra a contagem não re-renderiza. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const update = () => setNow(Date.now())
    update()
    const id = setInterval(update, 250)
    return () => clearInterval(id)
  }, [active])
  return now
}

/** Estado do timer com o mostrador pronto ("18:42"). */
export function useClock() {
  const state = useTimer()
  const config = usePomodoroConfig()
  const now = useNow(state.status === 'running')
  const clock =
    state.mode === 'livre' && state.status !== 'idle'
      ? formatClock(elapsedMs(state, now), 'down')
      : state.status === 'idle'
        ? formatClock(phaseDurationMs('foco', config))
        : formatClock(remainingMs(state, now))
  return { state, config, clock }
}

/** O que o mostrador está contando: "Foco · ciclo 2", "Pausa curta", "Cronômetro". */
export function usePhaseLabel(state: TimerState | null): string {
  const { t } = useTranslation()
  if (state === null) return t('timer.phase.foco')
  if (state.status === 'idle') return isEngaged(state) ? t('timer.ready') : t('timer.phase.foco')
  if (state.mode === 'livre') return t('timer.phase.livre')
  if (state.phase !== 'foco') return t(`timer.phase.${state.phase}`)
  return `${t('timer.phase.foco')} · ${t('timer.cycle', { n: state.cycles + 1 })}`
}

/** Inicia o foco num card: abre o conteúdo em outra aba e liga o timer. */
export async function startFocus(
  card: Pick<Card, 'id' | 'url'> | null,
  mode: TimerMode = 'pomodoro',
): Promise<void> {
  requestNotifyPermission()
  if (card?.url && useSettings.getState().openContent) {
    window.open(card.url, '_blank', 'noopener,noreferrer')
  }
  await timer.start(card?.id ?? null, mode)
}

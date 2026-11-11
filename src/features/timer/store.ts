import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sessionsRepo, settingsRepo } from '@/data/repos'
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@/data/seed'
import type { PomodoroConfig } from '@/data/types'
import {
  advance,
  begin,
  finishPhase,
  IDLE,
  pause,
  remainingMs,
  resume,
  stop,
  type Step,
  type TimerMode,
  type TimerPhase,
  type TimerState,
} from './engine'

/**
 * Estado do timer. Fica no localStorage: precisa estar disponível antes do primeiro
 * render para a contagem continuar de onde estava depois de recarregar.
 */
export const useTimer = create<TimerState>()(
  persist(() => IDLE, { name: 'devstack:timer', version: 1 }),
)

export async function pomodoroConfig(): Promise<PomodoroConfig> {
  return (await settingsRepo.get(SETTINGS_ID))?.pomodoro ?? DEFAULT_SETTINGS.pomodoro
}

async function commit(step: Step): Promise<Step> {
  useTimer.setState(step.state, true)
  for (const record of step.records) await sessionsRepo.recordFocus(record)
  return step
}

const now = () => Date.now()

/** Ações do timer. As que mudam de fase gravam a sessão de foco no banco. */
export const timer = {
  async start(cardId: string | null, mode: TimerMode = 'pomodoro'): Promise<void> {
    const config = await pomodoroConfig()
    await commit(begin(useTimer.getState(), { cardId, mode }, config, now()))
  },

  pause(): void {
    useTimer.setState(pause(useTimer.getState(), now()), true)
  },

  /** Continua o que estava pausado; depois de uma pausa, começa o próximo foco. */
  async resume(): Promise<void> {
    const state = useTimer.getState()
    if (state.status === 'idle') return timer.start(state.cardId, state.mode)
    useTimer.setState(resume(state, now()), true)
  },

  /** Fecha a fase atual antes da hora e vai para a próxima. */
  async skip(): Promise<void> {
    const config = await pomodoroConfig()
    await commit(finishPhase(useTimer.getState(), config, now()))
  },

  async stop(): Promise<void> {
    await commit(stop(useTimer.getState(), now()))
  },

  /** Confere se a fase venceu. Devolve a fase que terminou, se alguma terminou. */
  async tick(at: number = now()): Promise<TimerPhase | null> {
    const due = (state: TimerState) =>
      state.status === 'running' && state.mode === 'pomodoro' && remainingMs(state, at) === 0
    if (!due(useTimer.getState())) return null
    const config = await pomodoroConfig()
    // Relê depois da espera: outra chamada pode ter fechado a fase nesse meio-tempo.
    const state = useTimer.getState()
    if (!due(state)) return null
    return (await commit(advance(state, config, at))).ended
  },
}

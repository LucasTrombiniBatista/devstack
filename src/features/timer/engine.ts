import type { PomodoroConfig } from '@/data/types'

/**
 * Regras do timer como funções puras. O estado guarda instantes (não segundos restantes),
 * então recarregar a página ou deixar a aba em segundo plano não atrasa a contagem.
 */

export type TimerMode = 'pomodoro' | 'livre'
export type TimerPhase = 'foco' | 'pausaCurta' | 'pausaLonga'
export type TimerStatus = 'idle' | 'running' | 'paused'

export type TimerState = {
  mode: TimerMode
  phase: TimerPhase
  status: TimerStatus
  cardId: string | null
  /** Duração da fase; 0 no cronômetro livre, que não tem fim. */
  phaseMs: number
  /** Quando a fase começou (vira o início da sessão). */
  phaseStartedAt: number | null
  /** Início do trecho que está correndo agora; `null` se pausado ou parado. */
  runningSince: number | null
  /** Tempo corrido antes do trecho atual, sem contar as pausas manuais. */
  accumulatedMs: number
  /** Focos concluídos desde que o timer foi iniciado. */
  cycles: number
}

export const IDLE: TimerState = {
  mode: 'pomodoro',
  phase: 'foco',
  status: 'idle',
  cardId: null,
  phaseMs: 0,
  phaseStartedAt: null,
  runningSince: null,
  accumulatedMs: 0,
  cycles: 0,
}

/** Tempo de foco a gravar como sessão. Instantes em milissegundos. */
export type FocusRecord = { cardId: string | null; inicio: number; fim: number; duracaoMin: number }

export type Step = {
  state: TimerState
  records: FocusRecord[]
  /** Fase que terminou neste passo, para avisar a pessoa. */
  ended: TimerPhase | null
}

const MINUTE = 60_000
/** Abaixo disso foi clique por engano: não vira sessão. */
const MIN_SESSION_MS = 30_000

export function elapsedMs(state: TimerState, now: number): number {
  const running = state.runningSince === null ? 0 : Math.max(0, now - state.runningSince)
  return state.accumulatedMs + running
}

export function remainingMs(state: TimerState, now: number): number {
  return Math.max(0, state.phaseMs - elapsedMs(state, now))
}

/** O timer tem algo em andamento: correndo, pausado ou esperando o próximo foco. */
export function isEngaged(state: TimerState): boolean {
  return state.status !== 'idle' || state.cycles > 0
}

export function phaseDurationMs(phase: TimerPhase, config: PomodoroConfig): number {
  const minutes =
    phase === 'foco'
      ? config.focoMin
      : phase === 'pausaCurta'
        ? config.pausaCurtaMin
        : config.pausaLongaMin
  return Math.max(1, minutes) * MINUTE
}

function enter(
  state: TimerState,
  phase: TimerPhase,
  config: PomodoroConfig,
  at: number,
): TimerState {
  return {
    ...state,
    phase,
    status: 'running',
    phaseMs: state.mode === 'livre' ? 0 : phaseDurationMs(phase, config),
    phaseStartedAt: at,
    runningSince: at,
    accumulatedMs: 0,
  }
}

function record(state: TimerState, end: number): FocusRecord[] {
  if (state.status === 'idle' || state.phase !== 'foco' || state.phaseStartedAt === null) return []
  const ms = elapsedMs(state, end)
  if (ms < MIN_SESSION_MS) return []
  return [
    {
      cardId: state.cardId,
      inicio: state.phaseStartedAt,
      fim: end,
      duracaoMin: Math.max(1, Math.round(ms / MINUTE)),
    },
  ]
}

/** Começa um foco. Se outro estava em andamento, o tempo dele é gravado antes. */
export function begin(
  state: TimerState,
  target: { cardId: string | null; mode: TimerMode },
  config: PomodoroConfig,
  now: number,
): Step {
  const next = enter({ ...IDLE, ...target, cycles: state.cycles }, 'foco', config, now)
  return { state: next, records: record(state, now), ended: null }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state
  return { ...state, status: 'paused', accumulatedMs: elapsedMs(state, now), runningSince: null }
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused') return state
  return { ...state, status: 'running', runningSince: now }
}

/**
 * Fecha a fase atual no instante `at` e passa para a seguinte: depois do foco a pausa
 * começa sozinha; depois da pausa o timer espera a pessoa iniciar o próximo foco.
 */
export function finishPhase(state: TimerState, config: PomodoroConfig, at: number): Step {
  if (state.status === 'idle') return { state, records: [], ended: null }
  const records = record(state, at)
  if (state.mode === 'livre') return { state: IDLE, records, ended: 'foco' }
  if (state.phase === 'foco') {
    const cycles = state.cycles + 1
    const longa = cycles % Math.max(1, config.ciclosAtePausaLonga) === 0
    return {
      state: enter({ ...state, cycles }, longa ? 'pausaLonga' : 'pausaCurta', config, at),
      records,
      ended: 'foco',
    }
  }
  return {
    state: {
      ...state,
      phase: 'foco',
      status: 'idle',
      phaseMs: phaseDurationMs('foco', config),
      phaseStartedAt: null,
      runningSince: null,
      accumulatedMs: 0,
    },
    records,
    ended: state.phase,
  }
}

/** Encerra tudo, gravando o foco feito até aqui. */
export function stop(state: TimerState, now: number): Step {
  return { state: IDLE, records: record(state, now), ended: null }
}

/**
 * Leva o estado até `now`: fecha cada fase que já venceu no instante exato em que venceu,
 * mesmo que o app tenha ficado fechado enquanto isso.
 */
export function advance(state: TimerState, config: PomodoroConfig, now: number): Step {
  const step: Step = { state, records: [], ended: null }
  while (
    step.state.status === 'running' &&
    step.state.mode === 'pomodoro' &&
    remainingMs(step.state, now) === 0
  ) {
    const { runningSince, phaseMs, accumulatedMs } = step.state
    const next = finishPhase(step.state, config, (runningSince ?? now) + phaseMs - accumulatedMs)
    step.state = next.state
    step.records.push(...next.records)
    step.ended = next.ended
  }
  return step
}

/** 1_122_000 → "18:42"; a partir de uma hora, "1:02:03". */
export function formatClock(ms: number, round: 'up' | 'down' = 'up'): string {
  const total = Math.max(0, round === 'up' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

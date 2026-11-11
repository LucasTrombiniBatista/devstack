import { describe, expect, it } from 'vitest'
import {
  advance,
  begin,
  elapsedMs,
  finishPhase,
  formatClock,
  IDLE,
  isEngaged,
  pause,
  remainingMs,
  resume,
  stop,
  type TimerState,
} from './engine'

const MIN = 60_000
const T0 = Date.UTC(2026, 10, 11, 12, 0, 0)
const CONFIG = { focoMin: 25, pausaCurtaMin: 5, pausaLongaMin: 15, ciclosAtePausaLonga: 4 }

const started = (mode: 'pomodoro' | 'livre' = 'pomodoro', from: TimerState = IDLE) =>
  begin(from, { cardId: 'card-1', mode }, CONFIG, T0).state

describe('contagem', () => {
  it('começa em foco com o tempo configurado e desconta o que passou', () => {
    const state = started()
    expect(state).toMatchObject({ status: 'running', phase: 'foco', cardId: 'card-1' })
    expect(remainingMs(state, T0)).toBe(25 * MIN)
    expect(remainingMs(state, T0 + 10 * MIN)).toBe(15 * MIN)
    expect(remainingMs(state, T0 + 99 * MIN)).toBe(0)
  })

  it('o tempo pausado não conta', () => {
    const paused = pause(started(), T0 + 10 * MIN)
    expect(remainingMs(paused, T0 + 40 * MIN)).toBe(15 * MIN)

    const back = resume(paused, T0 + 40 * MIN)
    expect(remainingMs(back, T0 + 45 * MIN)).toBe(10 * MIN)
    expect(elapsedMs(back, T0 + 45 * MIN)).toBe(15 * MIN)
  })

  it('o cronômetro livre conta para cima e nunca vence', () => {
    const state = started('livre')
    expect(elapsedMs(state, T0 + 90 * MIN)).toBe(90 * MIN)
    expect(advance(state, CONFIG, T0 + 90 * MIN)).toEqual({ state, records: [], ended: null })
  })
})

describe('fim de fase', () => {
  it('foco vencido vira sessão de 25 min e a pausa começa no instante em que ele acabou', () => {
    const step = advance(started(), CONFIG, T0 + 25 * MIN + 400)

    expect(step.ended).toBe('foco')
    expect(step.records).toEqual([
      { cardId: 'card-1', inicio: T0, fim: T0 + 25 * MIN, duracaoMin: 25 },
    ])
    expect(step.state).toMatchObject({ phase: 'pausaCurta', status: 'running', cycles: 1 })
    expect(remainingMs(step.state, T0 + 25 * MIN + 400)).toBe(5 * MIN - 400)
  })

  it('antes da hora nada muda', () => {
    const state = started()
    expect(advance(state, CONFIG, T0 + 24 * MIN).state).toBe(state)
  })

  it('app fechado por horas: fecha o foco e a pausa, e espera o próximo foco', () => {
    const step = advance(started(), CONFIG, T0 + 300 * MIN)

    expect(step.records).toHaveLength(1)
    expect(step.records[0]).toMatchObject({ fim: T0 + 25 * MIN, duracaoMin: 25 })
    expect(step.ended).toBe('pausaCurta')
    expect(step.state).toMatchObject({ phase: 'foco', status: 'idle', cardId: 'card-1' })
    expect(isEngaged(step.state)).toBe(true)
  })

  it('a sessão conta só o tempo de foco, sem as pausas manuais', () => {
    const state = resume(pause(started(), T0 + 10 * MIN), T0 + 30 * MIN)
    const [record] = advance(state, CONFIG, T0 + 60 * MIN).records

    expect(record).toEqual({ cardId: 'card-1', inicio: T0, fim: T0 + 45 * MIN, duracaoMin: 25 })
  })

  it('o quarto foco leva à pausa longa', () => {
    let state = started()
    let now = T0
    for (let cycle = 1; cycle <= 4; cycle++) {
      now += 25 * MIN
      state = advance(state, CONFIG, now).state
      expect(state.phase).toBe(cycle === 4 ? 'pausaLonga' : 'pausaCurta')
      if (cycle === 4) break
      now += 5 * MIN
      state = advance(state, CONFIG, now).state
      state = begin(state, { cardId: 'card-1', mode: 'pomodoro' }, CONFIG, now).state
    }
    expect(remainingMs(state, now)).toBe(15 * MIN)
  })

  it('pular o foco grava o que foi feito e vai para a pausa', () => {
    const step = finishPhase(started(), CONFIG, T0 + 12 * MIN)
    expect(step.records[0].duracaoMin).toBe(12)
    expect(step.state.phase).toBe('pausaCurta')
  })
})

describe('encerrar', () => {
  it('grava o foco parcial e zera o timer', () => {
    const step = stop(started(), T0 + 10 * MIN + 20_000)
    expect(step.records).toEqual([
      { cardId: 'card-1', inicio: T0, fim: T0 + 10 * MIN + 20_000, duracaoMin: 10 },
    ])
    expect(step.state).toEqual(IDLE)
  })

  it('menos de 30 segundos não vira sessão', () => {
    expect(stop(started(), T0 + 20_000).records).toEqual([])
    expect(stop(started(), T0 + 40_000).records[0].duracaoMin).toBe(1)
  })

  it('pausa não vira sessão', () => {
    const onBreak = advance(started(), CONFIG, T0 + 25 * MIN).state
    expect(stop(onBreak, T0 + 28 * MIN).records).toEqual([])
  })

  it('cronômetro livre grava o tempo corrido', () => {
    expect(stop(started('livre'), T0 + 47 * MIN).records[0]).toMatchObject({ duracaoMin: 47 })
  })

  it('iniciar outro card grava o tempo do anterior', () => {
    const step = begin(started(), { cardId: 'card-2', mode: 'pomodoro' }, CONFIG, T0 + 8 * MIN)
    expect(step.records).toEqual([
      { cardId: 'card-1', inicio: T0, fim: T0 + 8 * MIN, duracaoMin: 8 },
    ])
    expect(step.state).toMatchObject({ cardId: 'card-2', phaseStartedAt: T0 + 8 * MIN })
  })
})

describe('mostrador', () => {
  it('formata minutos, segundos e horas', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(18 * MIN + 41_200)).toBe('18:42')
    expect(formatClock(18 * MIN + 41_200, 'down')).toBe('18:41')
    expect(formatClock(62 * MIN + 3000)).toBe('1:02:03')
    expect(formatClock(-5)).toBe('00:00')
  })
})

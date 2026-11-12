import { describe, expect, it } from 'vitest'
import type { Card, DailyGoal, Session, Track } from '@/data/types'
import { computeLobby } from './stats'

const base = { criadoEm: '', atualizadoEm: '', versao: 1, removidoEm: null }
const today = new Date(2026, 10, 12, 15) // quinta, 12/11/2026

function at(daysAgo: number, hour = 10): string {
  const d = new Date(2026, 10, 12 - daysAgo, hour)
  return d.toISOString()
}

function session(id: string, daysAgo: number, min: number, cardId: string | null = null): Session {
  return {
    ...base,
    id,
    cardId,
    inicio: at(daysAgo),
    fim: null,
    duracaoMin: min,
    tipo: 'foco',
    origem: 'timer',
  }
}

function card(id: string, trackId: string | null, doneDaysAgo: number | null): Card {
  return {
    ...base,
    id,
    boardId: 'b',
    columnId: 'c',
    trackId,
    titulo: id,
    url: null,
    tipo: 'curso',
    plataforma: null,
    tags: [],
    prioridade: 'media',
    estimativaMin: null,
    progresso: 0,
    dataAlvo: null,
    notasMd: '',
    ordem: 'a0',
    concluidoEm: doneDaysAgo === null ? null : at(doneDaysAgo),
    miniaturaUrl: null,
    links: [],
  }
}

const tracks: Track[] = [
  { ...base, id: 'js', nome: 'JavaScript', cor: 'carmim', metaData: null },
  { ...base, id: 'rs', nome: 'Rust', cor: 'tinta', metaData: null },
]

describe('computeLobby', () => {
  const cards = [card('a', 'js', 0), card('b', 'rs', 3), card('c', null, 20), card('d', 'js', null)]
  const sessions = [
    session('1', 0, 30, 'a'),
    session('2', 1, 60, 'a'),
    session('3', 2, 45, 'b'),
    session('4', 4, 120, 'd'),
    session('5', 9, 50, 'c'),
    { ...session('6', 0, 5, 'a'), tipo: 'pausa' as const },
  ]
  const goals: DailyGoal[] = [
    { ...base, id: 'g', data: '2026-01-01', tipoMeta: 'horas', valorMeta: 60 },
  ]
  const stats = computeLobby({ sessions, cards, tracks, goals, today })

  it('soma o foco por dia e ignora pausas', () => {
    expect(stats.year).toHaveLength(365)
    expect(stats.year.at(-1)).toEqual({ day: '2026-11-12', min: 30 })
    expect(stats.last7Min).toBe(30 + 60 + 45 + 120)
    expect(stats.prev7Min).toBe(50)
  })

  it('conta a sequência de dias com foco até hoje', () => {
    expect(stats.streak).toBe(3)
  })

  it('conta os dias com a meta batida', () => {
    expect(stats.goalDays).toBe(2) // 60 e 120 minutos
    expect(stats.goalMin).toBe(60)
  })

  it('acumula os cards concluídos por semana', () => {
    expect(stats.doneTotal).toBe(3)
    expect(stats.weekly).toHaveLength(12)
    expect(stats.weekly.at(-1)!.total).toBe(3)
    expect(stats.doneThisWeek).toBe(2) // segunda 09/11 em diante
  })

  it('agrupa o tempo dos últimos 30 dias por trilha', () => {
    expect(stats.byTrack).toEqual([
      { id: 'js', nome: 'JavaScript', cor: 'carmim', min: 210 },
      { id: null, nome: null, cor: null, min: 50 },
      { id: 'rs', nome: 'Rust', cor: 'tinta', min: 45 },
    ])
  })
})

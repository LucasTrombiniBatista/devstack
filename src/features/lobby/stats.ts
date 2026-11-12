import type { Card, DailyGoal, Session, Track } from '@/data/types'
import { DEFAULT_GOAL } from '@/data/repos'
import { localDate, weekBounds } from '@/lib/format'

export type LobbyInput = {
  sessions: Session[]
  cards: Card[]
  tracks: Track[]
  goals: DailyGoal[]
  today: Date
}

export type DayFocus = { day: string; min: number }
export type WeekDone = { start: string; total: number }
export type TrackTime = { id: string | null; nome: string | null; cor: string | null; min: number }

export type LobbyStats = {
  /** 365 dias terminando hoje, em ordem. */
  year: DayFocus[]
  last7Min: number
  prev7Min: number
  doneTotal: number
  doneThisWeek: number
  /** Total acumulado de cards concluídos ao fim de cada uma das últimas 12 semanas. */
  weekly: WeekDone[]
  /** Dias seguidos com foco até hoje (hoje sem foco ainda não quebra a sequência). */
  streak: number
  /** Dias com meta batida nos últimos 30. */
  goalDays: number
  /** Meta de hoje, para a linha do gráfico de barras quando é em minutos. */
  goalMin: number | null
  /** Tempo por trilha nos últimos 30 dias, do maior para o menor. */
  byTrack: TrackTime[]
}

function addDays(date: Date, n: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + n)
  return next
}

/** Meta que vale no dia: a última definida até ele, ou a padrão. */
function goalFor(goals: DailyGoal[], day: string) {
  let found: Pick<DailyGoal, 'tipoMeta' | 'valorMeta' | 'data'> | null = null
  for (const goal of goals) {
    if (goal.data <= day && (!found || goal.data > found.data)) found = goal
  }
  return found ?? DEFAULT_GOAL
}

export function computeLobby({ sessions, cards, tracks, goals, today }: LobbyInput): LobbyStats {
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)

  const focusByDay = new Map<string, number>()
  const focus = sessions.filter((s) => s.tipo === 'foco')
  for (const session of focus) {
    const day = localDate(new Date(session.inicio))
    focusByDay.set(day, (focusByDay.get(day) ?? 0) + session.duracaoMin)
  }

  const doneByDay = new Map<string, number>()
  const done = cards.filter((c) => c.concluidoEm)
  for (const card of done) {
    const day = localDate(new Date(card.concluidoEm!))
    doneByDay.set(day, (doneByDay.get(day) ?? 0) + 1)
  }

  const year: DayFocus[] = []
  for (let i = 364; i >= 0; i--) {
    const day = localDate(addDays(start, -i))
    year.push({ day, min: focusByDay.get(day) ?? 0 })
  }
  const sum = (list: DayFocus[]) => list.reduce((total, d) => total + d.min, 0)

  let streak = 0
  for (let i = year.length - 1; i >= 0; i--) {
    if (year[i].min > 0) streak++
    else if (i !== year.length - 1) break
  }

  let goalDays = 0
  for (const { day, min } of year.slice(-30)) {
    const goal = goalFor(goals, day)
    const value = goal.tipoMeta === 'horas' ? min : (doneByDay.get(day) ?? 0)
    if (value >= goal.valorMeta) goalDays++
  }
  const todayGoal = goalFor(goals, localDate(start))

  const { start: weekStart } = weekBounds(start)
  const weekly: WeekDone[] = []
  for (let i = 11; i >= 0; i--) {
    const from = addDays(weekStart, -7 * i)
    const end = addDays(from, 7).getTime()
    weekly.push({
      start: localDate(from),
      total: done.filter((c) => new Date(c.concluidoEm!).getTime() < end).length,
    })
  }
  const doneThisWeek = weekly[11].total - weekly[10].total

  const since = addDays(start, -29).getTime()
  const trackOf = new Map(cards.map((c) => [c.id, c.trackId]))
  const trackById = new Map(tracks.map((t) => [t.id, t]))
  const minByTrack = new Map<string | null, number>()
  for (const session of focus) {
    if (new Date(session.inicio).getTime() < since) continue
    const trackId = (session.cardId && trackOf.get(session.cardId)) || null
    const key = trackId && trackById.has(trackId) ? trackId : null
    minByTrack.set(key, (minByTrack.get(key) ?? 0) + session.duracaoMin)
  }
  const byTrack = [...minByTrack.entries()]
    .map(([id, min]) => {
      const track = id ? trackById.get(id) : undefined
      return { id, nome: track?.nome ?? null, cor: track?.cor ?? null, min }
    })
    .sort((a, b) => b.min - a.min)

  return {
    year,
    last7Min: sum(year.slice(-7)),
    prev7Min: sum(year.slice(-14, -7)),
    doneTotal: done.length,
    doneThisWeek,
    weekly,
    streak,
    goalDays,
    goalMin: todayGoal.tipoMeta === 'horas' ? todayGoal.valorMeta : null,
    byTrack,
  }
}

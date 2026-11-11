import { localDate, weekBounds } from '@/lib/format'

/** A grade da semana vai das 7h às 23h, em fatias de 30 minutos. */
export const DAY_START = 7 * 60
export const DAY_END = 23 * 60
export const SLOT_MIN = 30
/** Altura de uma fatia de 30 minutos na grade, em pixels. */
export const SLOT_PX = 20

const pad = (n: number) => String(n).padStart(2, '0')

/** "19:30" → 1170. */
export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 1170 → "19:30". */
export const fromMin = (min: number): string => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

export const blockMin = (block: { inicio: string; fim: string }): number =>
  toMin(block.fim) - toMin(block.inicio)

export const snap = (min: number): number => Math.round(min / SLOT_MIN) * SLOT_MIN

/** Mantém um bloco de `dur` minutos dentro da grade. */
export const clampStart = (start: number, dur: number): number =>
  Math.min(Math.max(DAY_START, start), DAY_END - dur)

/** Duração sugerida ao planejar um card: a estimativa, entre 30 min e 2h; sem estimativa, 1h. */
export function defaultDuration(estimativaMin: number | null): number {
  if (!estimativaMin) return 60
  return Math.min(120, Math.max(SLOT_MIN, snap(estimativaMin)))
}

/** "2026-11-11" → data local à meia-noite. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(day: string, n: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + n)
  return localDate(date)
}

/** Os 7 dias (segunda a domingo) da semana da data, como AAAA-MM-DD. */
export function weekDays(date: Date): string[] {
  const start = localDate(weekBounds(date).start)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Horários de início possíveis na grade. */
export const SLOTS = Array.from(
  { length: (DAY_END - DAY_START) / SLOT_MIN + 1 },
  (_, i) => DAY_START + i * SLOT_MIN,
)

import Dexie, { type Table } from 'dexie'
import type {
  Board,
  Card,
  ChecklistItem,
  Column,
  DailyGoal,
  PlanBlock,
  Session,
  Settings,
  Track,
} from './types'

export type DevStackDB = Dexie & {
  boards: Table<Board, string>
  columns: Table<Column, string>
  tracks: Table<Track, string>
  cards: Table<Card, string>
  checklistItems: Table<ChecklistItem, string>
  sessions: Table<Session, string>
  planBlocks: Table<PlanBlock, string>
  dailyGoals: Table<DailyGoal, string>
  settings: Table<Settings, string>
}

export const db = new Dexie('devstack') as DevStackDB

// Só os campos usados em consultas entram como índice; o resto vai junto no registro.
db.version(1).stores({
  boards: 'id',
  columns: 'id, boardId',
  tracks: 'id',
  cards: 'id, boardId, columnId, trackId, *tags',
  checklistItems: 'id, cardId',
  sessions: 'id, cardId, inicio',
  planBlocks: 'id, cardId, dia',
  dailyGoals: 'id, data',
  settings: 'id',
})

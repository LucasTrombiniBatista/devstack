import { db } from '@/data/db'
import type { Card, CardTipo } from '@/data/types'
import { formatDuration } from '@/lib/format'
import { byOrdem } from '@/lib/order'

const TABLES = [
  'boards',
  'columns',
  'tracks',
  'cards',
  'checklistItems',
  'sessions',
  'planBlocks',
  'dailyGoals',
  'settings',
] as const
type TableName = (typeof TABLES)[number]

export type Backup = {
  app: 'devstack'
  formato: 1
  exportadoEm: string
  dados: Record<TableName, unknown[]>
}

/** Cópia completa do banco, incluindo registros apagados (a sincronização precisa deles). */
export async function exportBackup(): Promise<Backup> {
  const dados = {} as Backup['dados']
  for (const name of TABLES) dados[name] = await db.table(name).toArray()
  return { app: 'devstack', formato: 1, exportadoEm: new Date().toISOString(), dados }
}

export class BackupError extends Error {}

function assertBackup(value: unknown): asserts value is Backup {
  const backup = value as Partial<Backup> | null
  if (!backup || backup.app !== 'devstack' || typeof backup.dados !== 'object') {
    throw new BackupError('not-a-backup')
  }
  if (backup.formato !== 1) throw new BackupError('unknown-version')
  for (const name of TABLES) {
    const rows = backup.dados[name]
    if (rows !== undefined && !Array.isArray(rows)) throw new BackupError('not-a-backup')
    for (const row of rows ?? []) {
      if (typeof (row as { id?: unknown })?.id !== 'string') throw new BackupError('not-a-backup')
    }
  }
}

/** Substitui tudo o que há no banco pelo conteúdo do backup. Se algo falhar, nada muda. */
export async function restoreBackup(value: unknown): Promise<void> {
  assertBackup(value)
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLES) {
      await db.table(name).clear()
      await db.table(name).bulkAdd(value.dados[name] ?? [])
    }
  })
}

const alive = <T extends { removidoEm: string | null }>(entity: T) => entity.removidoEm === null

async function loadForExport() {
  const columns = (await db.columns.toArray()).filter(alive).sort(byOrdem)
  const columnIndex = new Map(columns.map((column, i) => [column.id, i]))
  const tracks = (await db.tracks.toArray())
    .filter(alive)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1))
  const cards = (await db.cards.toArray())
    .filter((card) => alive(card) && columnIndex.has(card.columnId))
    .sort((a, b) => columnIndex.get(a.columnId)! - columnIndex.get(b.columnId)! || byOrdem(a, b))
  const items = (await db.checklistItems.toArray()).filter(alive).sort(byOrdem)
  return { columns, tracks, cards, items }
}

/** Palavra que ocupa o lugar da plataforma quando o card não tem uma; o importador a reconhece. */
const TIPO_WORD: Record<CardTipo, string> = {
  video: 'vídeo',
  curso: 'curso',
  documentacao: 'documentação',
  projeto: 'projeto',
  leitura: 'leitura',
  exercicio: 'exercício',
}

/**
 * Exporta no mesmo formato que o importador lê (DevStack.md, seção 13), agrupado por trilha.
 * Guarda título, link, plataforma ou tipo, estimativa, tags, checklist e notas; o resto
 * (prioridade, datas, coluna exata) só vai no backup em JSON.
 */
export async function exportMarkdown(): Promise<string> {
  const { columns, tracks, cards, items } = await loadForExport()
  const done = new Set(columns.filter((column) => column.papel === 'feito').map((c) => c.id))

  const line = (card: Card) => {
    const title = card.url ? `[${card.titulo}](${card.url})` : card.titulo
    const parts = [
      `- [${done.has(card.columnId) ? 'x' : ' '}] ${title}`,
      card.plataforma ?? TIPO_WORD[card.tipo],
      card.estimativaMin === null ? '?' : formatDuration(card.estimativaMin),
    ]
    if (card.tags.length > 0) parts.push(card.tags.map((tag) => `#${tag}`).join(' '))
    const out = [parts.join(' · ')]
    for (const item of items.filter((i) => i.cardId === card.id)) {
      out.push(`  - [${item.feito ? 'x' : ' '}] ${item.texto}`)
    }
    for (const note of card.notasMd.split('\n').filter((l) => l.trim())) out.push(`  > ${note}`)
    return out.join('\n')
  }

  const sections: string[] = []
  const loose = cards.filter((card) => card.trackId === null)
  if (loose.length > 0) sections.push(loose.map(line).join('\n'))
  for (const track of tracks) {
    const list = cards.filter((card) => card.trackId === track.id)
    if (list.length > 0) sections.push(`## ${track.nome}\n\n${list.map(line).join('\n')}`)
  }
  return sections.join('\n\n') + '\n'
}

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value)
  return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** Uma linha por card, para abrir em planilha. */
export async function exportCsv(): Promise<string> {
  const { columns, tracks, cards } = await loadForExport()
  const columnName = new Map(columns.map((column) => [column.id, column.nome]))
  const trackName = new Map(tracks.map((track) => [track.id, track.nome]))
  const header = [
    'titulo',
    'url',
    'coluna',
    'trilha',
    'tipo',
    'plataforma',
    'tags',
    'prioridade',
    'estimativa_min',
    'progresso',
    'data_alvo',
    'concluido_em',
    'criado_em',
  ]
  const rows = cards.map((card) =>
    [
      card.titulo,
      card.url,
      columnName.get(card.columnId) ?? '',
      card.trackId ? (trackName.get(card.trackId) ?? '') : '',
      card.tipo,
      card.plataforma,
      card.tags.join(' '),
      card.prioridade,
      card.estimativaMin,
      card.progresso,
      card.dataAlvo,
      card.concluidoEm,
      card.criadoEm,
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}

/** Entrega um arquivo para a pessoa salvar. */
export function download(filename: string, content: string, mime: string): void {
  // O BOM faz o Excel abrir o CSV com os acentos certos.
  const blob = new Blob([mime === 'text/csv' ? String.fromCharCode(0xfeff) : '', content], {
    type: `${mime};charset=utf-8`,
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const backupFilename = (extension: string) =>
  `devstack-${new Date().toISOString().slice(0, 10)}.${extension}`

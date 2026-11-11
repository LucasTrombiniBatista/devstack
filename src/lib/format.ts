/** 480 → "8h", 45 → "45 min", 260 → "4h20". */
export function formatDuration(totalMin: number): string {
  const min = Math.max(0, Math.round(totalMin))
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Número da semana ISO (segunda a domingo; a semana 1 contém a primeira quinta do ano). */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - weekday)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7)
}

/** Segunda e domingo da semana da data. */
export function weekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

/** "9 – 15 de novembro" no idioma pedido. */
export function formatWeekRange(date: Date, locale: string): string {
  const { start, end } = weekBounds(date)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).formatRange(start, end)
}

/** Minúsculas e sem acentos, para busca. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** "#Java, spring  #docker" → ["java", "spring", "docker"], sem repetição. */
export function parseTags(input: string): string[] {
  const tags = input
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, '').toLowerCase())
    .filter(Boolean)
  return [...new Set(tags)]
}

export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim())
}

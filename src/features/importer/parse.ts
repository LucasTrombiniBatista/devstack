import type { CardTipo } from '@/data/types'
import { isUrl } from '@/lib/format'
import { fallbackTitle, platformFromUrl, tipoFromUrl } from '@/features/capture/url'

/**
 * Leitor do formato de importação do DevStack.md, seção 13:
 *
 *   - [ ] [Título](url) · plataforma · duração · #tag1 #tag2
 *
 * Também aceita uma lista solta (um link ou título por linha). É uma função pura:
 * recebe texto, devolve cards; quem grava no banco é `applyImport`.
 */

export type ParsedCard = {
  titulo: string
  url: string | null
  plataforma: string | null
  tipo: CardTipo
  estimativaMin: number | null
  tags: string[]
  /** `[x]` na origem: vai para a coluna de concluídos. */
  feito: boolean
  /** Nome da trilha (título da seção), se houver. */
  trilha: string | null
  checklist: { texto: string; feito: boolean }[]
  notasMd: string
}

export type ParseResult = {
  /** Trilhas na ordem em que aparecem, só as que têm cards. */
  trilhas: string[]
  cards: ParsedCard[]
}

/** Palavras que, na posição da plataforma, dizem o tipo do conteúdo e não onde ele está. */
const TIPO_WORDS: Record<string, CardTipo> = {
  projeto: 'projeto',
  documentação: 'documentacao',
  documentacao: 'documentacao',
  artigo: 'leitura',
  leitura: 'leitura',
  livro: 'leitura',
  'livro gratuito': 'leitura',
  tutorial: 'leitura',
  mapa: 'leitura',
  repositório: 'leitura',
  estudo: 'leitura',
  interativo: 'exercicio',
  exercício: 'exercicio',
  exercicio: 'exercicio',
  prática: 'exercicio',
  tarefa: 'exercicio',
  hábito: 'exercicio',
  vídeo: 'video',
  video: 'video',
  curso: 'curso',
}

const TASK = /^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/
const HEADING = /^#{1,6}\s+(.*)$/
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/
const BOLD_LINE = /^\*\*(.+?)\*\*\s*(.*)$/
const SEPARATOR = /\s+·\s+/

function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').trim()
}

/** "## 18. Fase 3 (5A): Microsserviços em produção (semanas 11 a 20)" → "Fase 3 (5A): Microsserviços em produção". */
function trackName(heading: string): string {
  return stripBold(heading)
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\([^()]*\)\s*$/, '')
    .trim()
}

/** "10h", "1h30", "45 min", "496h (obs)" → minutos. "?" ou vazio → null. */
export function parseDuration(text: string): number | null {
  const match = text.trim().match(/^(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*(?:min|m)?)?/i)
  if (!match || (match[1] === undefined && match[2] === undefined)) return null
  const hours = match[1] === undefined ? 0 : Number.parseFloat(match[1].replace(',', '.'))
  const minutes = match[2] === undefined ? 0 : Number.parseInt(match[2], 10)
  const total = Math.round(hours * 60 + minutes)
  return total > 0 ? total : null
}

/** Separa "a, b (c, d), e" em ["a", "b (c, d)", "e"]. */
function splitOutsideParens(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts.map((part) => part.trim().replace(/\.$/, '')).filter(Boolean)
}

/** Tira um "(comentário)" do fim do texto e devolve os dois pedaços. */
function splitTrailingNote(text: string): { text: string; note: string | null } {
  const match = text.match(/^(.*?)\s*\(([^()]*)\)\s*$/)
  return match
    ? { text: match[1].trim(), note: match[2].trim() }
    : { text: text.trim(), note: null }
}

function emptyCard(trilha: string | null): ParsedCard {
  return {
    titulo: '',
    url: null,
    plataforma: null,
    tipo: 'leitura',
    estimativaMin: null,
    tags: [],
    feito: false,
    trilha,
    checklist: [],
    notasMd: '',
  }
}

/** Interpreta o conteúdo de um item no formato da seção 13. */
function parseItem(content: string, feito: boolean, trilha: string | null): ParsedCard {
  const card = emptyCard(trilha)
  card.feito = feito
  const notes: string[] = []
  const [head, ...rest] = content.split(SEPARATOR)

  // Título: "[Título](url)" (com ou sem texto em volta) ou texto puro, com ou sem "**Rótulo:**".
  const link = head.match(LINK)
  if (link) card.url = link[2]
  let title = stripBold(head.replace(LINK, '$1'))
  let search = false
  if (/\(buscar pelo nome\)/i.test(title)) {
    title = title.replace(/\s*\(buscar pelo nome\)/i, '')
    search = true
  }
  card.titulo = title.trim()
  if (/^projeto\b/i.test(card.titulo)) card.tipo = 'projeto'

  // Demais segmentos: plataforma, duração e tags, nessa ordem quando existem.
  const segments = [...rest]
  const tagIndex = segments.findIndex((segment) => segment.trim().startsWith('#'))
  if (tagIndex >= 0) {
    const [raw] = segments.splice(tagIndex, 1)
    const words = raw.trim().split(/\s+/)
    const tags = words.filter((word) => word.startsWith('#'))
    card.tags = [...new Set(tags.map((tag) => tag.replace(/^#+/, '').toLowerCase()))]
    const tail = words.slice(tags.length).join(' ')
    if (tail) notes.push(tail.replace(/^\(|\)$/g, ''))
  }
  if (segments.length >= 2) {
    const { text, note } = splitTrailingNote(segments[1])
    card.estimativaMin = parseDuration(text)
    if (note) notes.push(note)
  }
  if (segments.length >= 1) {
    let platform = segments[0]
    const nested = platform.match(LINK)
    if (nested) {
      card.url ??= nested[2]
      platform = platform.replace(LINK, '$1')
    }
    const { text, note } = splitTrailingNote(platform)
    if (note) notes.push(note)
    const tipo = TIPO_WORDS[text.toLowerCase()]
    if (tipo) card.tipo = tipo
    else if (text) card.plataforma = text
  }

  if (card.url && !segments.some((segment) => TIPO_WORDS[segment.trim().toLowerCase()])) {
    if (card.tipo === 'leitura') card.tipo = tipoFromUrl(card.url, card.plataforma)
  }
  if (!card.url) {
    // Sem link mas com plataforma (Alura, DIO): é um curso a localizar por lá.
    if (card.plataforma && card.tipo === 'leitura') card.tipo = 'curso'
    if (search) card.tags = [...new Set([...card.tags, 'buscar'])]
  }
  card.notasMd = notes.join('\n\n')
  return card
}

/** Lista solta: cada linha é um link, um "[título](url)" ou só um título. */
function parseLoose(lines: string[]): ParseResult {
  const cards: ParsedCard[] = []
  const trilhas: string[] = []
  let trilha: string | null = null
  for (const raw of lines) {
    const heading = raw.match(HEADING)
    if (heading) {
      trilha = trackName(heading[1])
      continue
    }
    const text = (raw.match(BULLET)?.[1] ?? raw).trim()
    if (!text) continue
    const card = emptyCard(trilha)
    const link = text.match(LINK)
    if (link) {
      card.titulo = link[1]
      card.url = link[2]
    } else if (isUrl(text)) {
      card.url = text
      card.titulo = fallbackTitle(text)
    } else {
      card.titulo = stripBold(text)
    }
    if (card.url) {
      card.plataforma = platformFromUrl(card.url)
      card.tipo = tipoFromUrl(card.url, card.plataforma)
    }
    cards.push(card)
    if (trilha && !trilhas.includes(trilha)) trilhas.push(trilha)
  }
  return { trilhas, cards }
}

export function parseImport(markdown: string): ParseResult {
  const lines = markdown.split(/\r?\n/)

  // Blocos de código não contam (a própria seção 13 traz um exemplo do formato).
  const visible: string[] = []
  let fenced = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      continue
    }
    if (!fenced) visible.push(line)
  }
  if (!visible.some((line) => TASK.test(line))) return parseLoose(visible)

  const cards: ParsedCard[] = []
  let trilha: string | null = null
  /** Último card criado, que recebe subitens e notas recuadas. */
  let last: ParsedCard | null = null
  /** Card-checklist aberto: itens sem " · " viram itens dele. */
  let checklistCard: ParsedCard | null = null

  for (const line of visible) {
    const heading = line.match(HEADING)
    if (heading) {
      trilha = trackName(heading[1])
      last = null
      checklistCard = null
      continue
    }

    const task = line.match(TASK)
    if (task) {
      const [, indent, mark, content] = task
      const feito = mark !== ' '
      if (indent.length >= 2 && last) {
        last.checklist.push({ texto: stripBold(content), feito })
        continue
      }
      if (!SEPARATOR.test(content)) {
        // Item sem metadados: é um item de checklist. Sem card aberto, a seção vira o card.
        if (!checklistCard) {
          checklistCard = emptyCard(trilha)
          checklistCard.titulo = trilha ?? stripBold(content)
          checklistCard.tipo = 'exercicio'
          cards.push(checklistCard)
        }
        checklistCard.checklist.push({ texto: stripBold(content), feito })
        last = null
        continue
      }
      checklistCard = null
      last = parseItem(content, feito, trilha)
      cards.push(last)
      continue
    }

    const note = line.match(/^\s{2,}>\s?(.*)$/)
    if (note && last) {
      last.notasMd = last.notasMd ? `${last.notasMd}\n${note[1]}` : note[1]
      continue
    }

    const bold = line.trim().match(BOLD_LINE)
    if (bold) {
      last = null
      checklistCard = null
      const label = bold[1].replace(/:$/, '').trim()
      const body = bold[2].trim()
      if (/um card com checklist/i.test(label)) {
        // "**Entrega: checklist de produção (um card com checklist)**" abre um card-checklist.
        checklistCard = emptyCard(trilha)
        checklistCard.titulo = label.replace(/\s*\([^()]*\)\s*$/, '').replace(/^Entrega:\s*/i, '')
        checklistCard.titulo =
          checklistCard.titulo.charAt(0).toUpperCase() + checklistCard.titulo.slice(1)
        checklistCard.tipo = 'projeto'
        cards.push(checklistCard)
      } else if (/^tópicos obrigatórios/i.test(label) && body) {
        // "**Tópicos obrigatórios:** a, b, c." vira um card com um item por tópico.
        const card = emptyCard(trilha)
        const fase = trilha?.replace(/^[^:]*:\s*/, '')
        card.titulo = fase ? `Tópicos obrigatórios: ${fase}` : 'Tópicos obrigatórios'
        card.tipo = 'exercicio'
        card.checklist = splitOutsideParens(body).map((texto) => ({ texto, feito: false }))
        cards.push(card)
      }
      continue
    }
  }

  const trilhas: string[] = []
  for (const card of cards) {
    if (card.trilha && !trilhas.includes(card.trilha)) trilhas.push(card.trilha)
  }
  return { trilhas, cards }
}

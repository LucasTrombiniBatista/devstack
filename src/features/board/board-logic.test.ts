import { describe, expect, it } from 'vitest'
import type { Card, Column, Track } from '@/data/types'
import { cardProgress } from '@/features/card/progress'
import {
  formatDuration,
  formatWeekRange,
  isoWeek,
  isUrl,
  normalizeText,
  parseTags,
  weekBounds,
} from '@/lib/format'
import {
  buildCells,
  buildLanes,
  cellKey,
  findCell,
  NO_LANE,
  NO_TRACK,
  parseCell,
  targetIndex,
} from './cells'
import { activeFilterCount, EMPTY_FILTERS, hasAnyFilter, matchesFilters } from './filters'

const entity = { criadoEm: '', atualizadoEm: '', versao: 1, removidoEm: null }

function card(id: string, patch: Partial<Card> = {}): Card {
  return {
    ...entity,
    id,
    boardId: 'b',
    columnId: 'c1',
    trackId: null,
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
    ordem: id,
    concluidoEm: null,
    miniaturaUrl: null,
    links: [],
    ...patch,
  }
}

const column = (id: string): Column => ({
  ...entity,
  id,
  boardId: 'b',
  nome: id,
  ordem: id,
  limiteWip: null,
  papel: null,
})

const track = (id: string): Track => ({ ...entity, id, nome: id, cor: 'carmim', metaData: null })

describe('formatação', () => {
  it('formata durações como no design', () => {
    expect(formatDuration(480)).toBe('8h')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(260)).toBe('4h20')
    expect(formatDuration(65)).toBe('1h05')
  })

  it('calcula a semana ISO e os limites de segunda a domingo', () => {
    const date = new Date(2026, 10, 11)
    expect(isoWeek(date)).toBe(46)
    const { start, end } = weekBounds(date)
    expect([start.getDate(), end.getDate()]).toEqual([9, 15])
    expect(formatWeekRange(date, 'pt-BR')).toMatch(/^9.+15 de novembro$/)
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53)
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
  })

  it('normaliza texto, tags e reconhece links', () => {
    expect(normalizeText('Revisão AÇÃO')).toBe('revisao acao')
    expect(parseTags('#Java, spring  #docker #java')).toEqual(['java', 'spring', 'docker'])
    expect(isUrl(' https://spring.io/guides ')).toBe(true)
    expect(isUrl('Spring Guides')).toBe(false)
  })
})

describe('progresso do card', () => {
  it('usa a checklist quando existe e a porcentagem manual quando não', () => {
    expect(cardProgress({ progresso: 70 }, undefined)).toEqual({ percent: 70, label: '70%' })
    expect(cardProgress({ progresso: 70 }, { done: 1, total: 3 })).toEqual({
      percent: 33,
      label: '1/3',
    })
    expect(cardProgress({ progresso: 0 }, { done: 0, total: 0 })).toBeNull()
  })
})

describe('filtros', () => {
  const spring = card('spring', {
    titulo: 'Spring Boot 3: API Rest',
    plataforma: 'Alura',
    tags: ['java', 'spring'],
    trackId: 't1',
    prioridade: 'alta',
    notasMd: 'Lembrar da paginação',
  })

  it('busca em título, tags, plataforma e notas, ignorando acentos e caixa', () => {
    const match = (search: string) => matchesFilters(spring, { ...EMPTY_FILTERS, search })
    expect(match('spring rest')).toBe(true)
    expect(match('#java')).toBe(true)
    expect(match('alura')).toBe(true)
    expect(match('PAGINACAO')).toBe(true)
    expect(match('docker')).toBe(false)
  })

  it('combina trilha, tipo, prioridade, plataforma e tags', () => {
    const match = (patch: object) => matchesFilters(spring, { ...EMPTY_FILTERS, ...patch })
    expect(match({ trackId: 't1' })).toBe(true)
    expect(match({ trackId: 't2' })).toBe(false)
    expect(match({ tipos: ['video', 'curso'] })).toBe(true)
    expect(match({ tipos: ['video'] })).toBe(false)
    expect(match({ prioridades: ['alta'], plataformas: ['Alura'] })).toBe(true)
    expect(match({ plataformas: ['DIO'] })).toBe(false)
    expect(match({ tags: ['java', 'spring'] })).toBe(true)
    expect(match({ tags: ['java', 'docker'] })).toBe(false)
  })

  it('conta os grupos de filtro em uso', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false)
    expect(activeFilterCount({ ...EMPTY_FILTERS, tipos: ['video'], tags: ['a', 'b'] })).toBe(2)
    expect(hasAnyFilter({ ...EMPTY_FILTERS, search: ' x ' })).toBe(true)
  })
})

describe('células do quadro', () => {
  const columns = [column('c1'), column('c2')]
  const tracks = [track('t1'), track('t2')]
  const cards = [
    card('a', { trackId: 't1' }),
    card('b'),
    card('c', { columnId: 'c2', trackId: 't2' }),
    card('d', { trackId: 't1' }),
  ]

  it('sem agrupar, usa uma raia só e respeita a ordem', () => {
    const lanes = buildLanes(tracks, false, null)
    const { cells, totals } = buildCells(cards, columns, lanes, EMPTY_FILTERS, {})
    expect(cells).toEqual({
      [cellKey(NO_LANE, 'c1')]: ['a', 'b', 'd'],
      [cellKey(NO_LANE, 'c2')]: ['c'],
    })
    expect(totals[cellKey(NO_LANE, 'c1')]).toBe(3)
  })

  it('agrupado, cria uma raia por trilha e uma para cards sem trilha', () => {
    const lanes = buildLanes(tracks, true, null)
    expect(lanes.map((lane) => lane.id)).toEqual(['t1', 't2', NO_TRACK])
    const { cells } = buildCells(cards, columns, lanes, EMPTY_FILTERS, {})
    expect(cells[cellKey('t1', 'c1')]).toEqual(['a', 'd'])
    expect(cells[cellKey('t2', 'c2')]).toEqual(['c'])
    expect(cells[cellKey(NO_TRACK, 'c1')]).toEqual(['b'])
    expect(buildLanes(tracks, true, 't2').map((lane) => lane.id)).toEqual(['t2'])
  })

  it('aplica o limite por célula mas guarda o total', () => {
    const key = cellKey(NO_LANE, 'c1')
    const lanes = buildLanes(tracks, false, null)
    const { cells, totals } = buildCells(cards, columns, lanes, EMPTY_FILTERS, { [key]: 2 })
    expect(cells[key]).toEqual(['a', 'b'])
    expect(totals[key]).toBe(3)
  })

  it('acha a célula de um card e decompõe a chave', () => {
    const cells = { 'x|c1': ['a'], 'x|c2': [] }
    expect(findCell(cells, 'a')).toBe('x|c1')
    expect(findCell(cells, 'x|c2')).toBe('x|c2')
    expect(findCell(cells, 'zzz')).toBeUndefined()
    expect(parseCell('lane|col')).toEqual({ laneId: 'lane', columnId: 'col' })
  })
})

describe('posição ao soltar', () => {
  const column = ['a', 'b', 'c', 'd', 'e']

  it('fica logo depois do vizinho visível de cima', () => {
    expect(targetIndex(column, 'b', 'c')).toBe(2)
    expect(targetIndex(column, 'e', undefined)).toBe(5)
  })

  it('sem vizinho de cima, fica antes do vizinho de baixo', () => {
    expect(targetIndex(column, undefined, 'a')).toBe(0)
    expect(targetIndex(column, undefined, 'd')).toBe(3)
  })

  it('com filtro ativo, respeita os cards escondidos entre os visíveis', () => {
    // Visíveis: a e d. Solto entre eles, fica colado em "a", antes de b e c escondidos.
    expect(targetIndex(column, 'a', 'd')).toBe(1)
  })

  it('em célula vazia, vai para o fim da coluna', () => {
    expect(targetIndex(column, undefined, undefined)).toBe(5)
    expect(targetIndex([], undefined, undefined)).toBe(0)
  })
})

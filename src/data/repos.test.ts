import { describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import { boardsRepo, cardsRepo, checklistRepo, columnsRepo, tracksRepo } from '@/data/repos'
import { ensureSeed, SETTINGS_ID } from '@/data/seed'
import type { Column, ColumnPapel } from '@/data/types'
import { TEST_LABELS } from '@/test/db'

async function seeded() {
  await ensureSeed(TEST_LABELS)
  const [board] = await boardsRepo.list()
  const columns = await columnsRepo.listByBoard(board.id)
  const col = (papel: ColumnPapel) => columns.find((c) => c.papel === papel) as Column
  return { board, columns, col }
}

const titulos = async (columnId: string) =>
  (await cardsRepo.listByColumn(columnId)).map((c) => c.titulo)

describe('seed', () => {
  it('cria um quadro com as 6 colunas padrão em ordem e WIP 2 em Estudando', async () => {
    const { columns, col } = await seeded()

    expect(columns.map((c) => c.nome)).toEqual([
      'Backlog',
      'Esta semana',
      'Hoje',
      'Estudando',
      'Revisão',
      'Feito',
    ])
    expect(col('estudando').limiteWip).toBe(2)
    expect(columns.filter((c) => c.limiteWip !== null)).toHaveLength(1)
    expect((await db.settings.get(SETTINGS_ID))?.pomodoro.focoMin).toBe(25)
  })

  it('não duplica nada quando roda de novo, nem em chamadas simultâneas', async () => {
    await Promise.all([ensureSeed(TEST_LABELS), ensureSeed(TEST_LABELS)])
    await ensureSeed(TEST_LABELS)

    expect(await db.boards.count()).toBe(1)
    expect(await db.columns.count()).toBe(6)
    expect(await db.settings.count()).toBe(1)
  })
})

describe('repositório base', () => {
  it('carimba id, datas e versão ao criar', async () => {
    const track = await tracksRepo.create({ nome: 'Java e Spring', cor: '#b91c3c', metaData: null })

    expect(track.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(track.versao).toBe(1)
    expect(track.removidoEm).toBeNull()
    expect(track.criadoEm).toBe(track.atualizadoEm)
    expect(await tracksRepo.get(track.id)).toEqual(track)
  })

  it('sobe a versão ao alterar e mantém o resto', async () => {
    const track = await tracksRepo.create({ nome: 'DevOps', cor: '#111111', metaData: null })
    const updated = await tracksRepo.update(track.id, { nome: 'DevOps e deploy' })

    expect(updated).toMatchObject({ nome: 'DevOps e deploy', cor: '#111111', versao: 2 })
    expect(updated.criadoEm).toBe(track.criadoEm)
    expect(await tracksRepo.get(track.id)).toEqual(updated)
  })

  it('apaga com soft delete: some das consultas, mas fica no banco', async () => {
    const track = await tracksRepo.create({ nome: 'IA', cor: '#222222', metaData: null })
    await tracksRepo.remove(track.id)

    expect(await tracksRepo.get(track.id)).toBeUndefined()
    expect(await tracksRepo.list()).toEqual([])
    const raw = await db.tracks.get(track.id)
    expect(raw?.removidoEm).not.toBeNull()
    expect(raw?.versao).toBe(2)
    await expect(tracksRepo.update(track.id, { nome: 'x' })).rejects.toThrow(/não encontrado/)
  })
})

describe('cards', () => {
  it('cria com valores padrão no fim da coluna', async () => {
    const { board, col } = await seeded()
    const backlog = col('backlog')
    for (const titulo of ['A', 'B', 'C']) {
      await cardsRepo.create({ boardId: board.id, columnId: backlog.id, titulo })
    }

    expect(await titulos(backlog.id)).toEqual(['A', 'B', 'C'])
    const [a] = await cardsRepo.listByColumn(backlog.id)
    expect(a).toMatchObject({ tipo: 'leitura', prioridade: 'media', progresso: 0, tags: [] })
  })

  it('reordena dentro da coluna gravando só o card movido', async () => {
    const { board, col } = await seeded()
    const backlog = col('backlog')
    const ids: string[] = []
    for (const titulo of ['A', 'B', 'C', 'D']) {
      ids.push((await cardsRepo.create({ boardId: board.id, columnId: backlog.id, titulo })).id)
    }

    await cardsRepo.move(ids[3], backlog.id, 0)
    expect(await titulos(backlog.id)).toEqual(['D', 'A', 'B', 'C'])

    await cardsRepo.move(ids[0], backlog.id, 2)
    expect(await titulos(backlog.id)).toEqual(['D', 'B', 'A', 'C'])

    await cardsRepo.move(ids[3], backlog.id, 99)
    expect(await titulos(backlog.id)).toEqual(['B', 'A', 'C', 'D'])

    const versoes = (await cardsRepo.listByColumn(backlog.id)).map((c) => [c.titulo, c.versao])
    expect(versoes).toEqual([
      ['B', 1],
      ['A', 2],
      ['C', 1],
      ['D', 3],
    ])
  })

  it('move entre colunas na posição pedida', async () => {
    const { board, col } = await seeded()
    const backlog = col('backlog')
    const hoje = col('hoje')
    const a = await cardsRepo.create({ boardId: board.id, columnId: backlog.id, titulo: 'A' })
    await cardsRepo.create({ boardId: board.id, columnId: hoje.id, titulo: 'X' })
    await cardsRepo.create({ boardId: board.id, columnId: hoje.id, titulo: 'Y' })

    await cardsRepo.move(a.id, hoje.id, 1)

    expect(await titulos(backlog.id)).toEqual([])
    expect(await titulos(hoje.id)).toEqual(['X', 'A', 'Y'])
  })

  it('grava a conclusão ao entrar em Feito e limpa ao sair', async () => {
    const { board, col } = await seeded()
    const card = await cardsRepo.create({
      boardId: board.id,
      columnId: col('estudando').id,
      titulo: 'Spring Boot 3',
    })
    expect(card.concluidoEm).toBeNull()

    const feito = await cardsRepo.move(card.id, col('feito').id, 0)
    expect(feito.concluidoEm).not.toBeNull()

    const reordenado = await cardsRepo.move(card.id, col('feito').id, 0)
    expect(reordenado.concluidoEm).toBe(feito.concluidoEm)

    const reaberto = await cardsRepo.move(card.id, col('revisao').id, 0)
    expect(reaberto.concluidoEm).toBeNull()
  })

  it('aguenta muitas trocas seguidas sem perder a ordem', async () => {
    const { board, col } = await seeded()
    const backlog = col('backlog')
    const a = await cardsRepo.create({ boardId: board.id, columnId: backlog.id, titulo: 'A' })
    const b = await cardsRepo.create({ boardId: board.id, columnId: backlog.id, titulo: 'B' })
    await cardsRepo.create({ boardId: board.id, columnId: backlog.id, titulo: 'C' })

    for (let i = 0; i < 60; i++) {
      await cardsRepo.move(i % 2 === 0 ? a.id : b.id, backlog.id, 1)
    }

    expect(await titulos(backlog.id)).toEqual(['A', 'B', 'C'])
  })
})

describe('colunas e checklist', () => {
  it('cria coluna no fim e reordena', async () => {
    const { board, columns } = await seeded()
    const nova = await columnsRepo.create({ boardId: board.id, nome: 'Pausado' })
    expect((await columnsRepo.listByBoard(board.id)).at(-1)?.id).toBe(nova.id)

    await columnsRepo.move(nova.id, 1)
    const nomes = (await columnsRepo.listByBoard(board.id)).map((c) => c.nome)
    expect(nomes.slice(0, 3)).toEqual(['Backlog', 'Pausado', 'Esta semana'])
    expect(nomes).toHaveLength(columns.length + 1)
  })

  it('mantém os itens da checklist na ordem de criação', async () => {
    const { board, col } = await seeded()
    const card = await cardsRepo.create({
      boardId: board.id,
      columnId: col('backlog').id,
      titulo: 'Projeto 1',
    })
    for (const texto of ['README', 'Testes', 'Pipeline']) {
      await checklistRepo.create({ cardId: card.id, texto })
    }
    const [readme] = await checklistRepo.listByCard(card.id)
    await checklistRepo.update(readme.id, { feito: true })

    const itens = await checklistRepo.listByCard(card.id)
    expect(itens.map((i) => [i.texto, i.feito])).toEqual([
      ['README', true],
      ['Testes', false],
      ['Pipeline', false],
    ])
  })
})

describe('persistência', () => {
  it('mantém os dados depois de fechar e reabrir o banco', async () => {
    const { board, col } = await seeded()
    await cardsRepo.create({ boardId: board.id, columnId: col('hoje').id, titulo: 'Pro Git' })

    db.close()
    await db.open()

    expect(await titulos(col('hoje').id)).toEqual(['Pro Git'])
    expect(await db.columns.count()).toBe(6)
  })
})

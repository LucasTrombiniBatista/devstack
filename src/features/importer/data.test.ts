import { afterEach, describe, expect, it, vi } from 'vitest'
import devstack from '../../../DevStack.md?raw'
import { db } from '@/data/db'
import { boardsRepo, cardsRepo, checklistRepo, columnsRepo, tracksRepo } from '@/data/repos'
import { ensureSeed } from '@/data/seed'
import { captureTarget, createCardFromText, createCardFromUrl } from '@/features/capture/capture'
import { setMetadataProvider, webMetadataProvider } from '@/features/capture/metadata'
import { fallbackTitle, platformFromUrl, tipoFromUrl } from '@/features/capture/url'
import { resetDb, TEST_LABELS } from '@/test/db'
import { applyImport, planImport } from './apply'
import { exportBackup, exportCsv, exportMarkdown, restoreBackup } from './backup'
import { parseImport } from './parse'

async function seeded() {
  await ensureSeed(TEST_LABELS)
  const [board] = await boardsRepo.list()
  const columns = await columnsRepo.listByBoard(board.id)
  const col = (papel: string) => columns.find((c) => c.papel === papel)!
  return { board, col }
}

async function importAll(markdown: string, boardId: string) {
  const plan = await planImport(parseImport(markdown).cards, boardId)
  return { plan, result: await applyImport(plan.novos, boardId) }
}

const dump = async () =>
  Object.fromEntries(
    await Promise.all(
      db.tables.map(async (table) => [
        table.name,
        (await table.toArray()).sort((a, b) => (a.id < b.id ? -1 : 1)),
      ]),
    ),
  )

afterEach(() => setMetadataProvider(webMetadataProvider))

describe('reconhecer links', () => {
  it('identifica a plataforma pelo domínio', () => {
    expect(platformFromUrl('https://www.youtube.com/watch?v=x')).toBe('YouTube')
    expect(platformFromUrl('https://youtu.be/x')).toBe('YouTube')
    expect(platformFromUrl('https://cursos.alura.com.br/course/x')).toBe('Alura')
    expect(platformFromUrl('https://web.dio.me/track/x')).toBe('DIO')
    expect(platformFromUrl('https://github.com/pgvector/pgvector')).toBe('GitHub')
    expect(platformFromUrl('https://spring.io/guides')).toBeNull()
    expect(platformFromUrl('isso não é link')).toBeNull()
  })

  it('sugere o tipo de conteúdo', () => {
    expect(tipoFromUrl('https://youtu.be/x', 'YouTube')).toBe('video')
    expect(tipoFromUrl('https://www.alura.com.br/x', 'Alura')).toBe('curso')
    expect(tipoFromUrl('https://docs.docker.com/get-started/', null)).toBe('documentacao')
    expect(tipoFromUrl('https://martinfowler.com/articles/microservices.html', null)).toBe(
      'leitura',
    )
  })

  it('tira um título provisório do endereço', () => {
    expect(
      fallbackTitle('https://www.alura.com.br/curso-online-spring-boot-3-desenvolva-api-rest-java'),
    ).toBe('Spring boot 3 desenvolva api rest java')
    expect(fallbackTitle('https://martinfowler.com/articles/microservices.html')).toBe(
      'Microservices',
    )
    expect(fallbackTitle('https://www.youtube.com/watch?v=dQw4')).toBe('youtube.com')
    expect(fallbackTitle('https://sqlbolt.com/')).toBe('sqlbolt.com')
  })
})

describe('colar link cria card', () => {
  it('cria na hora no topo do Backlog e completa com os metadados depois', async () => {
    const { board, col } = await seeded()
    await cardsRepo.create({ boardId: board.id, columnId: col('backlog').id, titulo: 'Antigo' })
    setMetadataProvider({
      fetch: async () => ({
        titulo: 'Curso de Docker para iniciantes',
        miniaturaUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
        duracaoMin: 95,
      }),
    })

    const target = (await captureTarget())!
    expect(target.columnId).toBe(col('backlog').id)
    const { card, enriched } = await createCardFromUrl(
      ' https://www.youtube.com/watch?v=abc ',
      target,
    )
    expect(card).toMatchObject({
      titulo: 'youtube.com',
      url: 'https://www.youtube.com/watch?v=abc',
      plataforma: 'YouTube',
      tipo: 'video',
    })
    expect((await cardsRepo.listByColumn(col('backlog').id))[0].id).toBe(card.id)

    await enriched
    expect(await cardsRepo.get(card.id)).toMatchObject({
      titulo: 'Curso de Docker para iniciantes',
      miniaturaUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      estimativaMin: 95,
    })
  })

  it('não troca o título que a pessoa já editou, e segue sem metadados quando a rede falha', async () => {
    await seeded()
    const target = (await captureTarget())!
    let release!: () => void
    setMetadataProvider({
      fetch: () =>
        new Promise((resolve) => (release = () => resolve({ titulo: 'Título da página' }))),
    })
    const first = await createCardFromUrl('https://vimeo.com/123', target)
    await cardsRepo.update(first.card.id, { titulo: 'Meu título' })
    release()
    await first.enriched
    expect((await cardsRepo.get(first.card.id))?.titulo).toBe('Meu título')

    setMetadataProvider({ fetch: () => Promise.reject(new Error('offline')) })
    const second = await createCardFromUrl(
      'https://www.alura.com.br/curso-online-docker-basico',
      target,
    )
    await second.enriched
    expect((await cardsRepo.get(second.card.id))?.titulo).toBe('Docker basico')
  })

  it('busca metadados só nos serviços que aceitam o navegador', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({ title: ' Vídeo ', duration: 125 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    try {
      expect(await webMetadataProvider.fetch('https://www.alura.com.br/curso-x')).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(await webMetadataProvider.fetch('https://youtu.be/abc')).toEqual({
        titulo: 'Vídeo',
        miniaturaUrl: undefined,
        duracaoMin: 2,
      })
      expect(String(fetchMock.mock.calls[0][0])).toContain('youtube.com/oembed')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('texto comum vira card só com título', async () => {
    await seeded()
    const card = await createCardFromText('Revisar JPA', (await captureTarget())!)
    expect(card).toMatchObject({ titulo: 'Revisar JPA', url: null })
  })
})

describe('importar a Parte B no quadro', () => {
  it('cria trilhas, cards no Backlog e checklists', async () => {
    const { board, col } = await seeded()
    const { plan, result } = await importAll(devstack, board.id)

    expect(plan.repetidos).toBe(0)
    expect(result).toEqual({ cards: 117, trilhas: 10 })
    const tracks = await tracksRepo.listSorted()
    expect(tracks.map((track) => track.nome).slice(0, 2)).toEqual([
      'Fase 0: Base',
      'Fase 1: Java + Spring Boot',
    ])
    const backlog = await cardsRepo.listByColumn(col('backlog').id)
    expect(backlog).toHaveLength(117)
    expect(backlog[0].titulo).toBe('Pro Git em português')
    expect(backlog.every((card) => card.trackId !== null)).toBe(true)

    const projeto5 = backlog.find((card) => card.titulo.startsWith('Projeto 5'))!
    expect(await checklistRepo.listByCard(projeto5.id)).toHaveLength(9)
    expect(await db.checklistItems.count()).toBe(10 + 11 + 12 + 9 + 6 + 9)
  })

  it('importar de novo não duplica nada', async () => {
    const { board } = await seeded()
    await importAll(devstack, board.id)
    const again = await planImport(parseImport(devstack).cards, board.id)

    expect(again.novos).toEqual([])
    expect(again.repetidos).toBe(117)
  })

  it('põe os concluídos em Feito e reaproveita trilha existente', async () => {
    const { board, col } = await seeded()
    const docker = await tracksRepo.create({ nome: 'docker', cor: 'rosa', metaData: null })
    await importAll('## Docker\n- [x] Volumes · estudo · 1h\n- [ ] Redes · estudo · ?', board.id)

    expect(await tracksRepo.list()).toHaveLength(1)
    const [feito] = await cardsRepo.listByColumn(col('feito').id)
    expect(feito).toMatchObject({ titulo: 'Volumes', trackId: docker.id })
    expect(feito.concluidoEm).not.toBeNull()
    expect(await cardsRepo.listByColumn(col('backlog').id)).toHaveLength(1)
  })
})

describe('exportar e restaurar', () => {
  async function populated() {
    const { board, col } = await seeded()
    await importAll(devstack, board.id)
    const [first, second] = await cardsRepo.listByColumn(col('backlog').id)
    await cardsRepo.move(first.id, col('feito').id, 0)
    await cardsRepo.update(second.id, { notasMd: 'Linha 1\nLinha 2', prioridade: 'alta' })
    await cardsRepo.remove((await cardsRepo.listByColumn(col('backlog').id)).at(-1)!.id)
    return { board, col }
  }

  it('backup em JSON: exportar, apagar tudo e restaurar devolve o mesmo estado', async () => {
    await populated()
    const before = await dump()
    const backup = JSON.parse(JSON.stringify(await exportBackup()))

    await resetDb()
    expect(await db.cards.count()).toBe(0)
    await restoreBackup(backup)

    expect(await dump()).toEqual(before)
    // O registro apagado continua no backup, como apagado.
    expect((await db.cards.toArray()).filter((card) => card.removidoEm !== null)).toHaveLength(1)
  })

  it('recusa arquivos que não são backup e não mexe nos dados', async () => {
    await populated()
    const before = await dump()
    for (const bad of [null, {}, { app: 'outro' }, { app: 'devstack', formato: 2, dados: {} }]) {
      await expect(restoreBackup(bad)).rejects.toThrow()
    }
    await expect(
      restoreBackup({ app: 'devstack', formato: 1, dados: { cards: [{ semId: true }] } }),
    ).rejects.toThrow()
    expect(await dump()).toEqual(before)
  })

  it('Markdown: exportar e importar de volta preserva os cards', async () => {
    await populated()
    const markdown = await exportMarkdown()
    const original = (await cardsRepo.list()).length

    await resetDb()
    const { board, col } = await seeded()
    const { result } = await importAll(markdown, board.id)

    // O card apagado era o único de "Metas gerais": a trilha não é exportada.
    expect(original).toBe(116)
    expect(result).toEqual({ cards: 116, trilhas: 9 })
    const done = await cardsRepo.listByColumn(col('feito').id)
    expect(done.map((card) => card.titulo)).toEqual(['Pro Git em português'])
    const cards = await cardsRepo.list()
    const spring = cards.find((card) => card.titulo.startsWith('Spring Boot 3'))!
    expect(spring).toMatchObject({
      plataforma: 'Alura',
      estimativaMin: 600,
      tags: ['java', 'spring', 'api'],
    })
    expect(cards.find((card) => card.notasMd === 'Linha 1\nLinha 2')).toBeDefined()
    const projeto5 = cards.find((card) => card.titulo.startsWith('Projeto 5'))!
    expect(await checklistRepo.listByCard(projeto5.id)).toHaveLength(9)
    expect(await db.checklistItems.count()).toBe(57 - 9)
  })

  it('CSV: uma linha por card, com aspas onde precisa', async () => {
    const { board, col } = await seeded()
    await cardsRepo.create({
      boardId: board.id,
      columnId: col('hoje').id,
      titulo: 'Agilidade, TDD e "testes"',
      tags: ['java', 'testes'],
      estimativaMin: 90,
    })
    const [header, row, ...rest] = (await exportCsv()).trimEnd().split('\r\n')

    expect(header.split(',')).toHaveLength(13)
    expect(row).toMatch(/^"Agilidade, TDD e ""testes""",,Hoje,,leitura,,java testes,media,90,0,/)
    expect(rest).toEqual([])
  })
})

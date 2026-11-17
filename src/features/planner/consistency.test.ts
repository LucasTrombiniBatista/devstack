import { beforeEach, describe, expect, it } from 'vitest'
import { boardsRepo, cardsRepo, columnsRepo, planBlocksRepo, sessionsRepo } from '@/data/repos'
import { ensureSeed } from '@/data/seed'
import { localDate } from '@/lib/format'
import { resetDb, TEST_LABELS } from '@/test/db'
import { daySummary, pendingBlocks, planCard, pushPending } from './actions'

beforeEach(async () => {
  await resetDb()
  await ensureSeed(TEST_LABELS)
})

async function setup() {
  const [board] = await boardsRepo.list()
  const columns = await columnsRepo.listByBoard(board.id)
  const col = (papel: string) => columns.find((c) => c.papel === papel)!
  const add = (titulo: string, papel = 'hoje') =>
    cardsRepo.create({ boardId: board.id, columnId: col(papel).id, titulo, estimativaMin: null })
  return { col, add }
}

const block = (cardId: string, dia: string, inicio = '19:00', fim = '20:00', recorrente = false) =>
  planBlocksRepo.create({ cardId, dia, inicio, fim, recorrente })

describe('pendingBlocks', () => {
  it('só traz blocos do dia pedido, de cards não concluídos', async () => {
    const { add } = await setup()
    const a = await add('A')
    const done = await add('Feito', 'feito')
    await block(a.id, '2026-11-11')
    await block(a.id, '2026-11-12')
    await block(done.id, '2026-11-11', '20:00', '21:00')
    const pending = await pendingBlocks('2026-11-11')
    expect(pending.map((p) => p.card.titulo)).toEqual(['A'])
  })

  it('ignora blocos removidos e blocos de cards removidos', async () => {
    const { add } = await setup()
    const a = await add('A')
    const b = await add('B')
    const removed = await block(a.id, '2026-11-11')
    await block(b.id, '2026-11-11', '20:00', '21:00')
    await planBlocksRepo.remove(removed.id)
    await cardsRepo.remove(b.id)
    expect(await pendingBlocks('2026-11-11')).toEqual([])
  })

  it('bloco recorrente aparece no mesmo dia da semana seguinte', async () => {
    const { add } = await setup()
    const a = await add('Inglês')
    await block(a.id, '2026-11-11', '07:00', '07:30', true)
    const next = await pendingBlocks('2026-11-18')
    expect(next.map((p) => p.card.titulo)).toEqual(['Inglês'])
  })
})

describe('blocos recorrentes', () => {
  it('repete só nos dias da semana escolhidos, a partir do início', async () => {
    const { add } = await setup()
    const a = await add('Inglês')
    // 2026-11-11 é quarta; repete segunda (1) e quarta (3).
    await planCard(a.id, '2026-11-11', 7 * 60, 30, [1, 3])
    const week = [
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]
    const dias = (await planBlocksRepo.listByDays(week)).map((b) => b.dia)
    // A segunda 09/11 é antes do início, então não entra.
    expect(dias).toEqual(['2026-11-11', '2026-11-16', '2026-11-18'])
  })

  it('pular um dia não mexe nos outros', async () => {
    const { add } = await setup()
    const a = await add('Inglês')
    const rec = await planCard(a.id, '2026-11-11', 7 * 60, 30, [3])
    await planBlocksRepo.skipOccurrence(rec!.id, '2026-11-18')
    const dias = (await planBlocksRepo.listByDays(['2026-11-11', '2026-11-18', '2026-11-25'])).map(
      (b) => b.dia,
    )
    expect(dias).toEqual(['2026-11-11', '2026-11-25'])
  })

  it('remover a série tira todas as ocorrências', async () => {
    const { add } = await setup()
    const a = await add('Inglês')
    const rec = await planCard(a.id, '2026-11-11', 7 * 60, 30, [3])
    await planBlocksRepo.remove(rec!.id)
    expect(await planBlocksRepo.listByDays(['2026-11-11', '2026-11-18'])).toEqual([])
  })
})

describe('pushPending', () => {
  it('leva os pendentes para o dia seguinte no mesmo horário e deixa o concluído', async () => {
    const { add } = await setup()
    const a = await add('A')
    const done = await add('Feito', 'feito')
    const pb = await block(a.id, '2026-11-11', '10:00', '11:30')
    const db = await block(done.id, '2026-11-11', '20:00', '21:00')
    expect(await pushPending('2026-11-11')).toBe(1)
    expect(await planBlocksRepo.get(pb.id)).toMatchObject({
      dia: '2026-11-12',
      inicio: '10:00',
      fim: '11:30',
    })
    expect((await planBlocksRepo.get(db.id))!.dia).toBe('2026-11-11')
    expect(await pendingBlocks('2026-11-11')).toEqual([])
  })

  it('atravessa a virada de mês e de ano', async () => {
    const { add } = await setup()
    const a = await add('A')
    const b = await add('B')
    const x = await block(a.id, '2026-11-30')
    const y = await block(b.id, '2026-12-31')
    await pushPending('2026-11-30')
    await pushPending('2026-12-31')
    expect((await planBlocksRepo.get(x.id))!.dia).toBe('2026-12-01')
    expect((await planBlocksRepo.get(y.id))!.dia).toBe('2027-01-01')
  })

  it('sem pendentes não mexe em nada', async () => {
    expect(await pushPending('2026-11-11')).toBe(0)
  })

  it('bloco recorrente continua na data original depois de empurrar', async () => {
    const { add } = await setup()
    const a = await add('Inglês')
    const rec = await block(a.id, '2026-11-11', '07:00', '07:30', true)
    await pushPending('2026-11-11')
    expect((await planBlocksRepo.get(rec.id))!.dia).toBe('2026-11-11')
    // Só a ocorrência de hoje some; amanhã ganha um bloco avulso e a série segue.
    expect(await pendingBlocks('2026-11-11')).toEqual([])
    const amanha = await planBlocksRepo.listByDays(['2026-11-12'])
    expect(amanha).toMatchObject([{ cardId: a.id, inicio: '07:00', recorrente: false }])
    expect(await planBlocksRepo.listByDays(['2026-11-18'])).toMatchObject([{ id: rec.id }])
  })

  it('pode empurrar para um horário que já tem bloco amanhã', async () => {
    const { add } = await setup()
    const a = await add('A')
    const b = await add('B')
    await block(a.id, '2026-11-11', '19:00', '20:00')
    await block(b.id, '2026-11-12', '19:00', '20:00')
    expect(await pushPending('2026-11-11')).toBe(1)
    const amanha = await planBlocksRepo.listByDays(['2026-11-12'])
    expect(amanha.map((x) => x.inicio)).toEqual(['19:00', '19:00'])
  })
})

describe('daySummary nos limites do dia', () => {
  it('conta foco e cards pelo dia local, de 00:00 a 23:59', async () => {
    const { add } = await setup()
    const a = await add('A')
    await sessionsRepo.createManual(a.id, new Date(2026, 10, 11, 0, 0), 25)
    await sessionsRepo.createManual(a.id, new Date(2026, 10, 11, 23, 59), 30)
    await sessionsRepo.createManual(a.id, new Date(2026, 10, 10, 23, 59), 40)
    await sessionsRepo.createManual(a.id, new Date(2026, 10, 12, 0, 0), 50)
    const summary = await daySummary('2026-11-11')
    expect(summary.focusMin).toBe(55)
    expect(summary.goal).toEqual({ tipoMeta: 'horas', valorMeta: 120 })
    expect(summary.faltam).toBe(65)
    expect(summary.percent).toBe(46)
  })

  it('o ISO em UTC é convertido para o dia local antes de comparar', async () => {
    const { add } = await setup()
    const a = await add('A')
    const instant = new Date(2026, 10, 11, 23, 30)
    const s = await sessionsRepo.createManual(a.id, instant, 20)
    // O registro guarda UTC; em fusos a oeste de Greenwich isso já é o dia 12.
    expect(s.inicio).toBe(instant.toISOString())
    expect((await daySummary(localDate(instant))).focusMin).toBe(20)
    expect((await daySummary('2026-11-12')).focusMin).toBe(0)
  })

  it('card concluído conta no dia em que foi concluído', async () => {
    const { add } = await setup()
    await add('Feito hoje', 'feito')
    const summary = await daySummary(localDate(new Date()))
    expect(summary.cardsDone.map((c) => c.titulo)).toEqual(['Feito hoje'])
  })

  it('sessões de pausa não contam como foco', async () => {
    const { add } = await setup()
    const a = await add('A')
    const s = await sessionsRepo.createManual(a.id, new Date(2026, 10, 11, 10), 30)
    await sessionsRepo.update(s.id, { tipo: 'pausa' })
    expect((await daySummary('2026-11-11')).focusMin).toBe(0)
  })
})

describe('planCard e o dia de Hoje', () => {
  it('bloco planejado para hoje é o que Hoje lê; amanhã fica de fora', async () => {
    const { add } = await setup()
    const a = await add('A', 'backlog')
    const today = localDate(new Date())
    const tomorrow = localDate(new Date(Date.now() + 86_400_000))
    await planCard(a.id, today, 19 * 60)
    await planCard(a.id, tomorrow, 19 * 60)
    expect((await planBlocksRepo.listByDays([today])).map((b) => b.dia)).toEqual([today])
  })
})

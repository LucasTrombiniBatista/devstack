import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { useSettings } from '@/app/settings-store'
import { useUi } from '@/app/ui-store'
import {
  boardsRepo,
  cardsRepo,
  columnsRepo,
  dailyGoalsRepo,
  planBlocksRepo,
  sessionsRepo,
} from '@/data/repos'
import { ensureSeed } from '@/data/seed'
import { localDate } from '@/lib/format'
import { TEST_LABELS } from '@/test/db'
import { daySummary, moveBlock, pendingBlocks, planCard, pushPending, resizeBlock } from './actions'
import { addDays, defaultDuration, weekDays } from './time'

beforeEach(async () => {
  useSettings.setState({ theme: 'light', density: 'comfortable', language: 'pt-BR' })
  useUi.setState({ openCardId: null, paletteOpen: false, importText: null })
  await ensureSeed(TEST_LABELS)
})

async function setup() {
  const [board] = await boardsRepo.list()
  const columns = await columnsRepo.listByBoard(board.id)
  const col = (papel: string) => columns.find((c) => c.papel === papel)!
  const add = (titulo: string, papel = 'backlog', estimativaMin: number | null = null) =>
    cardsRepo.create({ boardId: board.id, columnId: col(papel).id, titulo, estimativaMin })
  return { col, add }
}

const today = () => localDate(new Date())

describe('datas da semana', () => {
  it('segunda a domingo, inclusive na virada do mês', () => {
    expect(weekDays(new Date(2026, 9, 29))).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('duração sugerida sai da estimativa, entre 30 min e 2h', () => {
    expect(defaultDuration(null)).toBe(60)
    expect(defaultDuration(600)).toBe(120)
    expect(defaultDuration(10)).toBe(30)
    expect(defaultDuration(80)).toBe(90)
  })
})

describe('blocos', () => {
  it('planejar cria o bloco no horário arredondado e tira o card do Backlog', async () => {
    const { col, add } = await setup()
    const card = await add('Spring Boot 3', 'backlog', 600)

    const block = (await planCard(card.id, '2026-11-11', 19 * 60 + 10))!

    expect(block).toMatchObject({ dia: '2026-11-11', inicio: '19:00', fim: '21:00' })
    expect((await cardsRepo.get(card.id))?.columnId).toBe(col('semana').id)
  })

  it('card que já está em Hoje continua em Hoje', async () => {
    const { col, add } = await setup()
    const card = await add('Docker', 'hoje')
    await planCard(card.id, '2026-11-11', 8 * 60)
    expect((await cardsRepo.get(card.id))?.columnId).toBe(col('hoje').id)
  })

  it('mover mantém a duração e não passa do fim da grade; redimensionar respeita o mínimo', async () => {
    const { add } = await setup()
    const card = await add('Git')
    const block = (await planCard(card.id, '2026-11-11', 9 * 60, 90))!

    const moved = await moveBlock(block, '2026-11-13', 22 * 60 + 40)
    expect(moved).toMatchObject({ dia: '2026-11-13', inicio: '21:30', fim: '23:00' })

    expect(await resizeBlock(moved, 21 * 60)).toMatchObject({ fim: '22:00' })
    expect(await resizeBlock(moved, 26 * 60)).toMatchObject({ fim: '23:00' })
  })
})

describe('meta diária e fim do dia', () => {
  it('meta herda a última definida; conta o foco e os cards concluídos do dia', async () => {
    const { col, add } = await setup()
    expect(await dailyGoalsRepo.forDay(today())).toMatchObject({
      tipoMeta: 'horas',
      valorMeta: 120,
    })
    await dailyGoalsRepo.setForDay(addDays(today(), -3), 'horas', 90)

    const card = await add('JPA')
    await sessionsRepo.createManual(card.id, new Date(Date.now() - 50 * 60_000), 50)
    await sessionsRepo.createManual(card.id, new Date(Date.now() - 2 * 86_400_000), 300)

    const summary = await daySummary(today())
    expect(summary).toMatchObject({ focusMin: 50, faltam: 40, percent: 56 })
    expect(summary.goal).toEqual({ tipoMeta: 'horas', valorMeta: 90 })

    await dailyGoalsRepo.setForDay(today(), 'cards', 1)
    await cardsRepo.move(card.id, col('feito').id, 0)
    expect(await daySummary(today())).toMatchObject({ faltam: 0, percent: 100 })
    // A meta de três dias atrás não mudou.
    expect(await dailyGoalsRepo.forDay(addDays(today(), -1))).toMatchObject({ valorMeta: 90 })
  })

  it('empurrar pendentes leva para amanhã só os blocos de cards não concluídos', async () => {
    const { col, add } = await setup()
    const done = await add('Feito hoje')
    const open = await add('Ficou para depois')
    await planCard(done.id, today(), 9 * 60)
    await planCard(open.id, today(), 19 * 60)
    await cardsRepo.move(done.id, col('feito').id, 0)

    expect((await pendingBlocks(today())).map(({ card }) => card.titulo)).toEqual([
      'Ficou para depois',
    ])
    expect(await pushPending(today())).toBe(1)

    const tomorrow = await planBlocksRepo.listByDays([addDays(today(), 1)])
    expect(tomorrow).toMatchObject([{ cardId: open.id, inicio: '19:00' }])
    expect(await planBlocksRepo.listByDays([today()])).toHaveLength(1)
  })
})

describe('telas', () => {
  it('Semana: planejar pelo teclado mostra o bloco e o aviso de capacidade', async () => {
    const user = userEvent.setup()
    const { add } = await setup()
    await add('Curso longo', 'backlog', 600)
    await planBlocksRepo.create({
      cardId: (await add('Outro', 'semana')).id,
      dia: weekDays(new Date())[0],
      inicio: '07:00',
      fim: '16:30',
      recorrente: false,
    })
    window.location.hash = '#/week'
    render(<App />)

    expect(await screen.findByText('Planejado 9h30 de 10h')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Planejar Curso longo' }))
    const dialog = await screen.findByRole('dialog', { name: 'Planejar card' })
    await user.selectOptions(within(dialog).getByLabelText('Início'), '20:00')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Planejado 11h30 de 10h')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Passou 1h30')
    expect(
      await screen.findByRole('button', { name: /^Curso longo, .* 20:00–22:00$/ }),
    ).toBeVisible()
  })

  it('Hoje: mostra quanto falta e encerra o dia empurrando os pendentes', async () => {
    const user = userEvent.setup()
    const { add } = await setup()
    const card = await add('Revisar JWT', 'hoje')
    await planCard(card.id, today(), 19 * 60)
    await sessionsRepo.createManual(card.id, new Date(Date.now() - 30 * 60_000), 30)
    window.location.hash = '#/today'
    render(<App />)

    expect(await screen.findByText('Falta 1h30')).toBeInTheDocument()
    expect(screen.getByText('19:00–20:00')).toBeInTheDocument()

    const hours = screen.getByLabelText('Horas')
    await user.clear(hours)
    await user.type(hours, '0,5')
    await user.tab()
    expect(await screen.findByText('Meta batida')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Encerrar o dia' }))
    const dialog = await screen.findByRole('dialog', { name: 'Encerrar o dia' })
    expect(await within(dialog).findByText('30 min de foco e nenhum card concluído.')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Empurrar 1 para amanhã' }))
    expect(await within(dialog).findByText('1 bloco foi para amanhã.')).toBeVisible()

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(screen.getByText(/Nada planejado para hoje/)).toBeInTheDocument())
  })
})

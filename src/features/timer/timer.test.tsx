import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import { useSettings } from '@/app/settings-store'
import { useUi } from '@/app/ui-store'
import { boardsRepo, cardsRepo, columnsRepo, sessionsRepo } from '@/data/repos'
import { ensureSeed } from '@/data/seed'
import { useBoardView } from '@/features/board/filters'
import { TEST_LABELS } from '@/test/db'
import { IDLE } from './engine'
import { pomodoroConfig, timer, useTimer } from './store'
import { startFocus } from './useClock'

const MIN = 60_000

beforeEach(async () => {
  useSettings.setState({
    theme: 'light',
    density: 'comfortable',
    language: 'pt-BR',
    notify: false,
    sound: false,
    openContent: true,
  })
  useBoardView.getState().reset()
  useUi.setState({ openCardId: null, paletteOpen: false, importText: null })
  useTimer.setState(IDLE, true)
  await ensureSeed(TEST_LABELS)
})

afterEach(() => {
  useTimer.setState(IDLE, true)
  vi.restoreAllMocks()
})

async function addCard(titulo: string, extra: { url?: string } = {}) {
  const [board] = await boardsRepo.list()
  const [backlog] = await columnsRepo.listByBoard(board.id)
  return cardsRepo.create({ boardId: board.id, columnId: backlog.id, titulo, ...extra })
}

const backlog = () => screen.findByRole('region', { name: 'Backlog' })

describe('timer ligado ao card', () => {
  it('Iniciar foco no painel abre o modo foco com o timer correndo; no quadro o card fica "Em foco"', async () => {
    const user = userEvent.setup()
    const card = await addCard('Estudar JPA')
    render(<App />)
    await user.click(await within(await backlog()).findByRole('button', { name: 'Estudar JPA' }))
    const panel = await screen.findByRole('dialog')
    expect(await within(panel).findByText('Nenhum tempo registrado')).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Iniciar foco' }))

    expect(await screen.findByRole('heading', { name: 'Estudar JPA', level: 1 })).toBeVisible()
    await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent(/^2[45]:\d\d$/))
    expect(screen.getByText('Foco · ciclo 1')).toBeInTheDocument()
    expect(useTimer.getState()).toMatchObject({ status: 'running', cardId: card.id })
    // Modo foco: sem barra lateral nem quadro, só card, timer e notas.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notas' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(useTimer.getState().status).toBe('paused')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.click(screen.getByRole('link', { name: 'Sair do modo foco' }))
    const tile = await within(await backlog()).findByRole('button', { name: 'Estudar JPA' })
    expect(tile).toHaveTextContent('Em foco')
    const mini = screen.getByRole('region', { name: 'Timer de foco' })
    expect(mini).toHaveTextContent('Estudar JPA')

    await user.click(within(mini).getByRole('button', { name: 'Encerrar' }))
    expect(screen.queryByRole('region', { name: 'Timer de foco' })).not.toBeInTheDocument()
    expect(tile).not.toHaveTextContent('Em foco')
  })

  it('anotações feitas no modo foco ficam no card', async () => {
    const user = userEvent.setup()
    const card = await addCard('Docker')
    window.location.hash = `#/focus/${card.id}`
    render(<App />)

    const notes = await screen.findByRole('textbox', { name: 'Notas' })
    await user.type(notes, 'volumes e redes')
    await user.click(screen.getByRole('heading', { level: 1 }))

    await waitFor(async () =>
      expect((await cardsRepo.get(card.id))?.notasMd).toBe('volumes e redes'),
    )
  })

  it('abre o conteúdo em outra aba ao iniciar, se a preferência estiver ligada', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const card = await addCard('Pro Git', { url: 'https://git-scm.com/book/pt-br/v2' })

    await startFocus(card)
    expect(open).toHaveBeenCalledWith(card.url, '_blank', 'noopener,noreferrer')

    useSettings.setState({ openContent: false })
    await startFocus(card)
    expect(open).toHaveBeenCalledTimes(1)
  })
})

describe('sessões gravadas pelo timer', () => {
  it('foco que venceu com o app fechado vira sessão do card, uma vez só', async () => {
    const card = await addCard('Spring Boot 3')
    await timer.start(card.id)
    const startedAt = Date.now() - 26 * MIN
    useTimer.setState({ runningSince: startedAt, phaseStartedAt: startedAt })

    // Duas conferências ao mesmo tempo, como o intervalo e a volta da aba.
    const ended = await Promise.all([timer.tick(), timer.tick()])

    expect(ended.filter(Boolean)).toEqual(['foco'])
    const sessions = await sessionsRepo.listByCard(card.id)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ duracaoMin: 25, tipo: 'foco', origem: 'timer' })
    expect(new Date(sessions[0].fim!).getTime()).toBe(startedAt + 25 * MIN)
    expect(useTimer.getState()).toMatchObject({ phase: 'pausaCurta', status: 'running' })
    expect(await sessionsRepo.focusMinutesByCard()).toEqual(new Map([[card.id, 25]]))
  })

  it('encerrar grava o tempo parcial e o card mostra estudado × estimado', async () => {
    const card = await addCard('SQLBolt')
    await cardsRepo.update(card.id, { estimativaMin: 120 })
    await timer.start(card.id, 'livre')
    useTimer.setState({
      runningSince: Date.now() - 50 * MIN,
      phaseStartedAt: Date.now() - 50 * MIN,
    })
    await timer.stop()

    expect(useTimer.getState()).toEqual(IDLE)
    render(<App />)
    const tile = await within(await backlog()).findByRole('button', { name: 'SQLBolt' })
    await waitFor(() => expect(tile).toHaveTextContent('50 min de 2h'))
  })

  it('usa os tempos das configurações', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/settings'
    render(<App />)

    const focus = await screen.findByRole('spinbutton', { name: 'Foco (min)' })
    await waitFor(() => expect(focus).toHaveValue(25))
    await user.clear(focus)
    await user.type(focus, '50')
    await user.tab()

    await waitFor(async () => expect((await pomodoroConfig()).focoMin).toBe(50))
    await timer.start(null)
    expect(useTimer.getState().phaseMs).toBe(50 * MIN)
  })
})

describe('sessões manuais', () => {
  it('adicionar, corrigir e remover pelo painel do card', async () => {
    const user = userEvent.setup()
    const card = await addCard('Algoritmos')
    render(<App />)
    await user.click(await within(await backlog()).findByRole('button', { name: 'Algoritmos' }))
    const panel = await screen.findByRole('dialog')

    await user.type(
      await within(panel).findByRole('spinbutton', { name: 'Minutos da nova sessão' }),
      '45',
    )
    await user.click(within(panel).getByRole('button', { name: 'Adicionar sessão' }))

    expect(await within(panel).findByText('Total: 45 min')).toBeInTheDocument()
    expect(await within(panel).findByText('45 min estudados')).toBeInTheDocument()
    const [session] = await sessionsRepo.listByCard(card.id)
    expect(session).toMatchObject({ duracaoMin: 45, origem: 'manual', tipo: 'foco' })

    const minutes = within(panel).getByRole('spinbutton', { name: 'Duração em minutos' })
    await user.clear(minutes)
    await user.type(minutes, '90')
    await user.tab()
    expect(await within(panel).findByText('Total: 1h30')).toBeInTheDocument()
    const [edited] = await sessionsRepo.listByCard(card.id)
    expect(new Date(edited.fim!).getTime() - new Date(edited.inicio).getTime()).toBe(90 * MIN)

    await user.click(within(panel).getByRole('button', { name: /^Remover sessão/ }))
    expect(await within(panel).findByText(/Nenhuma sessão registrada/)).toBeInTheDocument()
    expect(await sessionsRepo.listByCard(card.id)).toEqual([])
  })
})

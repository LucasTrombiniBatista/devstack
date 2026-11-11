import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { useSettings } from '@/app/settings-store'
import { useUi } from '@/app/ui-store'
import { db } from '@/data/db'
import { boardsRepo, cardsRepo, checklistRepo, columnsRepo, tracksRepo } from '@/data/repos'
import { ensureSeed } from '@/data/seed'
import { TEST_LABELS } from '@/test/db'
import { useBoardView } from './filters'

beforeEach(async () => {
  useSettings.setState({ theme: 'light', density: 'comfortable', language: 'pt-BR' })
  useBoardView.getState().reset()
  useUi.setState({ openCardId: null })
  await ensureSeed(TEST_LABELS)
})

async function seedCards() {
  const [board] = await boardsRepo.list()
  const columns = await columnsRepo.listByBoard(board.id)
  const col = (papel: string) => columns.find((c) => c.papel === papel)!.id
  const java = await tracksRepo.create({ nome: 'Java e Spring', cor: 'carmim', metaData: null })
  const base = { boardId: board.id }
  await cardsRepo.create({
    ...base,
    columnId: col('backlog'),
    titulo: 'Spring Boot 3',
    tipo: 'curso',
    plataforma: 'Alura',
    tags: ['java', 'spring'],
    estimativaMin: 600,
    trackId: java.id,
  })
  await cardsRepo.create({
    ...base,
    columnId: col('backlog'),
    titulo: 'Docker Get Started',
    tipo: 'documentacao',
    tags: ['docker'],
    progresso: 70,
  })
  for (const titulo of ['A', 'B', 'C']) {
    await cardsRepo.create({ ...base, columnId: col('estudando'), titulo })
  }
  return { board, col, java }
}

const columnRegion = (name: string) => screen.findByRole('region', { name })

describe('quadro', () => {
  it('mostra os cards nas colunas com tipo, plataforma, estimativa, tags e progresso', async () => {
    await seedCards()
    render(<App />)

    const backlog = await columnRegion('Backlog')
    const spring = await within(backlog).findByRole('button', { name: 'Spring Boot 3' })
    expect(spring).toHaveTextContent('Curso · Alura')
    expect(spring).toHaveTextContent('10h')
    expect(spring).toHaveTextContent('#java #spring')

    const docker = within(backlog).getByRole('button', { name: 'Docker Get Started' })
    expect(docker).toHaveTextContent('?')
    expect(docker).toHaveTextContent('70%')
  })

  it('avisa quando a coluna passa do limite de WIP', async () => {
    await seedCards()
    render(<App />)

    const estudando = await columnRegion('Estudando')
    expect(await within(estudando).findByText(/WIP 3\/2/)).toBeInTheDocument()
    expect(within(estudando).getByText(/Acima do limite/)).toBeInTheDocument()
  })

  it('cria cards pela criação rápida, um atrás do outro, e reconhece link', async () => {
    const user = userEvent.setup()
    render(<App />)

    const backlog = await columnRegion('Backlog')
    await user.click(within(backlog).getByRole('button', { name: 'Novo card' }))
    await user.keyboard('Pro Git{Enter}https://sqlbolt.com/{Enter}')

    expect(await within(backlog).findByRole('button', { name: 'Pro Git' })).toBeInTheDocument()
    await within(backlog).findByRole('button', { name: 'https://sqlbolt.com/' })
    const cards = await db.cards.toArray()
    expect(cards.find((c) => c.titulo === 'Pro Git')?.url).toBeNull()
    expect(cards.find((c) => c.titulo.includes('sqlbolt'))?.url).toBe('https://sqlbolt.com/')
  })

  it('filtra pela busca e pela trilha da barra lateral', async () => {
    const user = userEvent.setup()
    await seedCards()
    render(<App />)
    await screen.findByRole('button', { name: 'Spring Boot 3' })

    await user.type(screen.getByRole('searchbox', { name: 'Buscar cards' }), 'docker')
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Spring Boot 3' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Docker Get Started' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await user.click(screen.getByRole('button', { name: /^Java e Spring/ }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Docker Get Started' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Spring Boot 3' })).toBeInTheDocument()
  })

  it('agrupa por trilha em raias', async () => {
    await seedCards()
    useBoardView.getState().setGroupByTrack(true)
    render(<App />)

    const java = await screen.findByRole('region', { name: 'Java e Spring' })
    expect(await within(java).findByRole('button', { name: 'Spring Boot 3' })).toBeInTheDocument()
    const semTrilha = screen.getByRole('region', { name: 'Sem trilha' })
    expect(
      within(semTrilha).getByRole('button', { name: 'Docker Get Started' }),
    ).toBeInTheDocument()
    expect(within(java).queryByRole('button', { name: 'Docker Get Started' })).toBeNull()
  })
})

describe('detalhe do card', () => {
  it('abre com Enter, edita título, tags, checklist e notas, e grava tudo', async () => {
    const user = userEvent.setup()
    await seedCards()
    render(<App />)

    const tile = await screen.findByRole('button', { name: 'Docker Get Started' })
    tile.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog')

    const title = await within(dialog).findByRole('textbox', { name: 'Título' })
    await user.clear(title)
    await user.type(title, 'Docker na prática')
    const tags = within(dialog).getByLabelText('Tags')
    await user.clear(tags)
    await user.type(tags, '#docker #devops')
    await user.type(within(dialog).getByRole('textbox', { name: 'Notas' }), '# Resumo')

    const addItem = within(dialog).getByRole('textbox', { name: 'Adicionar item e Enter' })
    await user.type(addItem, 'Instalar{Enter}Rodar hello-world{Enter}')
    await user.click(await within(dialog).findByRole('checkbox', { name: 'Instalar' }))
    expect(await within(dialog).findByText('1/2')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const updated = await screen.findByRole('button', { name: 'Docker na prática' })
    await waitFor(() => expect(updated).toHaveTextContent('1/2'))
    const card = (await db.cards.toArray()).find((c) => c.titulo === 'Docker na prática')
    expect(card).toMatchObject({ tags: ['docker', 'devops'], notasMd: '# Resumo' })
    expect((await checklistRepo.listByCard(card!.id)).map((i) => i.feito)).toEqual([true, false])
  })

  it('"Novo card" cria no Backlog e abre o detalhe; excluir pede confirmação', async () => {
    const user = userEvent.setup()
    render(<App />)
    await columnRegion('Backlog')

    await user.click(screen.getAllByRole('button', { name: 'Novo card' })[0])
    const dialog = await screen.findByRole('dialog')
    const title = await within(dialog).findByRole('textbox', { name: 'Título' })
    await waitFor(() => expect(title).toHaveFocus())
    await user.keyboard('Kubernetes')
    await user.tab()
    // O quadro fica escondido de leitores de tela enquanto o painel está aberto.
    expect(
      await screen.findByRole('button', { name: 'Kubernetes', hidden: true }),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Excluir card' }))
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Kubernetes' })).not.toBeInTheDocument(),
    )
    expect(await cardsRepo.list()).toEqual([])
  })
})

describe('trilhas e colunas', () => {
  it('cria uma trilha pela barra lateral', async () => {
    const user = userEvent.setup()
    render(<App />)
    await columnRegion('Backlog')

    await user.click(screen.getByRole('button', { name: 'Nova trilha' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), 'DevOps e deploy')
    await user.click(within(dialog).getByRole('radio', { name: 'Rosa' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('button', { name: /^DevOps e deploy/ })).toBeInTheDocument()
    expect(await tracksRepo.listSorted()).toMatchObject([{ nome: 'DevOps e deploy', cor: 'rosa' }])
  })

  it('excluir uma trilha deixa os cards sem trilha', async () => {
    const { java } = await seedCards()
    await tracksRepo.removeAndDetach(java.id)

    expect(await tracksRepo.list()).toEqual([])
    const spring = (await cardsRepo.list()).find((c) => c.titulo === 'Spring Boot 3')
    expect(spring?.trackId).toBeNull()
  })

  it('cria uma coluna nova com limite de WIP', async () => {
    const user = userEvent.setup()
    render(<App />)
    await columnRegion('Backlog')

    await user.click(screen.getByRole('button', { name: 'Nova coluna' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), 'Pausado')
    await user.type(within(dialog).getByLabelText('Limite de WIP'), '3')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }))

    const pausado = await columnRegion('Pausado')
    expect(within(pausado).getByText('WIP 0/3')).toBeInTheDocument()
  })
})

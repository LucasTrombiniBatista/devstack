import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { useSettings } from '@/app/settings-store'
import { useUi } from '@/app/ui-store'
import { cardsRepo, tracksRepo } from '@/data/repos'
import { ensureSeed } from '@/data/seed'
import { useBoardView } from '@/features/board/filters'
import { setMetadataProvider, webMetadataProvider } from '@/features/capture/metadata'
import { TEST_LABELS } from '@/test/db'

beforeEach(async () => {
  useSettings.setState({ theme: 'light', density: 'comfortable', language: 'pt-BR' })
  useBoardView.getState().reset()
  useUi.setState({ openCardId: null, paletteOpen: false, importText: null })
  setMetadataProvider({ fetch: async () => null })
  await ensureSeed(TEST_LABELS)
})

afterEach(() => setMetadataProvider(webMetadataProvider))

const backlog = () => screen.findByRole('region', { name: 'Backlog' })

function paste(target: Element | Window, text: string) {
  fireEvent.paste(target, { clipboardData: { getData: () => text } })
}

describe('paleta de comandos', () => {
  it('Ctrl+K abre; colar um link e Enter cria o card no Backlog', async () => {
    const user = userEvent.setup()
    setMetadataProvider({ fetch: async () => ({ titulo: 'Docker em 1 hora' }) })
    render(<App />)
    await backlog()

    await user.keyboard('{Control>}k{/Control}')
    const input = await screen.findByPlaceholderText('Novo card, colar link ou buscar…')
    await user.type(input, 'https://www.youtube.com/watch?v=abc')
    expect(await screen.findByText(/Criar card a partir de/)).toBeInTheDocument()
    await user.keyboard('{Enter}')

    const card = await within(await backlog()).findByRole('button', { name: 'Docker em 1 hora' })
    expect(card).toHaveTextContent('Vídeo · YouTube')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('procura um card pelo texto e abre o detalhe', async () => {
    const user = userEvent.setup()
    const target = (await cardsRepo.list()).length
    expect(target).toBe(0)
    render(<App />)
    const region = await backlog()
    await user.click(within(region).getByRole('button', { name: 'Novo card' }))
    await user.keyboard('Spring Security com JWT{Enter}{Escape}')
    await within(region).findByRole('button', { name: 'Spring Security com JWT' })

    await user.keyboard('{Control>}k{/Control}')
    await user.type(await screen.findByPlaceholderText(/Novo card/), 'jwt')
    await user.click(await screen.findByRole('option', { name: /Spring Security com JWT/ }))

    const panel = await screen.findByRole('dialog')
    expect(await within(panel).findByRole('textbox', { name: 'Título' })).toHaveValue(
      'Spring Security com JWT',
    )
  })

  it('navega pelos comandos', async () => {
    const user = userEvent.setup()
    render(<App />)
    await backlog()

    await user.keyboard('{Control>}k{/Control}')
    await user.type(await screen.findByPlaceholderText(/Novo card/), 'config')
    await user.click(await screen.findByRole('option', { name: 'Ir para Configurações' }))

    expect(await screen.findByRole('heading', { name: 'Dados' })).toBeInTheDocument()
  })
})

describe('colar no quadro', () => {
  it('um link colado fora de um campo vira card', async () => {
    render(<App />)
    await backlog()

    paste(document.body, 'https://www.alura.com.br/curso-online-containers-na-pratica-com-docker')

    const card = await within(await backlog()).findByRole('button', {
      name: 'Containers na pratica com docker',
    })
    expect(card).toHaveTextContent('Curso · Alura')
  })

  it('várias linhas abrem a importação com prévia; confirmar cria cards e trilhas', async () => {
    const user = userEvent.setup()
    render(<App />)
    await backlog()

    paste(
      document.body,
      [
        '## DevOps',
        '- [ ] [Docker Get Started](https://docs.docker.com/get-started/) · documentação · 2h · #docker',
        '- [ ] Kubernetes na prática (buscar pelo nome) · DIO · ? · #kubernetes',
        '  - [ ] Pods',
      ].join('\n'),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Importar lista' })
    expect(await within(dialog).findByText('2 cards novos em 1 trilhas.')).toBeInTheDocument()
    expect(within(dialog).getByText('Docker Get Started')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Importar 2 cards' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const region = await backlog()
    expect(await within(region).findByRole('button', { name: 'Docker Get Started' })).toBeVisible()
    expect(within(region).getByRole('button', { name: 'Kubernetes na prática' })).toHaveTextContent(
      '0/1',
    )
    expect((await tracksRepo.list()).map((track) => track.nome)).toEqual(['DevOps'])

    // Colar de novo: nada novo para importar.
    paste(
      document.body,
      '- [ ] [Docker Get Started](https://docs.docker.com/get-started/) · x · ?\n- [ ] [Outro](https://a.b/c) · x · ?',
    )
    const again = await screen.findByRole('dialog', { name: 'Importar lista' })
    expect(await within(again).findByText(/1 já existem/)).toBeInTheDocument()
    expect(within(again).getByRole('button', { name: 'Importar 1 cards' })).toBeEnabled()
  })

  it('colar dentro de um campo de texto não cria card', async () => {
    const user = userEvent.setup()
    render(<App />)
    await backlog()
    const search = screen.getByRole('searchbox', { name: 'Buscar cards' })
    await user.click(search)

    paste(search, 'https://www.alura.com.br/curso-x')

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(await cardsRepo.list()).toEqual([])
  })
})

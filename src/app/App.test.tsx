import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { useSettings } from '@/app/settings-store'

beforeEach(() => {
  useSettings.setState({ theme: 'system', density: 'comfortable', language: 'pt-BR' })
})

describe('casca do app', () => {
  it('abre no quadro e mostra a navegação', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Quadro' })).toBeInTheDocument()
    for (const name of ['Quadro', 'Semana', 'Configurações']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('troca o tema nas configurações', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: 'Configurações' }))
    await user.click(screen.getByRole('radio', { name: 'Escuro' }))
    expect(document.documentElement).toHaveClass('dark')

    await user.click(screen.getByRole('radio', { name: 'Claro' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('troca o idioma e a densidade', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: 'Configurações' }))
    await user.click(screen.getByRole('radio', { name: 'English' }))
    expect(await screen.findByRole('link', { name: 'Board' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')

    await user.click(screen.getByRole('radio', { name: 'Compact' }))
    expect(document.documentElement.dataset.density).toBe('compact')
  })
})

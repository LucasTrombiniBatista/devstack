import { expect, test } from '@playwright/test'

test.use({ locale: 'pt-BR' })

test('estudar: iniciar foco pelo card, anotar, marcar progresso e registrar a sessão', async ({
  page,
}) => {
  // Relógio controlado: dá para "passar" 25 minutos sem esperar.
  await page.clock.install({ time: new Date('2026-11-11T09:00:00') })
  await page.goto('/')

  const hoje = page.getByRole('region', { name: 'Hoje' })
  await hoje.hover()
  await hoje.getByRole('button', { name: 'Novo card' }).click()
  await page.keyboard.type('Spring Security com JWT')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')

  await hoje.getByRole('button', { name: 'Spring Security com JWT' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Iniciar foco' }).click()

  // Modo foco: só o card, o timer e as notas.
  await expect(page).toHaveURL(/#\/focus\//)
  await expect(page.getByRole('heading', { name: 'Spring Security com JWT' })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
  const clock = page.getByRole('timer')
  await expect(clock).toHaveText(/^2[45]:\d\d$/)
  await expect(page).toHaveTitle(/^2[45]:\d\d · DevStack$/)

  await page.getByRole('textbox', { name: 'Notas' }).fill('## Filtro JWT\n\n- valida o token')
  await page.getByRole('tab', { name: 'Visualizar' }).click()
  await expect(page.getByRole('heading', { name: 'Filtro JWT' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Adicionar item e Enter' }).fill('Ler a documentação')
  await page.keyboard.press('Enter')
  await page.getByRole('checkbox', { name: 'Ler a documentação' }).click()

  // Dez minutos depois, recarregar não zera nem atrasa a contagem.
  await page.clock.fastForward('10:00')
  await expect(clock).toHaveText(/^1[45]:\d\d$/)
  await page.waitForTimeout(300)
  await page.reload()
  await expect(clock).toHaveText(/^1[45]:\d\d$/)
  await expect(page.getByText('Foco · ciclo 1')).toBeVisible()

  // O tempo acaba com a aba parada (o salto só dispara os temporizadores uma vez).
  await page.clock.fastForward('15:30')
  await expect(page.getByText('Pausa curta')).toBeVisible()
  await expect(clock).toHaveText(/^0[34]:\d\d$/)

  // De volta ao quadro: o card mostra o tempo estudado, o progresso e a pausa.
  await page.getByRole('link', { name: 'Sair do modo foco' }).click()
  const card = hoje.getByRole('button', { name: 'Spring Security com JWT' })
  await expect(card).toContainText('25 min')
  await expect(card).toContainText('Em pausa')
  const mini = page.getByRole('region', { name: 'Timer de foco' })
  await expect(mini).toContainText('Pausa curta')
  await mini.getByRole('button', { name: 'Encerrar' }).click()
  await expect(mini).toHaveCount(0)
  await expect(card).toContainText('1/1')

  // A sessão ficou registrada no card, e continua lá depois de recarregar.
  await page.reload()
  await hoje.getByRole('button', { name: 'Spring Security com JWT' }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByText('Total: 25 min')).toBeVisible()
  await expect(panel.getByRole('spinbutton', { name: 'Duração em minutos' })).toHaveValue('25')
  await expect(panel.getByText('25 min estudados')).toBeVisible()
})

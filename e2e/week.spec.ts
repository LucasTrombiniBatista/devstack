import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ locale: 'pt-BR', viewport: { width: 1440, height: 1000 } })

/** Pixels por minuto na grade (fatia de 30 min = 20 px) e hora em que ela começa. */
const PX_PER_MIN = 20 / 30
const GRID_START = 7 * 60

/** Arrasta `source` para que o topo dele caia no horário `minute` da coluna do dia. */
async function dragToTime(page: Page, source: Locator, day: string, minute: number) {
  const from = (await source.boundingBox())!
  const grid = (await page.locator(`[data-day="${day}"]`).boundingBox())!
  const grabY = from.y + from.height / 2
  const targetTop = grid.y + (minute - GRID_START) * PX_PER_MIN
  const x = grid.x + grid.width / 2
  await page.mouse.move(from.x + from.width / 2, grabY)
  await page.mouse.down()
  await page.mouse.move(x, targetTop + from.height / 2 + 2, { steps: 15 })
  await page.mouse.move(x, targetTop + from.height / 2 + 3, { steps: 2 })
  await page.mouse.up()
}

test('planejar a semana com o backlog importado: arrastar, esticar, mover e ver a capacidade', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-11T08:00:00') })

  // Backlog importado do DevStack.md e capacidade de 2h por semana.
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Importar lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar lista' })
  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await dialog.getByRole('button', { name: 'Importar 117 cards' }).click()
  await expect(page.getByRole('region', { name: 'Backlog' })).toBeVisible()
  await page.getByRole('link', { name: 'Configurações' }).click()
  await page.getByLabel('Horas disponíveis por semana').fill('2')
  await page.getByLabel('Horas disponíveis por semana').blur()

  await page.getByRole('link', { name: 'Semana' }).click()
  await expect(page.getByText('Planejado 0 min de 2h')).toBeVisible()

  // Arrastar o card da lista para quarta às 10h.
  await dragToTime(page, page.locator('[data-plan-card="Pro Git em português"]'), '2026-11-11', 600)
  const block = page.getByRole('button', { name: /^Pro Git em português, / })
  await expect(block).toHaveAccessibleName(/10:00–11:00$/)
  await expect(page.getByText('Planejado 1h de 2h')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)

  // Esticar até 12h30 passa da capacidade.
  const handle = page.locator(`[data-day="2026-11-11"] [data-resize-handle]`)
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60, { steps: 8 })
  await page.mouse.up()
  await expect(block).toHaveAccessibleName(/10:00–12:30$/)
  await expect(page.getByRole('alert')).toHaveText('Passou 30 min')

  // Mover o bloco para quinta às 19h, mantendo a duração.
  await dragToTime(page, block, '2026-11-12', 19 * 60)
  await expect(block).toHaveAccessibleName(/qui.*19:00–21:30$/)

  // Tudo continua depois de recarregar; o card saiu do Backlog para "Esta semana".
  await page.waitForTimeout(300)
  await page.reload()
  await expect(block).toHaveAccessibleName(/qui.*19:00–21:30$/)
  await page.getByRole('link', { name: 'Quadro' }).click()
  await expect(
    page
      .getByRole('region', { name: 'Esta semana' })
      .getByRole('button', { name: 'Pro Git em português' }),
  ).toBeVisible()
})

test('encerrar o dia empurra o que ficou pendente para amanhã', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T08:00:00') })
  await page.goto('/')
  const hoje = page.getByRole('region', { name: 'Hoje' })
  await hoje.hover()
  await hoje.getByRole('button', { name: 'Novo card' }).click()
  await page.keyboard.type('Revisar SQL')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Semana' }).click()
  await page.getByRole('button', { name: 'Planejar Revisar SQL' }).click()
  const plan = page.getByRole('dialog', { name: 'Planejar card' })
  await plan.getByLabel('Dia').selectOption({ label: 'quarta-feira, 11 de novembro' })
  await plan.getByRole('button', { name: 'Salvar' }).click()

  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByText('Falta 2h')).toBeVisible()
  await expect(page.getByText('19:00–20:00')).toBeVisible()

  await page.getByRole('button', { name: 'Encerrar o dia' }).click()
  const end = page.getByRole('dialog', { name: 'Encerrar o dia' })
  await expect(end.getByText('0 min de foco e nenhum card concluído.')).toBeVisible()
  await end.getByRole('button', { name: 'Empurrar 1 para amanhã' }).click()
  await expect(end.getByText('1 bloco foi para amanhã.')).toBeVisible()
  await end.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.getByText(/Nada planejado para hoje/)).toBeVisible()

  await page.getByRole('link', { name: 'Semana' }).click()
  await expect(page.getByRole('button', { name: /^Revisar SQL, qui.* 19:00–20:00$/ })).toBeVisible()
})

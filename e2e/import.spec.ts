import { expect, test } from '@playwright/test'

test.use({ locale: 'pt-BR' })

test('importa a Parte B do DevStack.md, faz backup e restaura', async ({ page }) => {
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Importar lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar lista' })

  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await expect(dialog.getByText('117 cards novos em 10 trilhas.')).toBeVisible()
  await expect(
    dialog
      .getByRole('region', { name: 'Fase 1: Java + Spring Boot' })
      .getByText('Spring Boot 3: desenvolva uma API Rest em Java'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Importar 117 cards' }).click()

  // Vai para o quadro: tudo no Backlog, 50 na tela, trilhas na barra lateral.
  const backlog = page.getByRole('region', { name: 'Backlog' })
  await expect(backlog.getByRole('button', { name: 'Pro Git em português' })).toBeVisible()
  await expect(backlog.locator('[data-card-id]')).toHaveCount(50)
  await expect(backlog.getByRole('button', { name: 'Mostrar mais (67)' })).toBeVisible()
  const sidebar = page.getByRole('complementary')
  await expect(sidebar.getByRole('button', { name: /^Fase \d/ })).toHaveCount(7)
  await expect(
    sidebar.getByRole('button', { name: /^Fase 1: Java \+ Spring Boot\s*12$/ }),
  ).toBeVisible()

  // Filtrar por trilha mostra só os cards dela.
  await sidebar.getByRole('button', { name: /^Fase 0: Base/ }).click()
  await expect(backlog.locator('[data-card-id]')).toHaveCount(9)
  await sidebar.getByRole('button', { name: /^Fase 0: Base/ }).click()

  // Importar o mesmo arquivo de novo não traz nada.
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Novo card, colar link ou buscar…').fill('importar')
  await page.getByRole('option', { name: 'Importar lista' }).click()
  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await expect(dialog.getByText('117 já existem e serão ignorados.')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Importar 0 cards' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Cancelar' }).click()

  // Backup, uma mudança, e restaurar desfaz a mudança.
  await page.getByRole('link', { name: 'Configurações' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Backup completo (JSON)' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^devstack-\d{4}-\d{2}-\d{2}\.json$/)
  const backupPath = await download.path()

  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Novo card, colar link ou buscar…').fill('Card depois do backup')
  await page.keyboard.press('Enter')
  await expect(backlog.getByRole('button', { name: 'Card depois do backup' })).toBeVisible()
  await expect(backlog.locator('[data-card-id]').first()).toHaveAttribute(
    'aria-label',
    'Card depois do backup',
  )

  await page.getByRole('link', { name: 'Configurações' }).click()
  await page.getByLabel('Restaurar backup').setInputFiles(backupPath)
  await page.getByRole('button', { name: 'Substituir tudo' }).click()
  await expect(page.getByText('Backup restaurado.')).toBeVisible()

  await page.getByRole('link', { name: 'Quadro' }).click()
  await expect(backlog.getByRole('button', { name: 'Pro Git em português' })).toBeVisible()
  await expect(backlog.getByRole('button', { name: 'Card depois do backup' })).toHaveCount(0)
  await expect(backlog.getByRole('button', { name: 'Mostrar mais (67)' })).toBeVisible()
})

test('exporta Markdown e CSV', async ({ page }) => {
  await page.goto('/')
  const backlog = page.getByRole('region', { name: 'Backlog' })
  await backlog.getByRole('button', { name: 'Novo card' }).click()
  await page.keyboard.type('Revisar JPA')
  await page.keyboard.press('Enter')
  await expect(backlog.getByRole('button', { name: 'Revisar JPA' })).toBeVisible()

  await page.getByRole('link', { name: 'Configurações' }).click()
  for (const [button, extension, expected] of [
    ['Markdown', 'md', '- [ ] Revisar JPA · leitura · ?'],
    ['CSV', 'csv', 'Revisar JPA,,Backlog,,leitura'],
  ] as const) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: button, exact: true }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`))
    const stream = await download.createReadStream()
    let content = ''
    for await (const chunk of stream) content += chunk.toString('utf8')
    expect(content).toContain(expected)
  }
})

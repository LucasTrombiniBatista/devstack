import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ locale: 'pt-BR' })

test('depois da primeira visita, o app abre sem internet com os dados', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const backlog = page.getByRole('region', { name: 'Backlog' })
  await backlog.hover()
  await backlog.getByRole('button', { name: 'Novo card' }).click()
  await page.keyboard.type('Estudar offline')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')

  // Espera o service worker terminar de guardar os arquivos do app.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) throw new Error('service worker inativo')
  })

  await context.setOffline(true)
  await page.reload()
  await expect(backlog.getByRole('button', { name: 'Estudar offline' })).toBeVisible()
  // Telas carregadas sob demanda também abrem offline.
  await page.getByRole('link', { name: 'Semana' }).click()
  await expect(page.getByRole('heading', { name: 'Semana', level: 1 })).toBeVisible()
  await context.setOffline(false)
})

for (const theme of ['light', 'dark'] as const) {
  test(`acessibilidade (axe) nas telas principais, tema ${theme}`, async ({ page }) => {
    await page.addInitScript((theme) => {
      localStorage.setItem(
        'devstack:settings',
        JSON.stringify({ state: { theme, density: 'comfortable', language: 'pt-BR' }, version: 1 }),
      )
    }, theme)
    await page.goto('/')
    const backlog = page.getByRole('region', { name: 'Backlog' })
    await backlog.hover()
    await backlog.getByRole('button', { name: 'Novo card' }).click()
    await page.keyboard.type('Pro Git')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')

    const screens: [string, string][] = [
      ['#/board', 'Meus estudos'],
      ['#/today', 'Hoje'],
      ['#/week', 'Semana'],
      ['#/settings', 'Configurações'],
    ]
    for (const [hash, heading] of screens) {
      await page.goto(`/${hash}`)
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      expect(
        violations.map(
          (v) =>
            `${hash} ${v.id}: ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(' | ')}`,
        ),
      ).toEqual([])
    }

    // Painel do card e modo foco.
    await page.goto('/#/board')
    await backlog.getByRole('button', { name: 'Pro Git' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // Espera a animação de abertura terminar antes de medir o contraste.
    await page.waitForTimeout(600)
    let { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(
      violations.map(
        (v) =>
          `painel ${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(' | ')}`,
      ),
    ).toEqual([])
    await page.getByRole('dialog').getByRole('button', { name: 'Iniciar foco' }).click()
    await expect(page.getByRole('timer')).toBeVisible()
    ;({ violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())
    expect(
      violations.map(
        (v) =>
          `foco ${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(' | ')}`,
      ),
    ).toEqual([])
  })
}

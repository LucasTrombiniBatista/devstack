import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ locale: 'pt-BR' })

const COMBOS = [
  { id: 'brancoPreto', fundo: 'neutro', destaque: '#111111', theme: 'light' },
  { id: 'brancoVermelho', fundo: 'neutro', destaque: '#c8102e', theme: 'light' },
  { id: 'pretoVerde', fundo: 'neutro', destaque: '#22c55e', theme: 'dark' },
  { id: 'grafiteAzul', fundo: 'frio', destaque: '#60a5fa', theme: 'dark' },
]

for (const combo of COMBOS) {
  test(`acessibilidade (axe) com a combinação ${combo.id}`, async ({ page }) => {
    await page.addInitScript((combo) => {
      localStorage.setItem(
        'devstack:settings',
        JSON.stringify({
          state: {
            theme: combo.theme,
            fundo: combo.fundo,
            destaque: combo.destaque,
            navPosition: 'top',
            toolbarSide: 'left',
            density: 'comfortable',
            language: 'pt-BR',
          },
          version: 2,
        }),
      )
    }, combo)

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
  })
}

test('trocar a combinação em Configurações muda o app inteiro sem recarregar', async ({ page }) => {
  await page.goto('/#/settings')
  const primary = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    )
  await page.getByRole('button', { name: 'Preto e verde' }).click()
  expect(await primary()).toBe('#22c55e')
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.getByRole('radio', { name: 'Superior' }).check({ force: true })
  await expect(page.getByRole('heading', { name: 'Trilhas' })).toBeHidden()

  await page.getByRole('button', { name: 'Restaurar padrão' }).click()
  expect(await primary()).toBe('#b81437')
})

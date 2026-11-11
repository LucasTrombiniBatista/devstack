import { expect, test } from '@playwright/test'

test('casca abre, navega e guarda o tema', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Meus estudos|My studies/ })).toBeVisible()
  await expect(page.getByRole('main').getByRole('region')).toHaveCount(6)

  await page.getByRole('link', { name: /Configurações|Settings/ }).click()
  await page.getByText(/^(Escuro|Dark)$/).click()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)

  // O quadro vem do IndexedDB: recarregar não pode duplicar nem perder colunas.
  await page.getByRole('link', { name: /Quadro|Board/ }).click()
  await expect(page.getByRole('main').getByRole('region')).toHaveCount(6)
})

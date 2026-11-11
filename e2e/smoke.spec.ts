import { expect, test } from '@playwright/test'

test('casca abre, navega e guarda o tema', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Quadro|Board/ })).toBeVisible()

  await page.getByRole('link', { name: /Configurações|Settings/ }).click()
  await page.getByText(/^(Escuro|Dark)$/).click()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

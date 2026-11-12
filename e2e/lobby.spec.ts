import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'pt-BR' })

function settings(state: Record<string, string>) {
  return JSON.stringify({
    state: { density: 'comfortable', language: 'pt-BR', ...state },
    version: 2,
  })
}

/** Grava sessões de foco direto no IndexedDB do app (hoje e ontem). */
async function seedFocus(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('devstack')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('sessions', 'readwrite')
    const store = tx.objectStore('sessions')
    for (const [id, daysAgo, min] of [
      ['s1', 0, 50],
      ['s2', 1, 120],
    ] as const) {
      const inicio = new Date(Date.now() - daysAgo * 86_400_000).toISOString()
      store.put({
        id,
        cardId: null,
        inicio,
        fim: inicio,
        duracaoMin: min,
        tipo: 'foco',
        origem: 'manual',
        criadoEm: inicio,
        atualizadoEm: inicio,
        versao: 1,
        removidoEm: null,
      })
    }
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  })
}

const cases = [
  { name: 'tema claro', state: { theme: 'light' } },
  { name: 'tema escuro', state: { theme: 'dark' } },
  {
    name: 'preto e verde',
    state: { theme: 'dark', fundo: 'neutro', destaque: '#22c55e' },
  },
]

for (const { name, state } of cases) {
  test(`Lobby com dados e acessível (axe), ${name}`, async ({ page }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('devstack:settings', value),
      settings(state),
    )
    await page.goto('/#/lobby')
    await expect(page.getByRole('heading', { name: 'Lobby', level: 1 })).toBeVisible()
    await seedFocus(page)
    await page.reload()

    // Total de 7 dias no resumo (o centro da rosca mostra o mesmo valor).
    await expect(page.getByText('2h50', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('2 dias', { exact: true })).toBeVisible()
    for (const chart of [
      'Foco no último ano',
      'Foco por dia',
      'Tempo por trilha',
      'Cards concluídos',
    ]) {
      await expect(page.getByRole('img', { name: chart })).toBeVisible()
    }

    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([])
  })
}

test('o Lobby pode ser a tela inicial', async ({ page }) => {
  await page.addInitScript(
    (value) => localStorage.setItem('devstack:settings', value),
    settings({ theme: 'light', startPage: 'lobby' }),
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Lobby', level: 1 })).toBeVisible()
  await expect(page.getByText(/Ainda não há foco/)).toBeVisible()
})

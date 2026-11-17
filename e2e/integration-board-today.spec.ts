import { expect, test, type Locator, type Page } from '@playwright/test'

// Integração entre o quadro e a tela Hoje (/#/today).
test.use({ locale: 'pt-BR' })

const column = (page: Page, name: string) => page.getByRole('region', { name })
const todayPanel = (page: Page) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: 'Na coluna Hoje' }) })

async function quickAdd(page: Page, columnName: string, cardTitles: string[]) {
  const region = column(page, columnName)
  await region.hover()
  await region.getByRole('button', { name: 'Novo card' }).click()
  for (const title of cardTitles) {
    await page.keyboard.type(title)
    await page.keyboard.press('Enter')
    await expect(region.getByRole('button', { name: title, exact: true })).toBeVisible()
  }
  await page.keyboard.press('Escape')
}

async function dragTo(page: Page, source: Locator, target: Locator, steps = 12) {
  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 4, { steps: 3 })
  await page.mouse.up()
}

async function goToday(page: Page) {
  await page.goto('/#/today')
  await expect(page.getByRole('heading', { name: 'Na coluna Hoje' })).toBeVisible()
}

async function goBoard(page: Page) {
  await page.goto('/#/board')
  await expect(column(page, 'Backlog')).toBeVisible()
}

/** Grava direto no IndexedDB, como no teste de 1.000 cards. */
async function seed(
  page: Page,
  input: {
    titulo: string
    papel: string
    dataAlvo?: string | null
    removido?: boolean
    novoBoard?: string
  },
) {
  await page.evaluate(async (input) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('devstack')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction(['boards', 'columns', 'cards'], 'readwrite')
    const getAll = <T>(store: string) =>
      new Promise<T[]>((resolve) => {
        const request = tx.objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result as T[])
      })
    type Col = { id: string; boardId: string; papel: string; [k: string]: unknown }
    const columns = await getAll<Col>('columns')
    const now = new Date().toISOString()
    let target = columns.find((c) => c.papel === input.papel)!
    if (input.novoBoard) {
      const [first] = await getAll<{ id: string; [k: string]: unknown }>('boards')
      // Maior UUID possível: Dexie lista por chave primária, então este quadro fica por último.
      const boardId = 'ffffffff-ffff-4fff-bfff-ffffffffffff'
      // Data posterior para garantir que fique depois do quadro padrão.
      const later = new Date(Date.now() + 60_000).toISOString()
      tx.objectStore('boards').put({
        ...first,
        id: boardId,
        nome: input.novoBoard,
        criadoEm: later,
        atualizadoEm: later,
      })
      for (const c of columns.filter((c) => c.boardId === first.id)) {
        const copy = { ...c, id: crypto.randomUUID(), boardId, criadoEm: later }
        tx.objectStore('columns').put(copy)
        if (c.papel === input.papel) target = copy
      }
    }
    tx.objectStore('cards').put({
      id: crypto.randomUUID(),
      criadoEm: now,
      atualizadoEm: now,
      versao: 1,
      removidoEm: input.removido ? now : null,
      boardId: target.boardId,
      columnId: target.id,
      trackId: null,
      titulo: input.titulo,
      url: null,
      tipo: 'leitura',
      plataforma: null,
      tags: [],
      prioridade: 'media',
      estimativaMin: null,
      progresso: 0,
      dataAlvo: input.dataAlvo ?? null,
      notasMd: '',
      ordem: 'a0',
      concluidoEm: input.papel === 'feito' ? now : null,
      miniaturaUrl: null,
      links: [],
    })
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  }, input)
}

async function readCard(page: Page, titulo: string) {
  return page.evaluate(async (titulo) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('devstack')
      request.onsuccess = () => resolve(request.result)
    })
    const all = await new Promise<{ titulo: string; concluidoEm: string | null }[]>((resolve) => {
      const request = db.transaction('cards').objectStore('cards').getAll()
      request.onsuccess = () => resolve(request.result)
    })
    db.close()
    return all.find((c) => c.titulo === titulo) ?? null
  }, titulo)
}

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-17T10:00:00') })
  await goBoard(page)
})

test('card criado na coluna Hoje aparece em /today e abre o painel ao clicar', async ({ page }) => {
  await quickAdd(page, 'Hoje', ['Ler RFC'])
  await page.waitForTimeout(300)
  await goToday(page)
  const item = todayPanel(page).getByRole('button', { name: 'Ler RFC' })
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('mover para Hoje e depois para fora reflete em /today', async ({ page }) => {
  await quickAdd(page, 'Backlog', ['Docker'])
  await dragTo(
    page,
    column(page, 'Backlog').getByRole('button', { name: 'Docker' }),
    column(page, 'Hoje'),
  )
  await expect(column(page, 'Hoje').getByRole('button', { name: 'Docker' })).toBeVisible()
  await page.waitForTimeout(300)
  await goToday(page)
  await expect(todayPanel(page).getByRole('button', { name: 'Docker' })).toBeVisible()

  await goBoard(page)
  await dragTo(
    page,
    column(page, 'Hoje').getByRole('button', { name: 'Docker' }),
    column(page, 'Esta semana'),
  )
  await expect(column(page, 'Esta semana').getByRole('button', { name: 'Docker' })).toBeVisible()
  await page.waitForTimeout(300)
  await goToday(page)
  await expect(todayPanel(page).getByText('Nenhum card na coluna Hoje.')).toBeVisible()
})

test('card removido (soft delete) não aparece em /today', async ({ page }) => {
  await seed(page, { titulo: 'Apagado', papel: 'hoje', removido: true })
  await goToday(page)
  await expect(todayPanel(page).getByText('Nenhum card na coluna Hoje.')).toBeVisible()
})

test('reload em /today mantém os cards da coluna Hoje', async ({ page }) => {
  await quickAdd(page, 'Hoje', ['Persistente'])
  await page.waitForTimeout(300)
  await goToday(page)
  await page.reload()
  await expect(todayPanel(page).getByRole('button', { name: 'Persistente' })).toBeVisible()
})

test('concluir (Hoje → Feito) conta no resumo e desfazer limpa concluidoEm', async ({ page }) => {
  await quickAdd(page, 'Hoje', ['Kafka'])
  await dragTo(
    page,
    column(page, 'Hoje').getByRole('button', { name: 'Kafka' }),
    column(page, 'Feito'),
  )
  await expect(column(page, 'Feito').getByRole('button', { name: 'Kafka' })).toBeVisible()
  await page.waitForTimeout(300)
  expect((await readCard(page, 'Kafka'))?.concluidoEm).not.toBeNull()

  await goToday(page)
  await page.getByText('Cards concluídos', { exact: true }).click()
  await expect(page.getByText(/^1 de \d+$/)).toBeVisible()
  await expect(todayPanel(page).getByText('Nenhum card na coluna Hoje.')).toBeVisible()

  await goBoard(page)
  // Desfaz pelo painel do card, para cobrir também esse caminho.
  await column(page, 'Feito').getByRole('button', { name: 'Kafka' }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'Coluna' }).click()
  await page.getByRole('option', { name: 'Hoje' }).click()
  await page.keyboard.press('Escape')
  await expect(column(page, 'Hoje').getByRole('button', { name: 'Kafka' })).toBeVisible()
  await page.waitForTimeout(300)
  expect((await readCard(page, 'Kafka'))?.concluidoEm).toBeNull()

  await goToday(page)
  await expect(page.getByText(/^0 de \d+$/)).toBeVisible()
  await expect(todayPanel(page).getByRole('button', { name: 'Kafka' })).toBeVisible()
})

test('card com dataAlvo = hoje em outra coluna aparece em /today', async ({ page }) => {
  await seed(page, { titulo: 'Prazo hoje', papel: 'backlog', dataAlvo: localToday() })
  await seed(page, { titulo: 'Prazo hoje feito', papel: 'feito', dataAlvo: localToday() })
  await goToday(page)
  await page.reload()
  await expect(todayPanel(page).getByRole('button', { name: 'Prazo hoje' })).toBeVisible({
    timeout: 3000,
  })
  // Card concluído com prazo hoje não volta para a lista.
  await expect(todayPanel(page).getByRole('button', { name: 'Prazo hoje feito' })).toHaveCount(0)
})

test('card na coluna Hoje de um segundo quadro aparece em /today', async ({ page }) => {
  await seed(page, { titulo: 'Outro quadro', papel: 'hoje', novoBoard: 'Quadro 2' })
  await goToday(page)
  await page.reload()
  await expect(todayPanel(page).getByRole('button', { name: 'Outro quadro' })).toBeVisible({
    timeout: 3000,
  })
})

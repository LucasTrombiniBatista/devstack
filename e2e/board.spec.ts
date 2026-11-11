import { expect, test, type Locator, type Page } from '@playwright/test'
import { generateNKeysBetween } from 'fractional-indexing'

test.use({ locale: 'pt-BR' })

const column = (page: Page, name: string) => page.getByRole('region', { name })
const cardsIn = (region: Locator) => region.locator('[data-card-id]')
const titles = async (region: Locator) =>
  (await cardsIn(region).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  )) as string[]

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

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(column(page, 'Backlog')).toBeVisible()
})

test('move cards só com o teclado e mantém tudo depois de recarregar', async ({ page }) => {
  await quickAdd(page, 'Backlog', ['Pro Git', 'SQLBolt', 'Docker'])

  // Espaço pega, seta para a direita leva à próxima coluna, Espaço solta.
  await column(page, 'Backlog').getByRole('button', { name: 'Pro Git' }).focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(150)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  await page.keyboard.press('Space')
  await expect(column(page, 'Esta semana').getByRole('button', { name: 'Pro Git' })).toBeVisible()
  expect(await titles(column(page, 'Backlog'))).toEqual(['SQLBolt', 'Docker'])

  // Dentro da coluna: seta para baixo troca a ordem.
  await column(page, 'Backlog').getByRole('button', { name: 'SQLBolt' }).focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(150)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(150)
  await page.keyboard.press('Space')
  await expect.poll(() => titles(column(page, 'Backlog'))).toEqual(['Docker', 'SQLBolt'])

  await page.reload()
  await expect(column(page, 'Esta semana').getByRole('button', { name: 'Pro Git' })).toBeVisible()
  expect(await titles(column(page, 'Backlog'))).toEqual(['Docker', 'SQLBolt'])
})

test('arrasta com o mouse entre colunas e avisa o limite de WIP', async ({ page }) => {
  await quickAdd(page, 'Backlog', ['A', 'B', 'C'])
  const estudando = column(page, 'Estudando')

  for (const title of ['A', 'B', 'C']) {
    await dragTo(
      page,
      column(page, 'Backlog').getByRole('button', { name: title, exact: true }),
      estudando,
    )
    await expect(estudando.getByRole('button', { name: title, exact: true })).toBeVisible()
  }

  await expect(estudando.getByText('WIP 3/2')).toBeVisible()
  await expect(cardsIn(column(page, 'Backlog'))).toHaveCount(0)
})

test('edita o card no painel: Markdown, checklist e mover de coluna', async ({ page }) => {
  await quickAdd(page, 'Backlog', ['Spring Boot 3'])
  await column(page, 'Backlog').getByRole('button', { name: 'Spring Boot 3' }).click()
  const panel = page.getByRole('dialog')

  await panel.getByRole('textbox', { name: 'Notas' }).fill('## Resumo\n\n```java\nint x = 1;\n```')
  await panel.getByRole('tab', { name: 'Visualizar' }).click()
  await expect(panel.getByRole('heading', { name: 'Resumo' })).toBeVisible()
  await expect(panel.locator('pre code')).toContainText('int x = 1;')

  await panel.getByRole('textbox', { name: 'Adicionar item e Enter' }).fill('README')
  await page.keyboard.press('Enter')
  await panel.getByRole('checkbox', { name: 'README' }).click()

  await panel.getByRole('combobox', { name: 'Coluna' }).click()
  await page.getByRole('option', { name: 'Feito' }).click()
  await page.keyboard.press('Escape')

  const done = column(page, 'Feito').getByRole('button', { name: 'Spring Boot 3' })
  await expect(done).toBeVisible()
  await expect(done).toContainText('1/1')
})

test('continua fluido com 1.000 cards', async ({ page }) => {
  const ordens = generateNKeysBetween(null, null, 1000)
  await page.evaluate(async (ordens) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('devstack')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction(['columns', 'cards'], 'readwrite')
    const columns = await new Promise<{ id: string; boardId: string; papel: string }[]>(
      (resolve) => {
        const request = tx.objectStore('columns').getAll()
        request.onsuccess = () => resolve(request.result)
      },
    )
    const backlog = columns.find((c) => c.papel === 'backlog')!
    const now = new Date().toISOString()
    ordens.forEach((ordem, i) => {
      tx.objectStore('cards').put({
        id: crypto.randomUUID(),
        criadoEm: now,
        atualizadoEm: now,
        versao: 1,
        removidoEm: null,
        boardId: backlog.boardId,
        columnId: backlog.id,
        trackId: null,
        titulo: `Card ${String(i + 1).padStart(4, '0')}`,
        url: null,
        tipo: 'curso',
        plataforma: 'Alura',
        tags: ['java', `t${i % 20}`],
        prioridade: 'media',
        estimativaMin: 60,
        progresso: 0,
        dataAlvo: null,
        notasMd: '',
        ordem,
        concluidoEm: null,
        miniaturaUrl: null,
        links: [],
      })
    })
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  }, ordens)

  const started = Date.now()
  await page.reload()
  const backlog = column(page, 'Backlog')
  await expect(backlog.getByRole('button', { name: 'Card 0001' })).toBeVisible()
  const loadMs = Date.now() - started
  await expect(cardsIn(backlog)).toHaveCount(50)
  await expect(backlog.getByRole('button', { name: 'Mostrar mais (950)' })).toBeVisible()

  // Mede o intervalo entre quadros enquanto um card é arrastado pelo quadro.
  await page.evaluate(() => {
    const gaps: number[] = []
    let last = performance.now()
    const tick = (now: number) => {
      gaps.push(now - last)
      last = now
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    ;(window as unknown as { __gaps: number[] }).__gaps = gaps
  })
  await dragTo(page, backlog.getByRole('button', { name: 'Card 0001' }), column(page, 'Hoje'), 60)
  const gaps = await page.evaluate(() => (window as unknown as { __gaps: number[] }).__gaps)
  const sorted = [...gaps].sort((a, b) => a - b)
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  console.log(
    `1.000 cards: abriu em ${loadMs} ms; quadros no arrasto p95 ${p95.toFixed(1)} ms, pior ${sorted.at(-1)!.toFixed(1)} ms`,
  )

  await expect(column(page, 'Hoje').getByRole('button', { name: 'Card 0001' })).toBeVisible()
  expect(p95).toBeLessThan(50)

  // A busca encontra cards que ainda não estavam na tela.
  await page.getByRole('searchbox', { name: 'Buscar cards' }).fill('Card 0999')
  await expect(backlog.getByRole('button', { name: 'Card 0999' })).toBeVisible()
  await expect(cardsIn(backlog)).toHaveCount(1)
})

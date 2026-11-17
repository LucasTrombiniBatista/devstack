import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Consistência entre o planejamento da Semana (/#/week) e a tela Hoje (/#/today).
 * O relógio começa numa quarta, 11/11/2026; amanhã é quinta, 12/11.
 */
test.use({ locale: 'pt-BR', viewport: { width: 1440, height: 1000 } })

const QUA = 'quarta-feira, 11 de novembro'
const QUI = 'quinta-feira, 12 de novembro'

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

/** Cria cards na coluna Hoje do quadro. */
async function newCards(page: Page, ...titles: string[]) {
  await page.goto('/')
  const hoje = page.getByRole('region', { name: 'Hoje' })
  for (const title of titles) {
    await hoje.hover()
    await hoje.getByRole('button', { name: 'Novo card' }).click()
    await page.keyboard.type(title)
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')
    await expect(hoje.getByRole('button', { name: title })).toBeVisible()
  }
}

/** Planeja pelo diálogo da Semana. */
async function plan(page: Page, title: string, day: string, start = '19:00') {
  await page.getByRole('link', { name: 'Semana' }).click()
  await page.getByRole('button', { name: `Planejar ${title}` }).click()
  const dialog = page.getByRole('dialog', { name: 'Planejar card' })
  await dialog.getByLabel('Dia').selectOption({ label: day })
  await dialog.getByLabel('Início').selectOption({ label: start })
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialog).toBeHidden()
}

const todayPlan = (page: Page) =>
  page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Planejado para hoje' }) })

async function goToday(page: Page) {
  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByRole('heading', { name: 'Meta do dia' })).toBeVisible()
}

const startClock = (page: Page, time = '2026-11-11T08:00:00') =>
  page.clock.install({ time: new Date(time) })

test('bloco arrastado na Semana para hoje aparece em Hoje; o de amanhã não', async ({ page }) => {
  await startClock(page)
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Importar lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar lista' })
  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await dialog.getByRole('button', { name: 'Importar 117 cards' }).click()
  await expect(page.getByRole('region', { name: 'Backlog' })).toBeVisible()

  await page.getByRole('link', { name: 'Semana' }).click()
  await dragToTime(page, page.locator('[data-plan-card="Pro Git em português"]'), '2026-11-11', 600)
  await expect(page.getByRole('button', { name: /^Pro Git em português, / })).toHaveAccessibleName(
    /10:00–11:00$/,
  )
  await dragToTime(page, page.locator('[data-plan-card="Learn Git Branching"]'), '2026-11-12', 600)
  await expect(page.getByRole('button', { name: /^Learn Git Branching, / })).toHaveAccessibleName(
    /qui.*10:00–11:00$/,
  )

  await goToday(page)
  await expect(page.getByText('10:00–11:00')).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Pro Git em português', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Learn Git Branching', exact: true })).toHaveCount(
    0,
  )
})

test('o que Hoje mostra bate com a coluna de hoje na Semana', async ({ page }) => {
  await startClock(page)
  await newCards(page, 'Revisar SQL', 'Ler RFC', 'Amanhã')
  await plan(page, 'Revisar SQL', QUA, '19:00')
  await plan(page, 'Ler RFC', QUA, '08:00')
  await plan(page, 'Amanhã', QUI, '09:00')

  await goToday(page)
  const items = todayPlan(page).getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('08:00–09:00')
  await expect(items.nth(0)).toContainText('Ler RFC')
  await expect(items.nth(1)).toContainText('19:00–20:00')
  await expect(items.nth(1)).toContainText('Revisar SQL')

  await page.getByRole('link', { name: 'Semana' }).click()
  const quarta = page.locator('[data-day="2026-11-11"]')
  await expect(quarta.locator('[data-block-id]')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /^Ler RFC, qua.* 08:00–09:00$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Amanhã, qui.* 09:00–10:00$/ })).toBeVisible()
})

test('empurrar pendentes: vão para amanhã, somem de hoje e o concluído fica', async ({ page }) => {
  await startClock(page)
  await newCards(page, 'Pendente', 'Terminado')
  await plan(page, 'Pendente', QUA, '10:00')
  await plan(page, 'Terminado', QUA, '14:00')

  // Conclui o card abrindo-o pela tela Hoje e movendo para Feito.
  await goToday(page)
  await todayPlan(page).getByRole('button', { name: 'Terminado', exact: true }).click()
  await page.getByRole('combobox', { name: 'Coluna' }).click()
  await page.getByRole('option', { name: 'Feito' }).click()
  await page.keyboard.press('Escape')
  await expect(todayPlan(page).getByRole('button', { name: 'Terminado', exact: true })).toHaveClass(
    /line-through/,
  )

  await page.getByRole('button', { name: 'Encerrar o dia' }).click()
  const end = page.getByRole('dialog', { name: 'Encerrar o dia' })
  await expect(end.getByRole('listitem')).toHaveCount(1)
  await expect(end.getByRole('listitem')).toContainText('Pendente')
  await end.getByRole('button', { name: 'Empurrar 1 para amanhã' }).click()
  await expect(end.getByText('1 bloco foi para amanhã.')).toBeVisible()
  await end.getByRole('button', { name: 'Fechar' }).click()

  const items = todayPlan(page).getByRole('listitem')
  await expect(items).toHaveCount(1)
  await expect(items).toContainText('Terminado')

  await page.getByRole('link', { name: 'Semana' }).click()
  await expect(page.getByRole('button', { name: /^Pendente, qui.* 10:00–11:00$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Terminado, qua.* 14:00–15:00$/ })).toBeVisible()

  // Encerrar de novo não tem o que empurrar.
  await goToday(page)
  await page.getByRole('button', { name: 'Encerrar o dia' }).click()
  await expect(page.getByText('Nada pendente no plano de hoje.')).toBeVisible()
})

test('editar e remover o bloco na Semana reflete em Hoje', async ({ page }) => {
  await startClock(page)
  await newCards(page, 'Revisar SQL')
  await plan(page, 'Revisar SQL', QUA, '19:00')

  await page.getByRole('button', { name: /^Revisar SQL, qua/ }).click()
  const edit = page.getByRole('dialog', { name: 'Editar bloco' })
  await edit.getByLabel('Início').selectOption({ label: '21:00' })
  await edit.getByRole('button', { name: 'Salvar' }).click()
  await goToday(page)
  await expect(todayPlan(page).getByRole('listitem')).toContainText('21:00–22:00')

  // Mudar para amanhã tira de Hoje.
  await page.getByRole('link', { name: 'Semana' }).click()
  await page.getByRole('button', { name: /^Revisar SQL, qua/ }).click()
  await edit.getByLabel('Dia').selectOption({ label: QUI })
  await edit.getByRole('button', { name: 'Salvar' }).click()
  await goToday(page)
  await expect(page.getByText(/Nada planejado para hoje/)).toBeVisible()

  // Volta para hoje e remove.
  await page.getByRole('link', { name: 'Semana' }).click()
  await page.getByRole('button', { name: /^Revisar SQL, qui/ }).click()
  await edit.getByLabel('Dia').selectOption({ label: QUA })
  await edit.getByRole('button', { name: 'Salvar' }).click()
  await page.getByRole('button', { name: /^Revisar SQL, qua/ }).click()
  await edit.getByRole('button', { name: 'Remover bloco' }).click()
  await expect(page.locator('[data-block-id]')).toHaveCount(0)
  await goToday(page)
  await expect(page.getByText(/Nada planejado para hoje/)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/Nada planejado para hoje/)).toBeVisible()
})

test('virada da meia-noite: ao voltar para Hoje, vale o novo dia', async ({ page }) => {
  await startClock(page, '2026-11-11T23:50:00')
  await newCards(page, 'Quarta', 'Quinta')
  await plan(page, 'Quarta', QUA, '19:00')
  await plan(page, 'Quinta', QUI, '09:00')
  await goToday(page)
  await expect(todayPlan(page).getByRole('listitem')).toContainText('Quarta')

  await page.clock.fastForward('15:00')
  await page.getByRole('link', { name: 'Semana' }).click()
  await goToday(page)
  await expect(page.getByText('quinta-feira, 12 de novembro')).toBeVisible()
  await expect(todayPlan(page).getByRole('listitem')).toContainText('Quinta')
})

// Bug: TodayPage guarda o dia em useState na montagem (src/features/planner/TodayPage.tsx:197)
// e nunca o recalcula. Com a tela aberta na virada da meia-noite, ela continua mostrando o
// dia anterior (data, plano e meta), e "Encerrar o dia" empurra os blocos de ontem para hoje.
test('virada da meia-noite com Hoje aberto troca de dia sozinha', async ({ page }) => {
  test.fail()
  await startClock(page, '2026-11-11T23:58:00')
  await newCards(page, 'Quarta', 'Quinta')
  await plan(page, 'Quarta', QUA, '19:00')
  await plan(page, 'Quinta', QUI, '09:00')
  await goToday(page)
  await expect(page.getByText(QUA)).toBeVisible()

  await page.clock.runFor('05:00')
  await expect(page.getByText('quinta-feira, 12 de novembro')).toBeVisible({ timeout: 3000 })
  await expect(todayPlan(page).getByRole('listitem')).toContainText('Quinta', { timeout: 1000 })
})

// Bug: o campo `recorrente` (src/data/types.ts:96) não tem UI nem é lido por
// planBlocksRepo.listByDays (src/data/repos/index.ts:173). Não há como criar um bloco que se
// repita: o diálogo de planejamento só tem dia, início e fim. O teste procura o controle.
test('bloco recorrente aparece nas semanas seguintes', async ({ page }) => {
  test.fail()
  await startClock(page)
  await newCards(page, 'Inglês')
  await page.getByRole('link', { name: 'Semana' }).click()
  await page.getByRole('button', { name: 'Planejar Inglês' }).click()
  const dialog = page.getByRole('dialog', { name: 'Planejar card' })
  await dialog.getByLabel('Dia').selectOption({ label: QUA })
  await dialog.getByLabel(/Repetir|Recorrente/).check({ timeout: 2000 })
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await page.clock.fastForward('168:00:00')
  await page.reload()
  await goToday(page)
  await expect(todayPlan(page).getByRole('listitem')).toContainText('Inglês')
})

test('card excluído com bloco planejado some de Hoje e da grade da Semana', async ({ page }) => {
  await startClock(page)
  await newCards(page, 'Apagar', 'Fica')
  await plan(page, 'Apagar', QUA, '10:00')
  await plan(page, 'Fica', QUA, '19:00')

  await goToday(page)
  await todayPlan(page).getByRole('button', { name: 'Apagar', exact: true }).click()
  await page.getByRole('button', { name: 'Excluir card' }).click()
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(todayPlan(page).getByRole('listitem')).toHaveCount(1)
  await expect(todayPlan(page).getByRole('listitem')).toContainText('Fica')

  await page.getByRole('button', { name: 'Encerrar o dia' }).click()
  const end = page.getByRole('dialog', { name: 'Encerrar o dia' })
  await expect(end.getByRole('button', { name: 'Empurrar 1 para amanhã' })).toBeVisible()
  await end.getByRole('button', { name: 'Fechar' }).click()
})

// Bug: excluir o card não remove os blocos dele (CardSheet.tsx:323 só chama cardsRepo.remove).
// Hoje esconde o bloco órfão, mas a Semana desenha um bloco sem título (rótulo ", qua 10:00–11:00",
// que não abre nada) e soma a duração dele em "Planejado" (WeekPage.tsx:307).
test('card excluído não deixa bloco órfão nem conta na capacidade da Semana', async ({ page }) => {
  test.fail()
  await startClock(page)
  await newCards(page, 'Apagar', 'Fica')
  await plan(page, 'Apagar', QUA, '10:00')
  await plan(page, 'Fica', QUA, '19:00')
  await expect(page.getByText(/^Planejado 2h de/)).toBeVisible()

  await goToday(page)
  await todayPlan(page).getByRole('button', { name: 'Apagar', exact: true }).click()
  await page.getByRole('button', { name: 'Excluir card' }).click()
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()

  await page.getByRole('link', { name: 'Semana' }).click()
  await expect(page.locator('[data-day="2026-11-11"] [data-block-id]')).toHaveCount(1, {
    timeout: 3000,
  })
  await expect(page.getByText(/^Planejado 1h de/)).toBeVisible({ timeout: 1000 })
})

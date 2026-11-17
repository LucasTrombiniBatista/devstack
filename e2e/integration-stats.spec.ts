import { expect, test, type Page } from '@playwright/test'

/**
 * Integração das estatísticas: o mesmo dado precisa aparecer igual em Hoje (resumo e
 * meta), no Lobby e no card. Relógio controlado em todos os testes.
 */
test.use({ locale: 'pt-BR' })

const START = new Date('2026-11-11T09:00:00')

type SeedSession = { id: string; cardId: string | null; inicio: string; duracaoMin: number }

/** Grava sessões de foco direto no IndexedDB do app. */
async function seedSessions(page: Page, sessions: SeedSession[]) {
  await page.evaluate(async (list) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('devstack')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('sessions', 'readwrite')
    for (const s of list) {
      tx.objectStore('sessions').put({
        ...s,
        fim: new Date(new Date(s.inicio).getTime() + s.duracaoMin * 60_000).toISOString(),
        tipo: 'foco',
        origem: 'manual',
        criadoEm: s.inicio,
        atualizadoEm: s.inicio,
        versao: 1,
        removidoEm: null,
      })
    }
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  }, sessions)
}

/** Id do card pelo título, lido do banco. */
async function cardId(page: Page, titulo: string): Promise<string> {
  return page.evaluate(async (title) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('devstack')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const all = await new Promise<{ id: string; titulo: string }[]>((resolve) => {
      const req = db.transaction('cards').objectStore('cards').getAll()
      req.onsuccess = () => resolve(req.result)
    })
    db.close()
    return all.find((c) => c.titulo === title)!.id
  }, titulo)
}

const hoje = (page: Page) => page.getByRole('region', { name: 'Hoje' })

async function createCard(page: Page, titulo: string) {
  await page.goto('/#/')
  await hoje(page).hover()
  await hoje(page).getByRole('button', { name: 'Novo card' }).click()
  await page.keyboard.type(titulo)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(hoje(page).getByRole('button', { name: titulo })).toBeVisible()
}

async function completeCard(page: Page, titulo: string) {
  await page.getByRole('button', { name: titulo }).first().click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('combobox', { name: 'Coluna' }).click()
  await page.getByRole('option', { name: 'Feito' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function startFocus(page: Page, titulo: string) {
  await hoje(page).getByRole('button', { name: titulo }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Iniciar foco' }).click()
  await expect(page).toHaveURL(/#\/focus\//)
  await expect(page.getByRole('timer')).toHaveText(/^2[45]:\d\d$/)
}

/** Texto do resumo em Hoje (diálogo "Encerrar o dia"). */
async function todaySummary(page: Page): Promise<string> {
  await page.goto('/#/today')
  await page.getByRole('button', { name: 'Encerrar o dia' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/de foco e/)).toBeVisible()
  const text = (await dialog.getByText(/de foco e/).textContent()) ?? ''
  await page.keyboard.press('Escape')
  return text
}

/** Valor de um bloco de números do Lobby. */
function lobbyTile(page: Page, label: string) {
  return page
    .locator('span.uppercase', { hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::span[1]')
}

async function openLobby(page: Page) {
  await page.goto('/#/lobby')
  await expect(page.getByRole('heading', { name: 'Lobby', level: 1 })).toBeVisible()
}

test('cards concluídos hoje: mesma contagem em Hoje e no Lobby', async ({ page }) => {
  await page.clock.install({ time: START })
  for (const titulo of ['Card A', 'Card B', 'Card C']) await createCard(page, titulo)
  await completeCard(page, 'Card A')
  await completeCard(page, 'Card B')

  expect(await todaySummary(page)).toContain('2 cards concluídos')
  // Meta por cards: o padrão é 2, então a meta fica batida.
  await page.getByRole('group', { name: 'Medir por' }).getByText('Cards concluídos').click()
  await expect(page.getByText('2 de 2')).toBeVisible()
  await expect(page.getByText('Meta batida')).toBeVisible()

  await openLobby(page)
  await expect(lobbyTile(page, 'Cards concluídos')).toHaveText('2')
  await expect(page.getByText('+2 nesta semana')).toBeVisible()
  await expect(lobbyTile(page, 'Meta diária')).toHaveText('1/30')
})

test('foco iniciado e concluído pela UI: minutos iguais em Hoje, Lobby e no card', async ({
  page,
}) => {
  await page.clock.install({ time: START })
  await createCard(page, 'Spring Boot')
  await startFocus(page, 'Spring Boot')
  await page.clock.fastForward('25:30')
  await expect(page.getByText('Pausa curta')).toBeVisible()
  await page.getByRole('button', { name: 'Encerrar' }).click()
  await page.getByRole('link', { name: 'Sair do modo foco' }).click()

  await expect(hoje(page).getByRole('button', { name: 'Spring Boot' })).toContainText('25 min')
  expect(await todaySummary(page)).toContain('25 min de foco')
  await expect(page.getByText('25 min de 2h')).toBeVisible()

  await openLobby(page)
  await expect(lobbyTile(page, 'Foco em 7 dias')).toHaveText('25 min')
  await expect(lobbyTile(page, 'Sequência atual')).toHaveText('1 dia')

  await page.goto('/#/')
  await hoje(page).getByRole('button', { name: 'Spring Boot' }).click()
  await expect(page.getByRole('dialog').getByText('Total: 25 min')).toBeVisible()
})

test('sessão que cruza a meia-noite conta no dia do início, igual em Hoje e no Lobby', async ({
  page,
}) => {
  // Observação: os 25 minutos inteiros vão para o dia em que o foco começou (23:50),
  // nem Hoje nem o Lobby dividem a sessão entre os dois dias. É consistente entre telas.
  await page.clock.install({ time: new Date('2026-11-11T23:50:00') })
  await createCard(page, 'Madrugada')
  await startFocus(page, 'Madrugada')
  await page.clock.fastForward('25:30')
  await expect(page.getByText('Pausa curta')).toBeVisible()
  await page.getByRole('button', { name: 'Encerrar' }).click()

  // Já é dia 12: Hoje não mostra o foco começado na véspera.
  expect(await todaySummary(page)).toContain('0 min de foco')
  await openLobby(page)
  await expect(lobbyTile(page, 'Foco em 7 dias')).toHaveText('25 min')
  // A sequência continua: hoje sem foco ainda não quebra.
  await expect(lobbyTile(page, 'Sequência atual')).toHaveText('1 dia')
})

test('meta diária em horas: Hoje e Lobby concordam sobre bater a meta', async ({ page }) => {
  await page.clock.install({ time: START })
  await page.goto('/#/today')
  await expect(page.getByText('0 min de 2h')).toBeVisible()
  // Meta de meia hora.
  const input = page.getByRole('textbox', { name: 'Horas' })
  await input.fill('0,5')
  await input.blur()
  await expect(page.getByText('0 min de 30 min')).toBeVisible()

  await seedSessions(page, [
    {
      id: 'g1',
      cardId: null,
      inicio: new Date('2026-11-11T08:00:00').toISOString(),
      duracaoMin: 20,
    },
  ])
  await page.reload()
  await expect(page.getByText('20 min de 30 min')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Meta do dia' })).toHaveAttribute(
    'aria-valuenow',
    '67',
  )
  await openLobby(page)
  await expect(lobbyTile(page, 'Meta diária')).toHaveText('0/30')

  await seedSessions(page, [
    {
      id: 'g2',
      cardId: null,
      inicio: new Date('2026-11-11T08:30:00').toISOString(),
      duracaoMin: 10,
    },
  ])
  await page.reload()
  await expect(lobbyTile(page, 'Meta diária')).toHaveText('1/30')
  await page.goto('/#/today')
  await expect(page.getByText('Meta batida')).toBeVisible()
  await expect(page.getByText('30 min de 30 min')).toBeVisible()
})

test('MiniTimer continua ao navegar entre abas e depois de recarregar', async ({ page }) => {
  await page.clock.install({ time: START })
  await createCard(page, 'Persistência')
  await startFocus(page, 'Persistência')
  await page.getByRole('link', { name: 'Sair do modo foco' }).click()

  const mini = page.getByRole('region', { name: 'Timer de foco' })
  for (const route of ['/#/lobby', '/#/today', '/#/week', '/#/settings', '/#/']) {
    await page.goto(route)
    await expect(mini).toBeVisible()
    await expect(mini).toContainText(/2[45]:\d\d/)
  }
  await page.clock.fastForward('05:00')
  await page.waitForTimeout(300)
  await page.reload()
  await expect(mini).toContainText(/(19|20):\d\d/)
  await page.goto('/#/lobby')
  await expect(mini).toContainText(/(19|20):\d\d/)
})

test('pausar não conta o tempo parado e cancelar logo não grava sessão', async ({ page }) => {
  await page.clock.install({ time: START })
  await createCard(page, 'Pausas')

  // Cancelado em 20 s: abaixo do mínimo, não vira sessão.
  await startFocus(page, 'Pausas')
  await page.clock.fastForward('00:20')
  await page.getByRole('button', { name: 'Encerrar' }).click()
  expect(await todaySummary(page)).toContain('0 min de foco')

  // 10 min de foco, 30 min pausado, encerrado: só os 10 contam.
  await page.goto('/#/')
  await startFocus(page, 'Pausas')
  await page.clock.fastForward('10:00')
  await page.getByRole('button', { name: 'Pausar' }).click()
  await page.clock.fastForward('30:00')
  await page.getByRole('button', { name: 'Encerrar' }).click()

  expect(await todaySummary(page)).toContain('10 min de foco')
  await openLobby(page)
  await expect(lobbyTile(page, 'Foco em 7 dias')).toHaveText('10 min')
  await page.goto('/#/')
  await expect(hoje(page).getByRole('button', { name: 'Pausas' })).toContainText('10 min')
})

test('card removido com sessões: Hoje e Lobby continuam iguais', async ({ page }) => {
  await page.clock.install({ time: START })
  await createCard(page, 'Vai sumir')
  const id = await cardId(page, 'Vai sumir')
  await seedSessions(page, [
    { id: 'r1', cardId: id, inicio: new Date('2026-11-11T08:00:00').toISOString(), duracaoMin: 40 },
  ])
  await page.reload()
  await hoje(page).getByRole('button', { name: 'Vai sumir' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir card' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(hoje(page).getByRole('button', { name: 'Vai sumir' })).toHaveCount(0)

  const today = await todaySummary(page)
  await openLobby(page)
  const lobby = await lobbyTile(page, 'Foco em 7 dias').textContent()
  // As duas telas precisam concordar (as sessões do card excluído ficam no histórico).
  expect(today).toContain(`${lobby} de foco`)
  expect(lobby).toBe('40 min')
})

test.describe('fuso horário diferente', () => {
  // Auckland em novembro é UTC+13: 12:00Z do dia 11 já é 01:00 do dia 12.
  test.use({ timezoneId: 'Pacific/Auckland' })

  test('o dia local vale igual em Hoje e no Lobby', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-11T12:00:00Z') })
    await page.goto('/#/today')
    await seedSessions(page, [
      // 00:30 do dia 12 local (11:30Z do dia 11): conta como hoje.
      { id: 'tz1', cardId: null, inicio: '2026-11-11T11:30:00.000Z', duracaoMin: 15 },
      // 23:00 do dia 11 local (10:00Z do dia 11): é ontem.
      { id: 'tz2', cardId: null, inicio: '2026-11-11T10:00:00.000Z', duracaoMin: 45 },
    ])
    await page.reload()
    expect(await todaySummary(page)).toContain('15 min de foco')
    await openLobby(page)
    await expect(lobbyTile(page, 'Foco em 7 dias')).toHaveText('1h')
    await expect(lobbyTile(page, 'Sequência atual')).toHaveText('2 dias')
  })
})

test('Hoje aberto na virada do dia passa a mostrar o novo dia, como o Lobby', async ({ page }) => {
  // Bug: TodayPage guarda o dia em useState no primeiro render
  // (src/features/planner/TodayPage.tsx:198) e nunca o atualiza. Com a tela aberta
  // depois da meia-noite, o resumo e a meta continuam no dia anterior, enquanto o
  // Lobby recalcula "hoje" com new Date() a cada leitura.
  await page.clock.install({ time: new Date('2026-11-11T23:58:00') })
  await page.goto('/#/today')
  await expect(page.getByText('quarta-feira, 11 de novembro')).toBeVisible()
  await seedSessions(page, [
    {
      id: 'm1',
      cardId: null,
      inicio: new Date('2026-11-11T22:00:00').toISOString(),
      duracaoMin: 50,
    },
    {
      id: 'm2',
      cardId: null,
      inicio: new Date('2026-11-12T00:01:00').toISOString(),
      duracaoMin: 5,
    },
  ])
  await page.reload()
  await expect(page.getByText('50 min de 2h')).toBeVisible()
  await page.clock.fastForward('10:00')

  await page.getByRole('button', { name: 'Encerrar o dia' }).click()
  await expect(page.getByRole('dialog').getByText(/de foco e/)).toContainText('5 min de foco', {
    timeout: 2000,
  })
})

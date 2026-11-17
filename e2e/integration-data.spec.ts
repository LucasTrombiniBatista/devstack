import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

test.use({ locale: 'pt-BR' })

const STORES = [
  'boards',
  'columns',
  'tracks',
  'cards',
  'checklistItems',
  'sessions',
  'planBlocks',
  'dailyGoals',
  'settings',
] as const

type Row = { id: string; removidoEm?: string | null; [key: string]: unknown }
type Dump = Record<(typeof STORES)[number], Row[]>

/**
 * Leitura independente da Parte B do DevStack.md, sem usar o parser do app:
 * cada seção numerada a partir da 15 é uma trilha; item com " · " é um card;
 * itens sem metadados seguidos viram um card-checklist; "**Tópicos obrigatórios…:**"
 * e "**… (um card com checklist)**" também viram um card cada.
 */
function expectedFromFile() {
  const lines = readFileSync('DevStack.md', 'utf8').split(/\r?\n/)
  const start = lines.findIndex((line) => /^## 15\. /.test(line))
  const trilhas: { nome: string; cards: number }[] = []
  let checklistAberto = false
  let checklistItens = 0
  for (const line of lines.slice(start)) {
    if (line.startsWith('## ')) {
      const nome = line
        .replace(/^## \d+\.\s*/, '')
        .replace(/\s*\([^()]*\)\s*$/, '')
        .trim()
      trilhas.push({ nome, cards: 0 })
      checklistAberto = false
      continue
    }
    const atual = trilhas.at(-1)!
    if (line.startsWith('**')) {
      checklistAberto = false
      if (/um card com checklist/i.test(line)) {
        atual.cards++
        checklistAberto = true
      } else if (/^\*\*Tópicos obrigatórios[^*]*:\*\*\s*\S/.test(line)) {
        atual.cards++
        checklistItens += line
          .split(/:\*\*/)[1]
          .replace(/\([^()]*\)/g, '')
          .split(',').length
      }
      continue
    }
    if (/^- \[[ xX]\]/.test(line)) {
      if (line.includes(' · ')) {
        atual.cards++
        checklistAberto = false
      } else {
        if (!checklistAberto) atual.cards++
        checklistAberto = true
        checklistItens++
      }
      continue
    }
    if (/^\s+- \[[ xX]\]/.test(line)) checklistItens++
    else if (line.trim() && !line.startsWith(' ')) checklistAberto = false
  }
  const comCards = trilhas.filter((trilha) => trilha.cards > 0)
  return {
    trilhas: comCards,
    cards: comCards.reduce((sum, trilha) => sum + trilha.cards, 0),
    checklistItens,
  }
}

/** Lê todas as tabelas do IndexedDB do app, ordenadas por id. */
async function dumpDb(page: Page): Promise<Dump> {
  return page.evaluate(
    async (stores) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('devstack')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const out: Record<string, unknown[]> = {}
      for (const name of stores) {
        out[name] = await new Promise<unknown[]>((resolve, reject) => {
          const req = db.transaction(name).objectStore(name).getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
        out[name].sort((a, b) => ((a as Row).id < (b as Row).id ? -1 : 1))
      }
      db.close()
      return out
    },
    STORES as unknown as string[],
  ) as Promise<Dump>
}

/** Apaga o conteúdo de todas as tabelas (o "limpar" antes de restaurar). */
async function clearDb(page: Page) {
  await page.evaluate(
    async (stores) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('devstack')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = db.transaction(stores, 'readwrite')
      for (const name of stores) tx.objectStore(name).clear()
      await new Promise((resolve) => (tx.oncomplete = resolve))
      db.close()
    },
    STORES as unknown as string[],
  )
}

/** Grava uma sessão de foco e um bloco de planejamento ligados a um card. */
async function seedSessionAndBlock(page: Page, cardId: string) {
  await page.evaluate(async (cardId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('devstack')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const now = new Date()
    const iso = now.toISOString()
    const dia = iso.slice(0, 10)
    const meta = { criadoEm: iso, atualizadoEm: iso, versao: 1, removidoEm: null }
    const tx = db.transaction(['sessions', 'planBlocks'], 'readwrite')
    tx.objectStore('sessions').put({
      id: 'sessao-integracao',
      cardId,
      inicio: new Date(now.getTime() - 50 * 60_000).toISOString(),
      fim: iso,
      duracaoMin: 50,
      tipo: 'foco',
      origem: 'manual',
      ...meta,
    })
    tx.objectStore('planBlocks').put({
      id: 'bloco-integracao',
      cardId,
      dia,
      inicio: '19:00',
      fim: '20:00',
      recorrente: false,
      ...meta,
    })
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  }, cardId)
}

const alive = (rows: Row[]) => rows.filter((row) => !row.removidoEm)

async function importDevStack(page: Page, total: number) {
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Importar lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar lista' })
  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await dialog.getByRole('button', { name: `Importar ${total} cards` }).click()
  await expect(
    page.getByRole('region', { name: 'Backlog' }).getByRole('button', {
      name: 'Pro Git em português',
    }),
  ).toBeVisible()
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('importar o DevStack.md: contagens batem com o arquivo e aparecem no Quadro e no Lobby', async ({
  page,
}) => {
  const expected = expectedFromFile()
  expect(expected.trilhas).toHaveLength(10)

  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Importar lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar lista' })
  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await expect(
    dialog.getByText(`${expected.cards} cards novos em ${expected.trilhas.length} trilhas.`),
  ).toBeVisible()
  await dialog.getByRole('button', { name: `Importar ${expected.cards} cards` }).click()

  const backlog = page.getByRole('region', { name: 'Backlog' })
  await expect(backlog.getByRole('button', { name: 'Pro Git em português' })).toBeVisible()

  // Banco: cards, trilhas e itens de checklist.
  const dump = await dumpDb(page)
  expect(alive(dump.cards)).toHaveLength(expected.cards)
  expect(alive(dump.tracks).map((track) => track.nome)).toEqual(
    expect.arrayContaining(expected.trilhas.map((trilha) => trilha.nome)),
  )
  expect(alive(dump.tracks)).toHaveLength(expected.trilhas.length)
  expect(alive(dump.checklistItems)).toHaveLength(expected.checklistItens)
  // Todo card aponta para uma trilha e uma coluna que existem.
  const trackIds = new Set(dump.tracks.map((track) => track.id))
  const columnIds = new Set(dump.columns.map((column) => column.id))
  for (const card of dump.cards) {
    expect(trackIds.has(card.trackId as string)).toBe(true)
    expect(columnIds.has(card.columnId as string)).toBe(true)
  }

  // Quadro: 50 visíveis + "Mostrar mais" com o resto, e cada trilha com a contagem do arquivo.
  await expect(backlog.locator('[data-card-id]')).toHaveCount(50)
  await expect(
    backlog.getByRole('button', { name: `Mostrar mais (${expected.cards - 50})` }),
  ).toBeVisible()
  const sidebar = page.getByRole('complementary')
  for (const trilha of expected.trilhas) {
    await expect(
      sidebar.getByRole('button', {
        name: new RegExp(`^${escape(trilha.nome)}\\s*${trilha.cards}$`),
      }),
    ).toBeVisible()
  }

  // Lobby: uma sessão num card da Fase 0 aparece em "Tempo por trilha".
  const fase0 = dump.cards.find((card) => card.titulo === 'Pro Git em português')!
  await seedSessionAndBlock(page, fase0.id)
  await page.goto('/#/lobby')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Lobby', level: 1 })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Tempo por trilha' })).toBeVisible()
  await expect(
    page
      .locator('section[aria-labelledby="lobby-tracks"]')
      .getByRole('listitem')
      .getByText('Fase 0: Base', { exact: true }),
  ).toBeVisible()
})

test('importar duas vezes não duplica nada no banco', async ({ page }) => {
  const { cards } = expectedFromFile()
  await importDevStack(page, cards)
  const before = await dumpDb(page)

  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Importar lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar lista' })
  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await expect(dialog.getByText(`${cards} já existem e serão ignorados.`)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Importar 0 cards' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Cancelar' }).click()

  const after = await dumpDb(page)
  expect(after.cards).toHaveLength(before.cards.length)
  expect(after.tracks).toHaveLength(before.tracks.length)
  expect(after.checklistItems).toHaveLength(before.checklistItems.length)
})

test('backup, limpar e restaurar devolve tudo igual (blocos e sessões inclusos) e persiste após reload', async ({
  page,
}) => {
  const { cards } = expectedFromFile()
  await importDevStack(page, cards)
  const before0 = await dumpDb(page)
  const card = before0.cards.find((c) => c.titulo === 'Pro Git em português')!
  await seedSessionAndBlock(page, card.id)
  const before = await dumpDb(page)
  expect(before.sessions).toHaveLength(1)
  expect(before.planBlocks).toHaveLength(1)

  await page.goto('/#/settings')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Backup completo (JSON)' }).click(),
  ])
  const backupPath = await download.path()

  await clearDb(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Configurações', level: 1 })).toBeVisible()
  const empty = await dumpDb(page)
  expect(alive(empty.cards)).toHaveLength(0)

  await page.getByLabel('Restaurar backup').setInputFiles(backupPath)
  await page.getByRole('button', { name: 'Substituir tudo' }).click()
  await expect(page.getByText('Backup restaurado.')).toBeVisible()

  const restored = await dumpDb(page)
  for (const name of STORES) expect(restored[name], name).toEqual(before[name])

  // Persistência: depois de recarregar, o banco e o quadro continuam iguais.
  await page.goto('/#/board')
  await page.reload()
  const backlog = page.getByRole('region', { name: 'Backlog' })
  await expect(backlog.getByRole('button', { name: 'Pro Git em português' })).toBeVisible()
  await expect(backlog.getByRole('button', { name: `Mostrar mais (${cards - 50})` })).toBeVisible()
  const reloaded = await dumpDb(page)
  for (const name of ['cards', 'tracks', 'checklistItems', 'sessions', 'planBlocks'] as const) {
    expect(reloaded[name], name).toEqual(before[name])
  }
})

test('editar o card no painel reflete no Quadro, em Hoje e na paleta de comandos', async ({
  page,
}) => {
  const { cards } = expectedFromFile()
  await importDevStack(page, cards)

  const backlog = page.getByRole('region', { name: 'Backlog' })
  await backlog.getByRole('button', { name: 'Pro Git em português' }).click()
  const sheet = page.getByRole('dialog')
  const title = sheet.getByRole('textbox', { name: 'Título', exact: true })
  await title.fill('Pro Git revisado')
  await title.press('Enter')
  await sheet.getByRole('combobox', { name: 'Coluna' }).click()
  await page.getByRole('option', { name: 'Hoje' }).click()
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)

  // Quadro
  const hoje = page.getByRole('region', { name: 'Hoje' })
  await expect(hoje.getByRole('button', { name: 'Pro Git revisado' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pro Git em português' })).toHaveCount(0)

  // Tela Hoje
  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByRole('heading', { name: 'Hoje', level: 1 })).toBeVisible()
  await expect(page.getByText('Pro Git revisado').first()).toBeVisible()
  await expect(page.getByText('Pro Git em português')).toHaveCount(0)

  // Paleta de comandos
  await page.keyboard.press('Control+k')
  const input = page.getByPlaceholder('Novo card, colar link ou buscar…')
  await input.fill('Pro Git revisado')
  await expect(page.getByRole('option', { name: /^Pro Git revisado/ })).toBeVisible()
  await input.fill('Pro Git em português')
  await expect(page.getByRole('option', { name: /^Pro Git em português/ })).toHaveCount(0)
  await page.keyboard.press('Escape')

  // Persiste após reload
  await page.reload()
  await page.getByRole('link', { name: 'Quadro' }).click()
  await expect(
    page.getByRole('region', { name: 'Hoje' }).getByRole('button', { name: 'Pro Git revisado' }),
  ).toBeVisible()
})

import { expect, test, type Page } from '@playwright/test'

/**
 * Monkey test: ações aleatórias, mas reproduzíveis por seed, sobre o app com o
 * backlog do DevStack.md importado. Cada ação é registrada; ao falhar, o log
 * mostra a sequência exata para reproduzir.
 */

test.use({ locale: 'pt-BR' })
test.describe.configure({ mode: 'parallel' })

const ROUTES = ['lobby', 'board', 'today', 'week', 'settings', 'focus']
const ACTIONS = 150

/** PRNG mulberry32: determinístico a partir da seed. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function importBacklog(page: Page) {
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Importar lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar lista' })
  await dialog.getByLabel('Abrir arquivo').setInputFiles('DevStack.md')
  await dialog.getByRole('button', { name: /^Importar \d+ cards$/ }).click()
  await expect(page.getByRole('region', { name: 'Backlog' })).toBeVisible()
}

/** Marca com data-monkey os elementos visíveis e habilitados; devolve quantos. */
async function tagElements(page: Page, selector: string) {
  return page.evaluate((sel) => {
    document.querySelectorAll('[data-monkey]').forEach((el) => el.removeAttribute('data-monkey'))
    let i = 0
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      // Nada de sair do app: links externos, nova aba ou download.
      const a = el.closest('a')
      const href = a?.getAttribute('href') ?? ''
      if (
        a &&
        (/^(https?:|mailto:)/.test(href) || a.target === '_blank' || a.hasAttribute('download'))
      )
        continue
      if (el.matches(':disabled,[aria-disabled="true"]')) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue
      el.setAttribute('data-monkey', String(i++))
    }
    return i
  }, selector)
}

/** Invariantes checados depois de cada ação. */
async function checkInvariants(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = []
    if (document.body.innerText.trim().length === 0) problems.push('tela em branco')
    // Chave i18n crua: "palavra.palavra(.palavra)" sozinha num nó de texto visível.
    const raw = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim() ?? ''
      if (!raw.test(t) || /\.(md|ts|tsx|js|json|com|dev|io|org|br|app|net)$/.test(t)) continue
      const p = n.parentElement
      if (!p || p.closest('script,style,code,pre,textarea,[contenteditable]')) continue
      if (p.getClientRects().length === 0) continue
      problems.push(`texto i18n cru: "${t}"`)
    }
    const doc = document.scrollingElement ?? document.documentElement
    if (doc.scrollWidth > doc.clientWidth + 1)
      problems.push(`scroll horizontal: ${doc.scrollWidth} > ${doc.clientWidth}`)
    return problems
  })
}

const CLICKABLE =
  'button,a[href],[role="button"],[role="tab"],[role="menuitem"],[role="option"],[role="switch"],[role="checkbox"],[role="radio"],[role="combobox"]'
const FILLABLE =
  'input:not([type=file]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),textarea'
const DRAGGABLE = '[data-card-id],[data-plan-card],[aria-roledescription]'

async function monkey(page: Page, seed: number) {
  // Sem isso, um clique num elemento que sumiu espera até o fim do teste (sem
  // actionTimeout no config) e o monkey estoura o tempo em máquina lenta, como no CI.
  page.setDefaultTimeout(2000)
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('dialog', (d) => void d.dismiss())
  page.on('popup', (p) => void p.close())

  await importBacklog(page)
  const random = rng(seed)
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)]
  const at = (i: number) => page.locator(`[data-monkey="${i}"]`)
  const log: string[] = []

  for (let step = 0; step < ACTIONS; step++) {
    const r = random()
    let desc = 'nada'
    try {
      if (r < 0.4) {
        const n = await tagElements(page, CLICKABLE)
        if (n > 0) {
          const el = at(Math.floor(random() * n))
          desc = `click ${await el.evaluate(
            (e) =>
              `${e.tagName.toLowerCase()} "${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 40)}"`,
          )}`
          await el.click({ timeout: 1500 })
        }
      } else if (r < 0.5) {
        const n = await tagElements(page, FILLABLE)
        if (n > 0) {
          const i = Math.floor(random() * n)
          const txt = pick(['Monkey', '', '42', 'a'.repeat(200), '<b>x</b>', 'ção ✓'])
          desc = `fill ${await at(i).evaluate((e) => e.getAttribute('aria-label') ?? e.id)} ${JSON.stringify(txt.slice(0, 20))}`
          await at(i).fill(txt, { timeout: 1500 })
        }
      } else if (r < 0.6) {
        const k = pick([
          'Escape',
          'Tab',
          'Enter',
          'Control+k',
          'ArrowDown',
          'ArrowUp',
          'Shift+Tab',
          'n',
          ' ',
        ])
        desc = `key ${k}`
        await page.keyboard.press(k)
      } else if (r < 0.72) {
        const route = pick(ROUTES)
        desc = `goto /#/${route}`
        await page.goto(`/#/${route}`)
      } else if (r < 0.82) {
        const n = await tagElements(page, DRAGGABLE)
        const vp = page.viewportSize()!
        const from = n > 0 ? await at(Math.floor(random() * n)).boundingBox() : null
        if (from) {
          const tx = random() * vp.width
          const ty = random() * vp.height
          desc = `drag (${Math.round(from.x)},${Math.round(from.y)}) -> (${Math.round(tx)},${Math.round(ty)})`
          await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
          await page.mouse.down()
          await page.mouse.move(tx, ty, { steps: 10 })
          await page.mouse.up()
        }
      } else if (r < 0.88) {
        const q = pick(['git', 'sem', 'conf', 'zzz', ''])
        const k = pick(['Enter', 'Escape', 'ArrowDown'])
        desc = `palette Ctrl+K "${q}" ${k}`
        await page.keyboard.press('Control+k')
        await page.keyboard.type(q)
        await page.keyboard.press(k)
      } else if (r < 0.94) {
        const lang = pick(['English', 'Português'])
        desc = `idioma ${lang}`
        await page.goto('/#/settings')
        await page
          .getByText(new RegExp(`^${lang}`))
          .first()
          .click({ timeout: 1500 })
      } else {
        const theme = pick(['Claro|Light', 'Escuro|Dark', 'Sistema|System'])
        desc = `tema ${theme}`
        await page.goto('/#/settings')
        await page
          .getByText(new RegExp(`^(${theme})$`))
          .first()
          .click({ timeout: 1500 })
      }
    } catch (e) {
      // Elementos que somem entre marcar e clicar são normais num monkey test.
      desc += ` (ignorado: ${(e as Error).message.split('\n')[0]})`
    }
    log.push(`${step}: ${desc} @ ${page.url().replace(/^.*#/, '#')}`)
    await page.waitForTimeout(30)
    // Rotas são lazy com Suspense sem fallback: dá até 3 s para algo aparecer.
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 0, null, { timeout: 3000 })
      .catch(() => {})
    const problems = [...errors, ...(await checkInvariants(page))]
    expect(problems, `seed ${seed}, passos:\n${log.join('\n')}`).toEqual([])
  }
}

for (const seed of [1, 7, 42, 1337, 2026]) {
  test(`monkey desktop, seed ${seed}`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await monkey(page, seed)
  })
}

for (const seed of [3, 99]) {
  test(`monkey mobile 390px, seed ${seed}`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await monkey(page, seed)
  })
}

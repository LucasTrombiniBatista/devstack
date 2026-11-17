import { describe, expect, it } from 'vitest'
import en from './locales/en.json'
import ptBR from './locales/pt-BR.json'

type Tree = { [key: string]: string | Tree }

/** Achata o JSON em "a.b.c" → texto. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else for (const [k, v] of flatten(value, path)) out.set(k, v)
  }
  return out
}

/** Plurais do i18next ("_one", "_other"…) variam por idioma; compara pela chave base. */
const PLURAL = /_(zero|one|two|few|many|other)$/
const base = (key: string) => key.replace(PLURAL, '')

const vars = (text: string) =>
  [...new Set([...text.matchAll(/\{\{\s*([\w.-]+)[^}]*\}\}/g)].map((m) => m[1]))].sort()

const pt = flatten(ptBR as Tree)
const enFlat = flatten(en as Tree)

describe('locales pt-BR × en', () => {
  it('têm as mesmas chaves (ignorando sufixos de plural)', () => {
    const ptKeys = new Set([...pt.keys()].map(base))
    const enKeys = new Set([...enFlat.keys()].map(base))
    expect(
      [...ptKeys].filter((k) => !enKeys.has(k)),
      'faltando em en',
    ).toEqual([])
    expect(
      [...enKeys].filter((k) => !ptKeys.has(k)),
      'faltando em pt-BR',
    ).toEqual([])
  })

  it('usam as mesmas interpolações {{x}} em cada chave', () => {
    const diffs: string[] = []
    const groups = new Map<string, { pt: Set<string>; en: Set<string> }>()
    const add = (map: Map<string, string>, lang: 'pt' | 'en') => {
      for (const [key, text] of map) {
        const group = groups.get(base(key)) ?? { pt: new Set(), en: new Set() }
        // "count" é implícito nos plurais e pode aparecer só numa das formas.
        for (const v of vars(text)) if (!(PLURAL.test(key) && v === 'count')) group[lang].add(v)
        groups.set(base(key), group)
      }
    }
    add(pt, 'pt')
    add(enFlat, 'en')
    for (const [key, { pt: a, en: b }] of groups) {
      const sa = [...a].sort().join(',')
      const sb = [...b].sort().join(',')
      if (sa !== sb) diffs.push(`${key}: pt-BR {${sa}} × en {${sb}}`)
    }
    expect(diffs).toEqual([])
  })

  it('não têm textos vazios', () => {
    const empty = [...pt, ...enFlat].filter(([, text]) => !text.trim()).map(([key]) => key)
    expect(empty).toEqual([])
  })
})

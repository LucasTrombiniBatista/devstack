import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

type Ordered = { ordem: string }

/**
 * Compara índices fracionários. Tem de ser comparação de string simples:
 * `localeCompare` ordena maiúsculas e minúsculas de outro jeito e embaralha a lista.
 */
export function byOrdem(a: Ordered, b: Ordered): number {
  return a.ordem < b.ordem ? -1 : a.ordem > b.ordem ? 1 : 0
}

/** Chave para o fim de uma lista já ordenada. */
export function ordemAtEnd(sorted: Ordered[]): string {
  return generateKeyBetween(sorted.at(-1)?.ordem ?? null, null)
}

/** Chave para ocupar a posição `index` de uma lista ordenada que não contém o item movido. */
export function ordemAtIndex(sorted: Ordered[], index: number): string {
  const i = Math.max(0, Math.min(index, sorted.length))
  return generateKeyBetween(sorted[i - 1]?.ordem ?? null, sorted[i]?.ordem ?? null)
}

/** `n` chaves em sequência, para criar vários itens de uma vez. */
export function ordemSequence(n: number, after: string | null = null): string[] {
  return generateNKeysBetween(after, null, n)
}

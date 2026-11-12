import { describe, expect, it } from 'vitest'
import {
  backgroundOf,
  COMBINACOES,
  contrast,
  ensureContrast,
  readableOn,
  resolveAppearance,
} from '@/app/appearance'

describe('aparência', () => {
  it('não sobrescreve nada no visual padrão', () => {
    expect(resolveAppearance('creme', 'padrao', false).tokens).toEqual({})
    expect(resolveAppearance('creme', 'padrao', true).tokens).toEqual({})
  })

  it('mantém o destaque quando o contraste já basta', () => {
    expect(ensureContrast('#b81437', '#ffffff')).toEqual({ color: '#b81437', adjusted: false })
  })

  it('clareia o destaque escuro sobre fundo preto', () => {
    const result = ensureContrast('#111111', '#000000')
    expect(result.adjusted).toBe(true)
    expect(contrast(result.color, '#000000')).toBeGreaterThanOrEqual(4.5)
  })

  it('escolhe o texto do botão com contraste AA', () => {
    expect(readableOn('#22c55e', '#ffffff', '#111111')).toBe('#111111')
    expect(readableOn('#1d5fa8', '#ffffff', '#111111')).toBe('#ffffff')
  })

  it.each(COMBINACOES.filter((c) => c.destaque !== 'padrao'))(
    'combinação $id tem botões legíveis e destaque visível',
    (combo) => {
      const dark = combo.theme === 'dark'
      const { tokens } = resolveAppearance(combo.fundo, combo.destaque, dark)
      expect(contrast(tokens['--primary'], tokens['--primary-foreground'])).toBeGreaterThanOrEqual(
        4.5,
      )
      expect(contrast(tokens['--primary'], backgroundOf(combo.fundo, dark))).toBeGreaterThanOrEqual(
        3,
      )
      expect(contrast(tokens['--foreground'], tokens['--background'])).toBeGreaterThanOrEqual(4.5)
      expect(contrast(tokens['--muted-foreground'], tokens['--background'])).toBeGreaterThanOrEqual(
        4.5,
      )
    },
  )
})

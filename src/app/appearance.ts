/**
 * Paletas da aparência. A de fundo cuida das superfícies e do texto; a de destaque,
 * de botões, item ativo, foco e gráficos. As duas se combinam com regras de contraste.
 *
 * "creme" com destaque "padrao" é o visual original definido no `index.css`;
 * nesse caso nenhum token é sobrescrito.
 */

export type Fundo = 'creme' | 'neutro' | 'frio'
export type Destaque = 'padrao' | `#${string}`

export const FUNDOS: Fundo[] = ['creme', 'neutro', 'frio']

export const DESTAQUES: { id: string; cor: Destaque }[] = [
  { id: 'carmim', cor: '#b81437' },
  { id: 'oceano', cor: '#1d5fa8' },
  { id: 'floresta', cor: '#2f7a46' },
  { id: 'ambar', cor: '#b8650f' },
  { id: 'violeta', cor: '#6b3fb0' },
  { id: 'preto', cor: '#111111' },
]

export type Combinacao = {
  id: string
  fundo: Fundo
  destaque: Destaque
  theme: 'light' | 'dark' | 'system'
}

export const COMBINACOES: Combinacao[] = [
  { id: 'padrao', fundo: 'creme', destaque: 'padrao', theme: 'system' },
  { id: 'brancoPreto', fundo: 'neutro', destaque: '#111111', theme: 'light' },
  { id: 'brancoVermelho', fundo: 'neutro', destaque: '#c8102e', theme: 'light' },
  { id: 'pretoVerde', fundo: 'neutro', destaque: '#22c55e', theme: 'dark' },
  { id: 'grafiteAzul', fundo: 'frio', destaque: '#60a5fa', theme: 'dark' },
]

type Base = {
  background: string
  foreground: string
  surface: string
  well: string
  border: string
  muted: string
  card: string
  cardForeground: string
  cardMuted: string
  cardBorder: string
}

const BASES: Record<Exclude<Fundo, 'creme'>, { light: Base; dark: Base }> = {
  neutro: {
    light: {
      background: '#ffffff',
      foreground: '#111111',
      surface: '#f5f5f5',
      well: '#ebebeb',
      border: '#dcdcdc',
      muted: '#5a5a5a',
      card: '#ffffff',
      cardForeground: '#111111',
      cardMuted: '#5a5a5a',
      cardBorder: '#dcdcdc',
    },
    dark: {
      background: '#000000',
      foreground: '#f2f2f2',
      surface: '#0e0e0e',
      well: '#1c1c1c',
      border: '#333333',
      muted: '#a3a3a3',
      card: '#161616',
      cardForeground: '#f2f2f2',
      cardMuted: '#a3a3a3',
      cardBorder: '#2e2e2e',
    },
  },
  frio: {
    light: {
      background: '#eef1f5',
      foreground: '#1c2430',
      surface: '#f8fafc',
      well: '#e2e7ee',
      border: '#d3dae4',
      muted: '#556171',
      card: '#ffffff',
      cardForeground: '#1c2430',
      cardMuted: '#556171',
      cardBorder: '#d3dae4',
    },
    dark: {
      background: '#1a1f27',
      foreground: '#e8edf3',
      surface: '#141820',
      well: '#252c36',
      border: '#36404d',
      muted: '#9aa6b5',
      card: '#222933',
      cardForeground: '#e8edf3',
      cardMuted: '#9aa6b5',
      cardBorder: '#36404d',
    },
  },
}

/** Fundo do tema original, usado só para as contas de contraste do destaque. */
const CREME_BACKGROUND = { light: '#f1eadc', dark: '#25272a' }

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex([r, g, b]: [number, number, number]): `#${string}` {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

export function isHex(value: string): value is `#${string}` {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

/** Luminância relativa (WCAG 2). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Mistura `hex` com `other` (0 = só `hex`, 1 = só `other`). */
export function mix(hex: string, other: string, amount: number): `#${string}` {
  const a = channels(hex)
  const b = channels(other)
  return toHex(a.map((c, i) => c + (b[i] - c) * amount) as [number, number, number])
}

/** Texto que lê melhor sobre `hex`: claro ou escuro. */
export function readableOn(hex: string, light = '#ffffff', dark = '#111111'): string {
  return contrast(hex, light) >= contrast(hex, dark) ? light : dark
}

/**
 * Garante contraste de texto (AA) entre o destaque e o fundo, já que ele também colore textos, clareando ou escurecendo a cor.
 * `adjusted` avisa a tela de configurações que a cor escolhida foi mexida.
 */
export function ensureContrast(
  hex: string,
  background: string,
  min = 4.5,
): { color: `#${string}`; adjusted: boolean } {
  const original = toHex(channels(hex))
  if (contrast(original, background) >= min) return { color: original, adjusted: false }
  const target = luminance(background) > 0.5 ? '#000000' : '#ffffff'
  for (let step = 1; step <= 20; step++) {
    const candidate = mix(original, target, step * 0.05)
    if (contrast(candidate, background) >= min) return { color: candidate, adjusted: true }
  }
  return { color: toHex(channels(target)), adjusted: true }
}

export function backgroundOf(fundo: Fundo, dark: boolean): string {
  if (fundo === 'creme') return dark ? CREME_BACKGROUND.dark : CREME_BACKGROUND.light
  return BASES[fundo][dark ? 'dark' : 'light'].background
}

function backgroundTokens(fundo: Fundo, dark: boolean): Record<string, string> {
  if (fundo === 'creme') return {}
  const b = BASES[fundo][dark ? 'dark' : 'light']
  return {
    '--background': b.background,
    '--foreground': b.foreground,
    '--popover': b.surface,
    '--popover-foreground': b.foreground,
    '--secondary': b.well,
    '--secondary-foreground': b.foreground,
    '--muted': b.well,
    '--muted-foreground': b.muted,
    '--accent': b.well,
    '--accent-foreground': b.foreground,
    '--border': b.border,
    '--input': b.border,
    '--well': b.well,
    '--track': b.border,
    '--dashed': mix(b.border, b.muted, 0.4),
    '--ink': b.foreground,
    '--sidebar': b.surface,
    '--sidebar-foreground': b.foreground,
    '--sidebar-border': b.border,
    '--sidebar-well': b.well,
    '--sidebar-accent': b.foreground,
    '--sidebar-accent-foreground': b.background,
    '--card': b.card,
    '--card-foreground': b.cardForeground,
    '--card-muted': b.cardMuted,
    '--card-border': b.cardBorder,
    '--card-track': b.cardBorder,
    '--chart-2': b.foreground,
    '--chart-4': b.muted,
  }
}

function accentTokens(color: string, background: string): Record<string, string> {
  const foreground = readableOn(color, '#ffffff', '#111111')
  const strong = mix(color, luminance(background) > 0.5 ? '#000000' : '#ffffff', 0.15)
  return {
    '--primary': color,
    '--primary-foreground': foreground,
    '--ring': color,
    '--brand': color,
    '--brand-strong': strong,
    '--brand-foreground': foreground,
    '--sidebar-primary': color,
    '--sidebar-primary-foreground': foreground,
    '--sidebar-accent': color,
    '--sidebar-accent-foreground': foreground,
    '--sidebar-ring': color,
    '--chart-1': color,
    '--chart-3': mix(color, background, 0.55),
    '--chart-5': strong,
    '--focus-pill': color,
    '--focus-pill-foreground': foreground,
  }
}

export type Appearance = {
  tokens: Record<string, string>
  /** Cor de destaque efetivamente usada, já com o ajuste de contraste. */
  accent: string | null
  adjusted: boolean
}

/** Tokens CSS que a combinação de fundo e destaque sobrescreve no `<html>`. */
export function resolveAppearance(fundo: Fundo, destaque: Destaque, dark: boolean): Appearance {
  const tokens = backgroundTokens(fundo, dark)
  if (destaque === 'padrao' || !isHex(destaque)) return { tokens, accent: null, adjusted: false }
  const background = backgroundOf(fundo, dark)
  const { color, adjusted } = ensureContrast(destaque, background)
  return { tokens: { ...tokens, ...accentTokens(color, background) }, accent: color, adjusted }
}

/** Todos os nomes de token que a aparência pode tocar, para limpar ao trocar. */
export const APPEARANCE_TOKENS = Object.keys({
  ...backgroundTokens('neutro', false),
  ...accentTokens('#000000', '#ffffff'),
})

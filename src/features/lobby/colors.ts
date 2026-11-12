/** Cores dos gráficos do Lobby; saem dos tokens da aparência (`--chart-*`). */

/** Tom do destaque misturado com a superfície; `pct` é a força do destaque. */
export const shade = (pct: number) => `color-mix(in oklab, var(--chart-1) ${pct}%, var(--sidebar))`

export const SERIES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function heatLevel(min: number): string {
  if (min === 0) return 'var(--well)'
  if (min < 30) return shade(25)
  if (min < 60) return shade(45)
  if (min < 100) return shade(70)
  return 'var(--chart-1)'
}

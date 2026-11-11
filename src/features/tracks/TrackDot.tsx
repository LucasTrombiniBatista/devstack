import { cn } from '@/lib/utils'
import { TRACK_COLORS, type TrackColor } from './colors'

type Props = {
  /** Chave da paleta; sem trilha usa cinza. */
  cor: string | null | undefined
  /** Em cima de um card (sempre creme), "tinta" não inverte no tema escuro. */
  onCard?: boolean
  className?: string
}

export function TrackDot({ cor, onCard = false, className }: Props) {
  const key = TRACK_COLORS.includes(cor as TrackColor) ? cor : 'cinza'
  const color = onCard && key === 'tinta' ? 'var(--ink)' : `var(--track-${key})`
  return (
    <span
      aria-hidden
      className={cn('size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useUi } from '@/app/ui-store'
import type { Card, Track } from '@/data/types'
import { cardProgress } from '@/features/card/progress'
import { TrackDot } from '@/features/tracks/TrackDot'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChecklistCount } from './useBoardData'

type TileProps = {
  card: Card
  track: Track | undefined
  checklist: ChecklistCount | undefined
}

/** Aparência do card no quadro. Creme nos dois temas, como no design. */
export const CardTile = memo(function CardTile({ card, track, checklist }: TileProps) {
  const { t } = useTranslation()
  const progress = cardProgress(card, checklist)
  const meta = [t(`tipo.${card.tipo}`), card.plataforma].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-card-border bg-card p-3.5 text-card-foreground">
      <div className="flex items-center gap-1.5 text-xs font-bold text-card-muted">
        <TrackDot cor={track?.cor} onCard />
        <span className="min-w-0 flex-1 truncate">{meta}</span>
        <span>{card.estimativaMin === null ? '?' : formatDuration(card.estimativaMin)}</span>
      </div>
      <div className="text-sm leading-[1.1875rem] font-bold wrap-anywhere">{card.titulo}</div>
      {progress ? (
        <div className="flex items-center gap-2">
          <div className="flex h-1.5 flex-1 rounded-full bg-card-track">
            <div
              className="h-1.5 rounded-full bg-brand-strong"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-card-muted">{progress.label}</span>
        </div>
      ) : (
        card.tags.length > 0 && (
          <div className="font-mono text-[0.6875rem] leading-3.5 font-medium wrap-anywhere text-card-muted">
            {card.tags.map((tag) => `#${tag}`).join(' ')}
          </div>
        )
      )}
    </div>
  )
})

/** Card arrastável: Espaço pega e solta, setas movem, Enter ou clique abre o detalhe. */
export const SortableCard = memo(function SortableCard(props: TileProps) {
  const { card } = props
  const openCard = useUi((state) => state.openCard)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    listeners?.onKeyDown?.(event)
    if (event.key === 'Enter' && !event.defaultPrevented) {
      event.preventDefault()
      openCard(card.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={card.titulo}
      data-card-id={card.id}
      onKeyDown={onKeyDown}
      onClick={() => openCard(card.id)}
      className={cn(
        'touch-manipulation rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-40',
      )}
    >
      <CardTile {...props} />
    </div>
  )
})

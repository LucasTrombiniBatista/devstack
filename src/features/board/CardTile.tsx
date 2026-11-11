import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useUi } from '@/app/ui-store'
import type { Card, Track } from '@/data/types'
import { cardProgress } from '@/features/card/progress'
import { isEngaged } from '@/features/timer/engine'
import { spentLabel } from '@/features/timer/spent'
import { useTimer } from '@/features/timer/store'
import { useClock } from '@/features/timer/useClock'
import { TrackDot } from '@/features/tracks/TrackDot'
import { cn } from '@/lib/utils'
import type { ChecklistCount } from './useBoardData'

type TileProps = {
  card: Card
  track: Track | undefined
  checklist: ChecklistCount | undefined
  /** Minutos de foco já registrados no card. */
  spentMin?: number
}

/** Aparência do card no quadro. Creme nos dois temas, como no design. */
export const CardTile = memo(function CardTile(props: TileProps) {
  const { card, track, checklist, spentMin = 0 } = props
  const { t } = useTranslation()
  const focused = useTimer((state) => isEngaged(state) && state.cardId === card.id)
  const progress = cardProgress(card, checklist)
  const meta = [t(`tipo.${card.tipo}`), card.plataforma].filter(Boolean).join(' · ')

  if (focused) return <FocusTile {...props} />

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-card-border bg-card p-3.5 text-card-foreground">
      <div className="flex items-center gap-1.5 text-xs font-bold text-card-muted">
        <TrackDot cor={track?.cor} onCard />
        <span className="min-w-0 flex-1 truncate">{meta}</span>
        <span>{spentLabel(t, spentMin, card.estimativaMin)}</span>
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

/** O card em que o timer está ligado: escuro, com a contagem. */
function FocusTile({ card, track, checklist, spentMin = 0 }: TileProps) {
  const { t } = useTranslation()
  const { state, clock } = useClock()
  const progress = cardProgress(card, checklist)
  const meta = [t(`tipo.${card.tipo}`), card.plataforma].filter(Boolean).join(' · ')
  const status =
    state.status === 'running'
      ? state.phase === 'foco'
        ? t('timer.inFocus')
        : t('timer.onBreak')
      : state.status === 'paused'
        ? t('timer.paused')
        : t('timer.ready')

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-focus p-3.5 text-focus-foreground">
      <div className="flex items-center gap-1.5 text-xs font-bold text-focus-muted">
        <TrackDot cor={track?.cor} className="bg-focus-fill!" />
        <span className="min-w-0 flex-1 truncate">{meta}</span>
        <span>{spentLabel(t, spentMin, card.estimativaMin)}</span>
      </div>
      <div className="text-[0.9375rem] leading-5 font-extrabold wrap-anywhere">{card.titulo}</div>
      <div className="flex h-1.5 rounded-full bg-focus-track">
        <div
          className="h-1.5 rounded-full bg-focus-fill"
          style={{ width: `${progress?.percent ?? 0}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xl leading-6 font-bold tracking-[-0.02em] tabular-nums">
          {clock}
        </span>
        <span className="flex h-7.5 items-center gap-1.5 rounded-full bg-focus-pill px-3 text-xs font-extrabold text-focus-pill-foreground">
          {state.status === 'running' && (
            <span aria-hidden className="flex gap-[3px]">
              <span className="h-2.5 w-[2.5px] rounded-[1px] bg-current" />
              <span className="h-2.5 w-[2.5px] rounded-[1px] bg-current" />
            </span>
          )}
          {status}
        </span>
      </div>
    </div>
  )
}

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

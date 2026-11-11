import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  boardsRepo,
  cardsRepo,
  columnsRepo,
  planBlocksRepo,
  settingsRepo,
  tracksRepo,
} from '@/data/repos'
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@/data/seed'
import type { Card, PlanBlock, Track } from '@/data/types'
import { TrackDot } from '@/features/tracks/TrackDot'
import { formatDuration, formatWeekRange, isoWeek, localDate, normalizeText } from '@/lib/format'
import { cn } from '@/lib/utils'
import { moveBlock, planCard, resizeBlock } from './actions'
import { PlanDialog } from './PlanDialog'
import {
  blockMin,
  DAY_END,
  DAY_START,
  fromMin,
  parseDay,
  SLOT_MIN,
  SLOT_PX,
  toMin,
  weekDays,
} from './time'

const PLANNABLE = new Set(['backlog', 'semana', 'hoje'])
const GRID_PX = ((DAY_END - DAY_START) / SLOT_MIN) * SLOT_PX
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START + i * 60)

async function loadWeek(days: string[]) {
  const [board] = await boardsRepo.list()
  if (!board) return null
  const [columns, cards, tracks, blocks, settings] = await Promise.all([
    columnsRepo.listByBoard(board.id),
    cardsRepo.listByBoard(board.id),
    tracksRepo.listSorted(),
    planBlocksRepo.listByDays(days),
    settingsRepo.get(SETTINGS_ID),
  ])
  const plannable = new Set(
    columns.filter((c) => c.papel && PLANNABLE.has(c.papel)).map((c) => c.id),
  )
  return {
    cards: new Map(cards.map((card) => [card.id, card])),
    candidates: cards.filter((card) => plannable.has(card.columnId)),
    tracks: new Map(tracks.map((track) => [track.id, track])),
    blocks,
    capacity: settings?.capacidadeSemanalMin ?? DEFAULT_SETTINGS.capacidadeSemanalMin,
  }
}

type Editing = { card: Card; block: PlanBlock | null } | null

function CapacityBar({ planned, capacity }: { planned: number; capacity: number }) {
  const { t } = useTranslation()
  const over = planned > capacity
  return (
    <div className="flex min-w-60 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm font-bold">
        <span>
          {t('week.capacity', {
            planned: formatDuration(planned),
            capacity: formatDuration(capacity),
          })}
        </span>
        {over && (
          <span role="alert" className="text-brand">
            {t('week.over', { time: formatDuration(planned - capacity) })}
          </span>
        )}
      </div>
      <div className="flex h-1.5 rounded-full bg-track">
        <div
          className={cn('h-1.5 rounded-full', over ? 'bg-destructive' : 'bg-brand')}
          style={{ width: `${Math.min(100, (planned / Math.max(1, capacity)) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function CandidateItem({
  card,
  track,
  plannedMin,
  onPlan,
}: {
  card: Card
  track: Track | undefined
  plannedMin: number
  onPlan: () => void
}) {
  const { t } = useTranslation()
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: `card:${card.id}` })
  return (
    <li
      className={cn(
        'flex items-center gap-1 rounded-xl border border-card-border bg-card text-card-foreground',
        isDragging && 'opacity-40',
      )}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        tabIndex={-1}
        role="presentation"
        data-plan-card={card.titulo}
        className="flex min-w-0 flex-1 cursor-grab touch-none flex-col gap-0.5 py-2 pl-2.5"
      >
        <span className="flex items-center gap-1.5 text-[0.6875rem] font-bold text-card-muted">
          <TrackDot cor={track?.cor} onCard />
          <span className="truncate">
            {card.estimativaMin === null ? '?' : formatDuration(card.estimativaMin)}
            {plannedMin > 0 && ` · ${t('week.planned', { time: formatDuration(plannedMin) })}`}
          </span>
        </span>
        <span className="text-[0.8125rem] leading-4 font-bold wrap-anywhere">{card.titulo}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('week.planNamed', { name: card.titulo })}
        onClick={onPlan}
        className="mr-1 text-card-muted hover:bg-black/5"
      >
        <CalendarPlus aria-hidden />
      </Button>
    </li>
  )
}

function BlockView({
  block,
  card,
  track,
  label,
  onOpen,
}: {
  block: PlanBlock
  card: Card | undefined
  track: Track | undefined
  label: string
  onOpen: () => void
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `block:${block.id}`,
  })
  const [previewFim, setPreviewFim] = useState<number | null>(null)
  const [resizing, setResizing] = useState<{ y: number; fim: number } | null>(null)
  const start = toMin(block.inicio)
  const fim = previewFim ?? toMin(block.fim)

  function onResizeDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizing({ y: event.clientY, fim: toMin(block.fim) })
  }
  function onResizeMove(event: PointerEvent<HTMLDivElement>) {
    if (!resizing) return
    const delta = Math.round((event.clientY - resizing.y) / SLOT_PX) * SLOT_MIN
    setPreviewFim(Math.min(DAY_END, Math.max(start + SLOT_MIN, resizing.fim + delta)))
  }
  function onResizeUp() {
    if (resizing && previewFim !== null) void resizeBlock(block, previewFim)
    setResizing(null)
    setPreviewFim(null)
  }

  return (
    <div
      className={cn('absolute inset-x-1', isDragging && 'z-10 opacity-60')}
      style={{
        top: ((start - DAY_START) / SLOT_MIN) * SLOT_PX,
        height: ((fim - start) / SLOT_MIN) * SLOT_PX - 2,
        transform: CSS.Translate.toString(transform),
      }}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-label={label}
        data-block-id={block.id}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        }}
        className="flex h-full cursor-grab touch-none flex-col overflow-hidden rounded-lg border border-card-border bg-card px-2 py-1 text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-1 text-[0.625rem] font-bold text-card-muted">
          <TrackDot cor={track?.cor} onCard className="size-1.5" />
          {block.inicio}–{fromMin(fim)}
        </span>
        <span className="text-[0.75rem] leading-4 font-bold wrap-anywhere">{card?.titulo}</span>
      </div>
      <div
        aria-hidden
        data-resize-handle
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        className="absolute inset-x-2 -bottom-0.5 h-2 cursor-ns-resize rounded-full hover:bg-brand/40"
      />
    </div>
  )
}

function DayColumn({
  day,
  label,
  short,
  today,
  children,
}: {
  day: string
  label: string
  short: string
  today: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day}` })
  return (
    <section aria-label={label} className="flex min-w-28 flex-1 flex-col">
      <h2
        className={cn(
          'flex h-9 items-center justify-center text-xs font-extrabold first-letter:uppercase',
          today ? 'text-brand' : 'text-muted-foreground',
        )}
      >
        <span className="sr-only">{label}</span>
        <span aria-hidden>{short}</span>
      </h2>
      <div
        ref={setNodeRef}
        data-day={day}
        className={cn(
          'relative border-l border-border',
          today && 'bg-well/60',
          isOver && 'bg-well',
        )}
        style={{
          height: GRID_PX,
          backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${SLOT_PX * 2}px)`,
        }}
      >
        {children}
      </div>
    </section>
  )
}

/** Visão semanal: arrastar cards para dia e horário, mover e esticar blocos, ver a capacidade. */
export function WeekPage() {
  const { t, i18n } = useTranslation()
  const [anchor, setAnchor] = useState(() => new Date())
  const days = useMemo(() => weekDays(anchor), [anchor])
  const data = useLiveQuery(() => loadWeek(days), [days.join()])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const [dragging, setDragging] = useState<Card | null>(null)
  const [today] = useState(() => localDate(new Date()))

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const shortDay = (day: string) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric' }).format(
      parseDay(day),
    )
  const longDay = (day: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(parseDay(day))

  if (!data) return null
  const { cards, candidates, tracks, blocks, capacity } = data
  const planned = blocks.reduce((sum, block) => sum + blockMin(block), 0)
  const plannedByCard = new Map<string, number>()
  for (const block of blocks) {
    plannedByCard.set(block.cardId, (plannedByCard.get(block.cardId) ?? 0) + blockMin(block))
  }
  const needle = normalizeText(query.trim())
  const shown = needle
    ? candidates.filter((card) => normalizeText(card.titulo).includes(needle))
    : candidates

  function shiftWeek(weeks: number) {
    const next = new Date(anchor)
    next.setDate(next.getDate() + weeks * 7)
    setAnchor(next)
  }

  function onDragStart(event: DragStartEvent) {
    const [kind, id] = String(event.active.id).split(':')
    // Blocos se movem no lugar; só o card vindo da lista ganha uma prévia flutuante.
    setDragging(kind === 'card' ? (cards.get(id) ?? null) : null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    const top = active.rect.current.translated?.top
    if (!over || top === undefined) return
    const dia = String(over.id).slice('day:'.length)
    const minute = DAY_START + ((top - over.rect.top) / SLOT_PX) * SLOT_MIN
    const [kind, id] = String(active.id).split(':')
    if (kind === 'card') void planCard(id, dia, minute)
    else {
      const block = blocks.find((b) => b.id === id)
      if (block) void moveBlock(block, dia, minute)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-bold text-muted-foreground">
            {t('board.week', {
              week: isoWeek(parseDay(days[0])),
              range: formatWeekRange(parseDay(days[0]), i18n.language),
            })}
          </p>
          <h1 className="text-[1.875rem] leading-9 font-black tracking-[-0.02em]">
            {t('week.title')}
          </h1>
        </div>
        <CapacityBar planned={planned} capacity={capacity} />
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t('week.prev')}
            onClick={() => shiftWeek(-1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button variant="outline" onClick={() => setAnchor(new Date())}>
            {t('week.thisWeek')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('week.next')}
            onClick={() => shiftWeek(1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <aside
            aria-labelledby="week-candidates"
            className="flex flex-col gap-2.5 lg:w-64 lg:shrink-0"
          >
            <h2 id="week-candidates" className="text-sm font-extrabold">
              {t('week.toPlan')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('week.hint')}</p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('week.search')}
              placeholder={t('week.search')}
              className="h-8 rounded-full bg-well px-3 text-[0.8125rem] font-semibold outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {shown.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('week.noCandidates')}</p>
            ) : (
              <ul className="flex max-h-[34rem] flex-col gap-1.5 overflow-y-auto pr-1">
                {shown.map((card) => (
                  <CandidateItem
                    key={card.id}
                    card={card}
                    track={card.trackId ? tracks.get(card.trackId) : undefined}
                    plannedMin={plannedByCard.get(card.id) ?? 0}
                    onPlan={() => setEditing({ card, block: null })}
                  />
                ))}
              </ul>
            )}
          </aside>

          <div className="flex min-w-0 flex-1 overflow-x-auto">
            <div aria-hidden className="w-11 shrink-0 pt-9">
              <div className="relative" style={{ height: GRID_PX }}>
                {HOURS.map((min) => (
                  <span
                    key={min}
                    className="absolute right-1.5 -translate-y-1/2 font-mono text-[0.625rem] text-muted-foreground"
                    style={{ top: ((min - DAY_START) / SLOT_MIN) * SLOT_PX }}
                  >
                    {String(min / 60).padStart(2, '0')}h
                  </span>
                ))}
              </div>
            </div>
            {days.map((day) => (
              <DayColumn
                key={day}
                day={day}
                label={longDay(day)}
                short={shortDay(day)}
                today={day === today}
              >
                {blocks
                  .filter((block) => block.dia === day)
                  .map((block) => {
                    const card = cards.get(block.cardId)
                    return (
                      <BlockView
                        key={block.id}
                        block={block}
                        card={card}
                        track={card?.trackId ? tracks.get(card.trackId) : undefined}
                        label={`${card?.titulo ?? ''}, ${shortDay(day)} ${block.inicio}–${block.fim}`}
                        onOpen={() => card && setEditing({ card, block })}
                      />
                    )
                  })}
              </DayColumn>
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="w-28 rounded-lg border border-card-border bg-card px-2 py-1 text-[0.75rem] font-bold text-card-foreground shadow-lg">
              {dragging.titulo}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {editing && (
        <PlanDialog
          card={editing.card}
          block={editing.block}
          days={days}
          dayLabel={longDay}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

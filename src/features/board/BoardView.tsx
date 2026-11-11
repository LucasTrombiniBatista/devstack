import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cardsRepo } from '@/data/repos'
import type { Card, Column, Track } from '@/data/types'
import { TrackDot } from '@/features/tracks/TrackDot'
import { cn } from '@/lib/utils'
import { CardTile, SortableCard } from './CardTile'
import {
  buildCells,
  buildLanes,
  cellKey,
  findCell,
  NO_LANE,
  NO_TRACK,
  PAGE_SIZE,
  parseCell,
  targetIndex,
  type Cells,
  type Lane,
} from './cells'
import { ColumnDialog } from './ColumnDialog'
import { ColumnHeader } from './ColumnHeader'
import { useBoardView, type BoardFilters } from './filters'
import { boardCoordinateGetter } from './keyboard'
import { QuickAdd } from './QuickAdd'
import type { BoardData, ChecklistCount } from './useBoardData'

type CellProps = {
  id: string
  ids: string[]
  total: number
  boardId: string
  columnId: string
  trackId: string | null
  prominentAdd: boolean
  cardsById: Map<string, Card>
  tracksById: Map<string, Track>
  checklist: Map<string, ChecklistCount>
  spent: Map<string, number>
  onShowMore: () => void
}

/** Uma célula do quadro (raia × coluna): área de soltar com os cards ordenáveis. */
function Cell(props: CellProps) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({
    id: props.id,
    data: { type: 'cell', children: props.ids },
  })
  const hidden = props.total - props.ids.length

  return (
    <SortableContext id={props.id} items={props.ids} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-9 flex-col gap-2.5 rounded-2xl',
          isOver && props.ids.length === 0 && 'outline-2 outline-ring/60 outline-dashed',
        )}
      >
        {props.ids.map((id) => {
          const card = props.cardsById.get(id)
          if (!card) return null
          return (
            <SortableCard
              key={id}
              card={card}
              track={card.trackId ? props.tracksById.get(card.trackId) : undefined}
              checklist={props.checklist.get(id)}
              spentMin={props.spent.get(id) ?? 0}
            />
          )
        })}
        {hidden > 0 && (
          <button
            type="button"
            onClick={props.onShowMore}
            className="h-8 rounded-xl text-xs font-bold text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('board.showMore', { count: hidden })}
          </button>
        )}
        <QuickAdd
          boardId={props.boardId}
          columnId={props.columnId}
          trackId={props.trackId}
          prominent={props.prominentAdd}
        />
      </div>
    </SortableContext>
  )
}

const laneTrackId = (lane: Lane, filters: BoardFilters) =>
  lane.id === NO_LANE ? filters.trackId : (lane.track?.id ?? null)

export function BoardView({ data }: { data: BoardData }) {
  const { t } = useTranslation()
  const view = useBoardView()
  const { board, columns, cards, tracks, checklist, spent } = data

  const [limits, setLimits] = useState<Record<string, number>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Ordem mostrada durante o arrasto e até o banco confirmar a mudança. */
  const [override, setOverride] = useState<Cells | null>(null)
  const [editing, setEditing] = useState<Column | 'new' | null>(null)

  const cardsById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards])
  const tracksById = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks])
  const lanes = useMemo(
    () => buildLanes(tracks, view.groupByTrack, view.trackId),
    [tracks, view.groupByTrack, view.trackId],
  )
  const filters: BoardFilters = useMemo(
    () => ({
      search: view.search,
      trackId: view.trackId,
      tipos: view.tipos,
      prioridades: view.prioridades,
      plataformas: view.plataformas,
      tags: view.tags,
    }),
    [view.search, view.trackId, view.tipos, view.prioridades, view.plataformas, view.tags],
  )
  const base = useMemo(
    () => buildCells(cards, columns, lanes, filters, limits),
    [cards, columns, lanes, filters, limits],
  )

  // Quando o banco alcança o que foi solto, a ordem provisória deixa de ser necessária.
  const [seenBase, setSeenBase] = useState(base)
  if (seenBase !== base) {
    setSeenBase(base)
    if (activeId === null) setOverride(null)
  }

  const cells = override ?? base.cells
  const columnTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const card of cards) totals.set(card.columnId, (totals.get(card.columnId) ?? 0) + 1)
    return totals
  }, [cards])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardCoordinateGetter,
      // Enter fica livre para abrir o card.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const titleOf = (id: string | number) => cardsById.get(String(id))?.titulo ?? ''
  const placeOf = (id: string | number) => {
    const key = findCell(cells, String(id))
    if (!key) return ''
    const { columnId } = parseCell(key)
    return columns.find((column) => column.id === columnId)?.nome ?? ''
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('dnd.picked', { card: titleOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? t('dnd.over', { card: titleOf(active.id), column: placeOf(over.id) }) : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('dnd.dropped', { card: titleOf(active.id), column: placeOf(over.id) })
        : t('dnd.cancelled', { card: titleOf(active.id) }),
    onDragCancel: ({ active }) => t('dnd.cancelled', { card: titleOf(active.id) }),
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setOverride(base.cells)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const id = String(active.id)
    const overId = String(over.id)
    setOverride((previous) => {
      const current = previous ?? base.cells
      const from = findCell(current, id)
      const to = findCell(current, overId)
      if (!from || !to || from === to) return previous
      const target = current[to]
      const overIndex = target.indexOf(overId)
      const translated = active.rect.current.translated
      const below = translated !== null && translated.top > over.rect.top + over.rect.height
      const index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length
      return {
        ...current,
        [from]: current[from].filter((cardId) => cardId !== id),
        [to]: [...target.slice(0, index), id, ...target.slice(index)],
      }
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    setActiveId(null)
    if (!over) {
      setOverride(null)
      return
    }

    let next = override ?? base.cells
    const from = findCell(next, id)
    const to = findCell(next, String(over.id))
    if (from && to && from === to) {
      const oldIndex = next[from].indexOf(id)
      const newIndex = next[from].indexOf(String(over.id))
      if (newIndex >= 0 && oldIndex !== newIndex) {
        next = { ...next, [from]: arrayMove(next[from], oldIndex, newIndex) }
      }
    }

    const cell = findCell(next, id)
    const origin = findCell(base.cells, id)
    if (!cell || !origin) {
      setOverride(null)
      return
    }
    const list = next[cell]
    const position = list.indexOf(id)
    const prev = list[position - 1]
    const after = list[position + 1]
    const before = base.cells[origin]
    const was = before.indexOf(id)
    if (cell === origin && before[was - 1] === prev && before[was + 1] === after) {
      setOverride(null)
      return
    }

    setOverride(next)
    const { laneId, columnId } = parseCell(cell)
    const siblings = cards
      .filter((card) => card.columnId === columnId && card.id !== id)
      .map((card) => card.id)
    const patch = laneId === NO_LANE ? {} : { trackId: laneId === NO_TRACK ? null : laneId }
    cardsRepo
      .move(id, columnId, targetIndex(siblings, prev, after), patch)
      .catch(() => setOverride(null))
  }

  const activeCard = activeId ? cardsById.get(activeId) : undefined
  const grouped = view.groupByTrack

  const renderCell = (lane: Lane, column: Column, columnIndex: number) => {
    const key = cellKey(lane.id, column.id)
    return (
      <Cell
        id={key}
        ids={cells[key] ?? []}
        total={base.totals[key] ?? 0}
        boardId={board.id}
        columnId={column.id}
        trackId={laneTrackId(lane, filters)}
        prominentAdd={columnIndex === 0}
        cardsById={cardsById}
        tracksById={tracksById}
        checklist={checklist}
        spent={spent}
        onShowMore={() =>
          setLimits((current) => ({ ...current, [key]: (current[key] ?? PAGE_SIZE) + PAGE_SIZE }))
        }
      />
    )
  }

  const renderHeader = (column: Column, index: number) => (
    <ColumnHeader
      column={column}
      index={index}
      columnCount={columns.length}
      total={columnTotals.get(column.id) ?? 0}
      visible={lanes.reduce(
        (sum, lane) => sum + (base.totals[cellKey(lane.id, column.id)] ?? 0),
        0,
      )}
      onEdit={() => setEditing(column)}
    />
  )

  const addColumn = (
    <button
      type="button"
      onClick={() => setEditing('new')}
      className="flex h-7 w-40 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-bold text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Plus aria-hidden className="size-3.5" />
      {t('board.addColumn')}
    </button>
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t('dnd.instructions') },
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setOverride(null)
      }}
    >
      <div className="min-h-0 flex-1 overflow-auto pb-8">
        {grouped ? (
          <div className="flex w-max flex-col gap-4">
            <div className="flex items-start gap-3.5">
              {columns.map((column, index) => (
                <div key={column.id} className="w-59 shrink-0">
                  {renderHeader(column, index)}
                </div>
              ))}
              {addColumn}
            </div>
            {lanes.map((lane) => (
              <section
                key={lane.id}
                aria-label={lane.track?.nome ?? t('board.noTrack')}
                className="flex flex-col gap-2.5"
              >
                <h3 className="flex items-center gap-2 px-1 text-xs font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
                  <TrackDot cor={lane.track?.cor} className="size-2.5" />
                  {lane.track?.nome ?? t('board.noTrack')}
                </h3>
                <div className="flex items-start gap-3.5">
                  {columns.map((column, index) => (
                    <div key={column.id} className="group/column w-59 shrink-0">
                      {renderCell(lane, column, index)}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex w-max items-start gap-3.5">
            {columns.map((column, index) => (
              <section
                key={column.id}
                aria-label={column.nome}
                className={cn(
                  'group/column flex shrink-0 flex-col gap-2.5',
                  column.limiteWip === null ? 'w-59' : 'w-65 rounded-[1.375rem] bg-well p-3',
                )}
              >
                {renderHeader(column, index)}
                {renderCell(lanes[0], column, index)}
              </section>
            ))}
            {addColumn}
          </div>
        )}
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rotate-1 cursor-grabbing shadow-lg">
            <CardTile
              card={activeCard}
              track={activeCard.trackId ? tracksById.get(activeCard.trackId) : undefined}
              checklist={checklist.get(activeCard.id)}
              spentMin={spent.get(activeCard.id) ?? 0}
            />
          </div>
        )}
      </DragOverlay>

      {editing !== null && (
        <ColumnDialog
          boardId={board.id}
          column={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </DndContext>
  )
}

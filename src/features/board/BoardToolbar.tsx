import { Check, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUi } from '@/app/ui-store'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cardsRepo } from '@/data/repos'
import { PRIORIDADES, TIPOS } from '@/features/card/options'
import { TrackDot } from '@/features/tracks/TrackDot'
import { cn } from '@/lib/utils'
import { activeFilterCount, useBoardView } from './filters'
import type { BoardData } from './useBoardData'

const pill =
  'flex h-9 items-center gap-2 rounded-full border border-input bg-sidebar px-3.5 text-[0.8125rem] font-bold outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring dark:bg-transparent'

function Chips<T extends string>(props: {
  label: string
  options: T[]
  selected: string[]
  render: (option: T) => string
  onToggle: (option: T) => void
}) {
  if (props.options.length === 0) return null
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
        {props.label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {props.options.map((option) => {
          const on = props.selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => props.onToggle(option)}
              className={cn(
                'h-7 rounded-full border px-2.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on
                  ? 'border-transparent bg-foreground text-background'
                  : 'border-input hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {props.render(option)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Botões do topo do quadro: trilha, filtros e novo card. */
export function BoardToolbar({ data }: { data: BoardData }) {
  const { t } = useTranslation()
  const view = useBoardView()
  const openCard = useUi((state) => state.openCard)
  const { board, columns, cards, tracks } = data

  const plataformas = useMemo(
    () => [...new Set(cards.map((card) => card.plataforma).filter((p): p is string => !!p))].sort(),
    [cards],
  )
  const tags = useMemo(() => [...new Set(cards.flatMap((card) => card.tags))].sort(), [cards])
  const count = activeFilterCount(view)
  const currentTrack = tracks.find((track) => track.id === view.trackId)

  async function newCard() {
    if (columns.length === 0) return
    const card = await cardsRepo.create({
      boardId: board.id,
      columnId: columns[0].id,
      trackId: view.trackId,
      titulo: t('card.untitled'),
    })
    openCard(card.id)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className={pill}>
          {currentTrack && <TrackDot cor={currentTrack.cor} className="size-2.5" />}
          {currentTrack?.nome ?? t('board.allTracks')}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onSelect={() => view.setTrack(null)}>
            <span className="flex-1">{t('board.allTracks')}</span>
            {view.trackId === null && <Check aria-hidden className="size-4" />}
          </DropdownMenuItem>
          {tracks.map((track) => (
            <DropdownMenuItem key={track.id} onSelect={() => view.setTrack(track.id)}>
              <TrackDot cor={track.cor} className="size-2.5" />
              <span className="flex-1">{track.nome}</span>
              {view.trackId === track.id && <Check aria-hidden className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={view.groupByTrack}
            onCheckedChange={(checked) => view.setGroupByTrack(checked === true)}
          >
            {t('board.groupByTrack')}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger className={pill}>
          {t('board.filters')}
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-strong px-1.5 text-[0.6875rem] font-extrabold text-brand-foreground">
              {count}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-80 flex-col gap-4">
          <Chips
            label={t('card.type')}
            options={TIPOS}
            selected={view.tipos}
            render={(tipo) => t(`tipo.${tipo}`)}
            onToggle={(tipo) => view.toggle('tipos', tipo)}
          />
          <Chips
            label={t('card.priority')}
            options={PRIORIDADES}
            selected={view.prioridades}
            render={(prioridade) => t(`prioridade.${prioridade}`)}
            onToggle={(prioridade) => view.toggle('prioridades', prioridade)}
          />
          <Chips
            label={t('card.platform')}
            options={plataformas}
            selected={view.plataformas}
            render={(plataforma) => plataforma}
            onToggle={(plataforma) => view.toggle('plataformas', plataforma)}
          />
          <Chips
            label={t('card.tags')}
            options={tags}
            selected={view.tags}
            render={(tag) => `#${tag}`}
            onToggle={(tag) => view.toggle('tags', tag)}
          />
          {count > 0 && (
            <button
              type="button"
              onClick={view.clearPanel}
              className="self-start text-xs font-bold text-brand underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('board.clearFilters')}
            </button>
          )}
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => void newCard()}
        className="flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[0.8125rem] font-extrabold text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus aria-hidden className="size-3.5 stroke-3 dark:text-brand-strong" />
        {t('board.newCard')}
      </button>
    </div>
  )
}

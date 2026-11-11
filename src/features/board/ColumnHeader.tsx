import { MoreHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { columnsRepo } from '@/data/repos'
import type { Column } from '@/data/types'
import { cn } from '@/lib/utils'

type Props = {
  column: Column
  /** Posição no quadro e total de colunas, para os comandos de mover. */
  index: number
  columnCount: number
  /** Cards na coluna, sem filtro (é o que conta para o WIP). */
  total: number
  /** Cards que passam no filtro atual; igual a `total` sem filtro. */
  visible: number
  onEdit: () => void
}

export function ColumnHeader({ column, index, columnCount, total, visible, onEdit }: Props) {
  const { t } = useTranslation()
  const overLimit = column.limiteWip !== null && total > column.limiteWip

  return (
    <div className="flex h-7 shrink-0 items-center gap-1.5 px-1">
      <h2 className="min-w-0 flex-1 truncate text-sm font-extrabold">{column.nome}</h2>
      {column.limiteWip === null ? (
        <span className="text-xs font-bold text-muted-foreground">
          {visible === total ? total : `${visible}/${total}`}
        </span>
      ) : (
        <span
          title={overLimit ? t('board.wipOver') : undefined}
          className={cn(
            'flex h-5.5 items-center rounded-full px-2.25 text-[0.6875rem] font-extrabold',
            overLimit ? 'bg-brand-strong text-brand-foreground' : 'bg-foreground text-background',
          )}
        >
          {t('board.wip', { count: total, limit: column.limiteWip })}
          {overLimit && <span className="sr-only"> · {t('board.wipOver')}</span>}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('column.menu', { name: column.nome })}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>{t('column.edit')}</DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === 0}
            onSelect={() => void columnsRepo.move(column.id, index - 1)}
          >
            {t('column.moveLeft')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === columnCount - 1}
            onSelect={() => void columnsRepo.move(column.id, index + 1)}
          >
            {t('column.moveRight')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={total > 0 || columnCount <= 1}
            onSelect={() => void columnsRepo.remove(column.id)}
          >
            {total > 0 ? t('column.deleteHint') : t('column.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatWeekRange, isoWeek } from '@/lib/format'
import { BoardToolbar } from './BoardToolbar'
import { BoardView } from './BoardView'
import { hasAnyFilter, useBoardView } from './filters'
import { useBoardData } from './useBoardData'

export function BoardPage() {
  const { t, i18n } = useTranslation()
  const data = useBoardData()
  const view = useBoardView()
  const [today] = useState(() => new Date())

  if (!data) return null

  return (
    <div className="flex h-full flex-col gap-5.5 px-4 pt-5 md:px-8 md:pt-7">
      <header className="page-header flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[0.8125rem] font-bold text-muted-foreground">
            {t('board.week', {
              week: isoWeek(today),
              range: formatWeekRange(today, i18n.language),
            })}
          </p>
          <h1 className="text-3xl leading-9 font-black tracking-[-0.02em]">{data.board.nome}</h1>
        </div>
        <BoardToolbar data={data} />
      </header>

      {hasAnyFilter(view) && (
        <p role="status" className="-mt-2 text-xs font-bold text-muted-foreground">
          {t('board.filtered')}{' '}
          <button
            type="button"
            onClick={view.reset}
            className="text-brand underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('board.clearFilters')}
          </button>
        </p>
      )}

      <BoardView data={data} />
    </div>
  )
}

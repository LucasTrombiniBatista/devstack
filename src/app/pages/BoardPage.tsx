import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Page } from '@/app/layout/Page'
import { boardsRepo, columnsRepo } from '@/data/repos'

async function loadBoard() {
  const [board] = await boardsRepo.list()
  if (!board) return null
  return { board, columns: await columnsRepo.listByBoard(board.id) }
}

export function BoardPage() {
  const { t } = useTranslation()
  const data = useLiveQuery(loadBoard)

  return (
    <Page title={data?.board.nome ?? t('board.title')}>
      <p className="text-sm text-muted-foreground">{t('board.empty')}</p>
      <ol className="flex gap-3 overflow-x-auto pb-2">
        {data?.columns.map((column) => (
          <li
            key={column.id}
            className="flex w-56 shrink-0 flex-col gap-3 rounded-xl border bg-card p-3 text-card-foreground"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-sm font-medium">{column.nome}</h2>
              {column.limiteWip !== null && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {t('board.wip', { count: column.limiteWip })}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('board.noCards')}</p>
          </li>
        ))}
      </ol>
    </Page>
  )
}

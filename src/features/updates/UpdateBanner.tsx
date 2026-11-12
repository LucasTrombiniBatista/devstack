import { Download, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { installUpdate, postponeUpdate, useUpdates } from './store'

const Markdown = lazy(() => import('@/features/card/Markdown'))

/** Aviso discreto no canto da tela quando há uma versão nova do app desktop. */
export function UpdateBanner() {
  const { t } = useTranslation()
  const { status, version, notes, progress, needsConfirm, visible } = useUpdates()
  const [showNotes, setShowNotes] = useState(false)
  if (!visible || !version) return null

  const busy = status === 'downloading' || status === 'installing'

  return (
    <aside
      aria-labelledby="update-title"
      className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Download className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="update-title" className="text-sm font-extrabold">
            {t('updates.available', { version })}
          </h2>
          <p role="status" className="text-xs text-muted-foreground">
            {status === 'downloading'
              ? progress === null
                ? t('updates.downloading')
                : t('updates.downloadingPct', { pct: Math.round(progress * 100) })
              : status === 'installing'
                ? t('updates.installing')
                : status === 'error'
                  ? t('updates.error')
                  : t('updates.hint')}
          </p>
        </div>
        {!busy && (
          <button
            type="button"
            onClick={postponeUpdate}
            aria-label={t('updates.later')}
            className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      {busy && (
        <div
          role="progressbar"
          aria-label={t('updates.progress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress === null ? undefined : Math.round(progress * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-(--well)"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.round((progress ?? 0.15) * 100)}%` }}
          />
        </div>
      )}

      {notes && !busy && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={showNotes}
            onClick={() => setShowNotes((open) => !open)}
            className="self-start text-xs font-bold text-foreground underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showNotes ? t('updates.hideNotes') : t('updates.showNotes')}
          </button>
          {showNotes && (
            <div className="max-h-48 overflow-auto text-xs">
              <Suspense fallback={null}>
                <Markdown source={notes} />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {needsConfirm && (
        <p className="text-xs font-semibold text-foreground">{t('updates.timerRunning')}</p>
      )}

      {!busy && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={postponeUpdate}>
            {t('updates.later')}
          </Button>
          <Button size="sm" onClick={() => void installUpdate({ force: needsConfirm })}>
            {needsConfirm ? t('updates.installAnyway') : t('updates.install')}
          </Button>
        </div>
      )}
    </aside>
  )
}

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUi } from '@/app/ui-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  backupFilename,
  download,
  exportBackup,
  exportCsv,
  exportMarkdown,
  restoreBackup,
} from './backup'

/** Seção "Dados" das configurações: exportar, importar lista e restaurar backup. */
export function DataSettings() {
  const { t } = useTranslation()
  const openImport = useUi((state) => state.openImport)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ name: string; data: unknown } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function pickBackup(file: File) {
    setMessage(null)
    try {
      setPending({ name: file.name, data: JSON.parse(await file.text()) })
    } catch {
      setMessage(t('data.invalid'))
    }
  }

  async function restore() {
    if (!pending) return
    try {
      await restoreBackup(pending.data)
      setMessage(t('data.restored'))
    } catch {
      setMessage(t('data.invalid'))
    }
    setPending(null)
  }

  return (
    <section aria-labelledby="settings-data" className="flex max-w-xl flex-col gap-4">
      <h2 id="settings-data" className="text-sm font-medium text-muted-foreground">
        {t('data.title')}
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl border bg-sidebar p-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t('data.export')}</p>
          <p className="text-xs text-muted-foreground">{t('data.exportHint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () =>
                download(
                  backupFilename('json'),
                  JSON.stringify(await exportBackup(), null, 2),
                  'application/json',
                )
              }
            >
              {t('data.backup')}
            </Button>
            <Button
              variant="outline"
              onClick={async () =>
                download(backupFilename('md'), await exportMarkdown(), 'text/markdown')
              }
            >
              Markdown
            </Button>
            <Button
              variant="outline"
              onClick={async () => download(backupFilename('csv'), await exportCsv(), 'text/csv')}
            >
              CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="text-sm font-medium">{t('data.import')}</p>
          <p className="text-xs text-muted-foreground">{t('data.importHint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openImport()}>
              {t('import.title')}
            </Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              {t('data.restore')}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              aria-label={t('data.restore')}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void pickBackup(file)
                event.target.value = ''
              }}
            />
          </div>
          {message && (
            <p role="status" className="text-sm font-bold">
              {message}
            </p>
          )}
        </div>
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('data.restoreTitle')}</DialogTitle>
            <DialogDescription>
              {t('data.restoreWarning', { file: pending?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void restore()}>
              {t('data.restoreConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

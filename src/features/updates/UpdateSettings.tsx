import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/app/settings-store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { isDesktop } from '@/platform/runtime'
import { checkForUpdate, useUpdates } from './store'

/** Seção "Atualizações" das configurações; só existe no app desktop. */
export function UpdateSettings() {
  const { t } = useTranslation()
  const { autoUpdate, setAutoUpdate } = useSettings()
  const { status, currentVersion, version } = useUpdates()

  useEffect(() => {
    if (!isDesktop || useUpdates.getState().currentVersion) return
    void import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then((v) => useUpdates.setState({ currentVersion: v }))
      .catch(() => {})
  }, [])

  if (!isDesktop) return null

  const message =
    status === 'checking'
      ? t('updates.checking')
      : status === 'upToDate'
        ? t('updates.upToDate')
        : status === 'available' && version
          ? t('updates.available', { version })
          : status === 'error'
            ? t('updates.checkError')
            : null

  return (
    <section aria-labelledby="settings-updates" className="flex max-w-xl flex-col gap-4">
      <h2 id="settings-updates" className="text-sm font-medium text-muted-foreground">
        {t('updates.title')}
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl border bg-sidebar p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {t('updates.current', { version: currentVersion ?? '…' })}
            </span>
            <span role="status" className="text-xs text-muted-foreground">
              {message}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={status === 'checking' || status === 'downloading'}
            onClick={() => void checkForUpdate({ manual: true })}
          >
            {t('updates.check')}
          </Button>
        </div>
        <div className="flex items-center gap-2.5 border-t pt-4">
          <Checkbox
            id="updates-auto"
            checked={autoUpdate}
            onCheckedChange={(value) => setAutoUpdate(value === true)}
          />
          <Label htmlFor="updates-auto" className="text-sm font-medium">
            {t('updates.auto')}
          </Label>
        </div>
      </div>
    </section>
  )
}

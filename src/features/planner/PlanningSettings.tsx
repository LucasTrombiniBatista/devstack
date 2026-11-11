import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { settingsRepo } from '@/data/repos'
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@/data/seed'
import { useDraft } from '@/features/card/useDraft'

function CapacityField({ minutes }: { minutes: number }) {
  const { t } = useTranslation()
  const draft = useDraft(String(minutes / 60), (text) => {
    const hours = Number.parseFloat(text.replace(',', '.'))
    if (!Number.isFinite(hours) || hours <= 0) return
    void settingsRepo.update(SETTINGS_ID, { capacidadeSemanalMin: Math.round(hours * 60) })
  })
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="capacity" className="text-xs font-bold text-muted-foreground">
        {t('settings.planning.capacity')}
      </Label>
      <Input id="capacity" {...draft} inputMode="decimal" className="w-32" />
      <p className="text-xs text-muted-foreground">{t('settings.planning.capacityHint')}</p>
    </div>
  )
}

/** Seção "Planejamento" das configurações: horas disponíveis por semana. */
export function PlanningSettings() {
  const { t } = useTranslation()
  const settings = useLiveQuery(() => settingsRepo.get(SETTINGS_ID))
  const minutes = settings?.capacidadeSemanalMin ?? DEFAULT_SETTINGS.capacidadeSemanalMin

  return (
    <section aria-labelledby="settings-planning" className="flex max-w-xl flex-col gap-4">
      <h2 id="settings-planning" className="text-sm font-medium text-muted-foreground">
        {t('settings.planning.title')}
      </h2>
      <div className="rounded-2xl border bg-sidebar p-4">
        {settings && <CapacityField key={minutes} minutes={minutes} />}
      </div>
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import { useSettings } from '@/app/settings-store'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { settingsRepo } from '@/data/repos'
import { SETTINGS_ID } from '@/data/seed'
import type { PomodoroConfig } from '@/data/types'
import { useDraft } from '@/features/card/useDraft'
import { requestNotifyPermission } from './notify'
import { usePomodoroConfig } from './useClock'

const FIELDS: { key: keyof PomodoroConfig; max: number }[] = [
  { key: 'focoMin', max: 180 },
  { key: 'pausaCurtaMin', max: 60 },
  { key: 'pausaLongaMin', max: 120 },
  { key: 'ciclosAtePausaLonga', max: 12 },
]

function NumberField({
  field,
  max,
  config,
}: {
  field: keyof PomodoroConfig
  max: number
  config: PomodoroConfig
}) {
  const { t } = useTranslation()
  const id = `pomodoro-${field}`
  const draft = useDraft(String(config[field]), (text) => {
    const value = Math.min(max, Math.max(1, Math.round(Number.parseFloat(text))))
    if (!Number.isFinite(value)) return
    void settingsRepo.update(SETTINGS_ID, { pomodoro: { ...config, [field]: value } })
  })
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-bold text-muted-foreground">
        {t(`settings.timer.${field}`)}
      </Label>
      <Input id={id} {...draft} type="number" min={1} max={max} inputMode="numeric" />
    </div>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
    </div>
  )
}

/** Seção "Timer" das configurações: tempos do pomodoro e avisos ao terminar. */
export function TimerSettings() {
  const { t } = useTranslation()
  const config = usePomodoroConfig()
  const { notify, sound, openContent, setNotify, setSound, setOpenContent } = useSettings()

  return (
    <section aria-labelledby="settings-timer" className="flex max-w-xl flex-col gap-4">
      <h2 id="settings-timer" className="text-sm font-medium text-muted-foreground">
        {t('settings.timer.title')}
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl border bg-sidebar p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FIELDS.map(({ key, max }) => (
            <NumberField key={key} field={key} max={max} config={config} />
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t pt-4">
          <Toggle
            id="timer-notify"
            label={t('settings.timer.notify')}
            checked={notify}
            onChange={(value) => {
              setNotify(value)
              if (value) requestNotifyPermission()
            }}
          />
          <Toggle
            id="timer-sound"
            label={t('settings.timer.sound')}
            checked={sound}
            onChange={setSound}
          />
          <Toggle
            id="timer-open"
            label={t('settings.timer.openContent')}
            checked={openContent}
            onChange={setOpenContent}
          />
        </div>
      </div>
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import { Page } from '@/app/layout/Page'
import { AppearanceSettings } from '@/app/pages/AppearanceSettings'
import { DataSettings } from '@/features/importer/DataSettings'
import { PlanningSettings } from '@/features/planner/PlanningSettings'
import { TimerSettings } from '@/features/timer/TimerSettings'
import { UpdateSettings } from '@/features/updates/UpdateSettings'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <Page title={t('settings.title')}>
      <AppearanceSettings />
      <PlanningSettings />
      <TimerSettings />
      <DataSettings />
      <UpdateSettings />
    </Page>
  )
}

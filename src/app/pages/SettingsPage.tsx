import { useTranslation } from 'react-i18next'
import { Page } from '@/app/layout/Page'
import { LANGUAGES, useSettings } from '@/app/settings-store'
import { SegmentedControl } from '@/components/SegmentedControl'
import { DataSettings } from '@/features/importer/DataSettings'
import { TimerSettings } from '@/features/timer/TimerSettings'

export function SettingsPage() {
  const { t } = useTranslation()
  const { theme, density, language, setTheme, setDensity, setLanguage } = useSettings()

  return (
    <Page title={t('settings.title')}>
      <section aria-labelledby="settings-appearance" className="flex max-w-xl flex-col gap-4">
        <h2 id="settings-appearance" className="text-sm font-medium text-muted-foreground">
          {t('settings.appearance')}
        </h2>
        <div className="flex flex-col gap-4 rounded-2xl border bg-sidebar p-4">
          <SegmentedControl
            label={t('settings.theme.label')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'system', label: t('settings.theme.system') },
            ]}
          />
          <SegmentedControl
            label={t('settings.density.label')}
            value={density}
            onChange={setDensity}
            options={[
              { value: 'comfortable', label: t('settings.density.comfortable') },
              { value: 'compact', label: t('settings.density.compact') },
            ]}
          />
          <SegmentedControl
            label={t('settings.language.label')}
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map((value) => ({ value, label: t(`settings.language.${value}`) }))}
          />
        </div>
      </section>
      <TimerSettings />
      <DataSettings />
    </Page>
  )
}

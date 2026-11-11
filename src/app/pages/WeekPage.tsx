import { useTranslation } from 'react-i18next'
import { Page } from '@/app/layout/Page'

export function WeekPage() {
  const { t } = useTranslation()
  return (
    <Page title={t('week.title')}>
      <p className="text-sm text-muted-foreground">{t('week.empty')}</p>
    </Page>
  )
}

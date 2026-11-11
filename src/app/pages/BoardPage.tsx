import { useTranslation } from 'react-i18next'
import { Page } from '@/app/layout/Page'

export function BoardPage() {
  const { t } = useTranslation()
  return (
    <Page title={t('board.title')}>
      <p className="text-sm text-muted-foreground">{t('board.empty')}</p>
    </Page>
  )
}

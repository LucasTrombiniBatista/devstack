import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Mostrado enquanto uma tela carrega, para a área não ficar em branco. */
export function PageFallback() {
  const { t } = useTranslation()
  return (
    <div aria-busy="true" className="flex h-full min-h-40 items-center justify-center">
      <LoaderCircle aria-hidden className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

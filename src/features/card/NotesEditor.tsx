import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cardsRepo } from '@/data/repos'
import type { Card } from '@/data/types'
import { cn } from '@/lib/utils'
import { useDraft } from './useDraft'

const Markdown = lazy(() => import('./Markdown'))

/** Notas do card em Markdown, com abas de escrever e visualizar. Grava ao sair do campo. */
export function NotesEditor({ card, className }: { card: Card; className?: string }) {
  const { t } = useTranslation()
  const notas = useDraft(
    card.notasMd,
    (value) => void cardsRepo.update(card.id, { notasMd: value }),
  )

  return (
    <Tabs defaultValue="write">
      <TabsList>
        <TabsTrigger value="write">{t('card.write')}</TabsTrigger>
        <TabsTrigger value="preview">{t('card.preview')}</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <Textarea
          {...notas}
          aria-label={t('card.notes')}
          placeholder={t('card.notesPlaceholder')}
          className={cn('min-h-40 font-mono text-[0.8125rem]', className)}
        />
      </TabsContent>
      <TabsContent value="preview" className={cn('min-h-40 rounded-lg border p-3', className)}>
        {notas.value.trim() ? (
          <Suspense fallback={null}>
            <Markdown source={notas.value} />
          </Suspense>
        ) : (
          <p className="text-sm text-muted-foreground">{t('card.emptyPreview')}</p>
        )}
      </TabsContent>
    </Tabs>
  )
}

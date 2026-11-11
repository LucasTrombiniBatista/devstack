import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/slider'
import { cardsRepo } from '@/data/repos'
import type { Card, ChecklistItem } from '@/data/types'
import { cardProgress } from './progress'

/** Progresso do card: a checklist manda quando existe; sem ela, a pessoa ajusta a porcentagem. */
export function ProgressEditor({ card, items }: { card: Card; items: ChecklistItem[] }) {
  const { t } = useTranslation()
  const [slider, setSlider] = useState<number | null>(null)
  const done = items.filter((item) => item.feito).length

  if (items.length > 0) {
    const progress = cardProgress(card, { done, total: items.length })
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-1.5 flex-1 rounded-full bg-track">
          <div
            className="h-1.5 rounded-full bg-brand"
            style={{ width: `${progress?.percent ?? 0}%` }}
          />
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          {done}/{items.length}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Slider
        aria-label={t('card.progress')}
        min={0}
        max={100}
        step={5}
        value={[slider ?? card.progresso]}
        onValueChange={([value]) => setSlider(value)}
        onValueCommit={([value]) => {
          setSlider(null)
          void cardsRepo.update(card.id, { progresso: value })
        }}
      />
      <span className="w-10 text-right text-xs font-bold text-muted-foreground">
        {slider ?? card.progresso}%
      </span>
    </div>
  )
}

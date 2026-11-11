import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { planBlocksRepo } from '@/data/repos'
import type { Card, PlanBlock } from '@/data/types'
import { useUi } from '@/app/ui-store'
import { planCard } from './actions'
import { clampStart, DAY_END, defaultDuration, fromMin, SLOTS, toMin } from './time'

type Props = {
  card: Card
  /** Bloco a editar; sem ele, cria um novo. */
  block: PlanBlock | null
  days: string[]
  dayLabel: (day: string) => string
  onClose: () => void
}

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Planejar ou ajustar um bloco pelo teclado: dia, início e fim. */
export function PlanDialog({ card, block, days, dayLabel, onClose }: Props) {
  const { t } = useTranslation()
  const openCard = useUi((state) => state.openCard)
  const [dia, setDia] = useState(block?.dia ?? days[0])
  const [inicio, setInicio] = useState(block ? toMin(block.inicio) : 19 * 60)
  const [fim, setFim] = useState(
    block ? toMin(block.fim) : 19 * 60 + defaultDuration(card.estimativaMin),
  )

  async function save() {
    const dur = Math.max(30, fim - inicio)
    if (block) {
      const start = clampStart(inicio, dur)
      await planBlocksRepo.update(block.id, {
        dia,
        inicio: fromMin(start),
        fim: fromMin(start + dur),
      })
    } else {
      await planCard(card.id, dia, inicio, dur)
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{block ? t('week.editBlock') : t('week.plan')}</DialogTitle>
          <DialogDescription>{card.titulo}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 flex flex-col gap-1.5">
            <Label htmlFor="plan-day">{t('week.day')}</Label>
            <select
              id="plan-day"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              className={selectClass}
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {dayLabel(day)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-start">{t('week.start')}</Label>
              <select
                id="plan-start"
                value={inicio}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setFim(Math.min(DAY_END, next + (fim - inicio)))
                  setInicio(next)
                }}
                className={selectClass}
              >
                {SLOTS.slice(0, -1).map((min) => (
                  <option key={min} value={min}>
                    {fromMin(min)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-end">{t('week.end')}</Label>
              <select
                id="plan-end"
                value={fim}
                onChange={(e) => setFim(Number(e.target.value))}
                className={selectClass}
              >
                {SLOTS.filter((min) => min > inicio).map((min) => (
                  <option key={min} value={min}>
                    {fromMin(min)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {block ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  void planBlocksRepo.remove(block.id)
                  onClose()
                }}
              >
                {t('week.removeBlock')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onClose()
                  openCard(card.id)
                }}
              >
                {t('week.openCard')}
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button onClick={() => void save()}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
import { repeatDays, weekdayOf } from '@/data/recurrence'
import type { Card, PlanBlock } from '@/data/types'
import { useUi } from '@/app/ui-store'
import { cn } from '@/lib/utils'
import { planCard } from './actions'
import { clampStart, DAY_END, defaultDuration, fromMin, SLOTS, toMin } from './time'

type Props = {
  card: Card
  /** Bloco a editar; sem ele, cria um novo. Numa série, é a ocorrência clicada. */
  block: PlanBlock | null
  days: string[]
  dayLabel: (day: string) => string
  onClose: () => void
}

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Segunda a domingo, na ordem da grade. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Planejar ou ajustar um bloco pelo teclado: dia, início, fim e repetição semanal. */
export function PlanDialog({ card, block, days, dayLabel, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const openCard = useUi((state) => state.openCard)
  const [dia, setDia] = useState(block?.dia ?? days[0])
  const [inicio, setInicio] = useState(block ? toMin(block.inicio) : 19 * 60)
  const [fim, setFim] = useState(
    block ? toMin(block.fim) : 19 * 60 + defaultDuration(card.estimativaMin),
  )
  const [repeat, setRepeat] = useState(block?.recorrente ?? false)
  const [weekdays, setWeekdays] = useState<number[]>(() =>
    block?.recorrente ? repeatDays(block) : [weekdayOf(block?.dia ?? days[0])],
  )

  // Nome curto de cada dia da semana no idioma atual (2026-11-01 é um domingo).
  const weekdayName = (weekday: number, style: 'short' | 'long') =>
    new Intl.DateTimeFormat(i18n.language, { weekday: style }).format(
      new Date(2026, 10, 1 + weekday),
    )

  function toggleWeekday(weekday: number) {
    setWeekdays((current) =>
      current.includes(weekday) ? current.filter((d) => d !== weekday) : [...current, weekday],
    )
  }

  async function save() {
    const dur = Math.max(30, fim - inicio)
    const diasSemana = repeat ? [...weekdays].sort() : undefined
    if (block) {
      const start = clampStart(inicio, dur)
      const serie = block.recorrente ? await planBlocksRepo.get(block.id) : block
      await planBlocksRepo.update(block.id, {
        // Série que continua série mantém a data de início; o resto usa o dia escolhido.
        dia: block.recorrente && repeat && serie ? serie.dia : dia,
        inicio: fromMin(start),
        fim: fromMin(start + dur),
        recorrente: repeat,
        diasSemana,
      })
    } else {
      await planCard(card.id, dia, inicio, dur, diasSemana)
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
              onChange={(e) => {
                const next = e.target.value
                // Sem repetição ainda, o dia marcado acompanha o dia escolhido.
                if (!repeat) setWeekdays([weekdayOf(next)])
                setDia(next)
              }}
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
          <div className="col-span-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
                className="size-4 accent-brand"
              />
              {t('week.repeat')}
            </label>
            {repeat && (
              <div role="group" aria-label={t('week.repeatOn')} className="flex gap-1">
                {WEEK_ORDER.map((weekday) => {
                  const on = weekdays.includes(weekday)
                  return (
                    <button
                      key={weekday}
                      type="button"
                      aria-pressed={on}
                      aria-label={weekdayName(weekday, 'long')}
                      onClick={() => toggleWeekday(weekday)}
                      className={cn(
                        'h-8 flex-1 rounded-lg border text-xs font-bold capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        on
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-input text-muted-foreground',
                      )}
                    >
                      {weekdayName(weekday, 'short').replace('.', '')}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {block ? (
            <div className="flex flex-wrap gap-2">
              {block.recorrente ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void planBlocksRepo.skipOccurrence(block.id, block.dia)
                      onClose()
                    }}
                  >
                    {t('week.removeOccurrence')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      void planBlocksRepo.remove(block.id)
                      onClose()
                    }}
                  >
                    {t('week.removeSeries')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => {
                    void planBlocksRepo.remove(block.id)
                    onClose()
                  }}
                >
                  {t('week.removeBlock')}
                </Button>
              )}
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
          <Button disabled={repeat && weekdays.length === 0} onClick={() => void save()}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { Moon, Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Page } from '@/app/layout/Page'
import { useUi } from '@/app/ui-store'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { boardsRepo, cardsRepo, columnsRepo, dailyGoalsRepo, planBlocksRepo } from '@/data/repos'
import type { DailyGoal } from '@/data/types'
import { useDraft } from '@/features/card/useDraft'
import { startFocus } from '@/features/timer/useClock'
import { formatDuration, localDate } from '@/lib/format'
import { daySummary, pendingBlocks, pushPending, type DaySummary } from './actions'
import { useGoalStatus } from './useGoalStatus'
import { parseDay } from './time'

async function loadToday(day: string) {
  const [board] = await boardsRepo.list()
  const [summary, blocks, columns, cards] = await Promise.all([
    daySummary(day),
    planBlocksRepo.listByDays([day]),
    board ? columnsRepo.listByBoard(board.id) : [],
    cardsRepo.list(),
  ])
  const hoje = columns.find((column) => column.papel === 'hoje')
  const byId = new Map(cards.map((card) => [card.id, card]))
  return {
    summary,
    plan: blocks.flatMap((block) => {
      const card = byId.get(block.cardId)
      return card ? [{ block, card }] : []
    }),
    hoje: hoje ? cards.filter((card) => card.columnId === hoje.id) : [],
  }
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-sidebar p-4">
      <h2 className="text-xs font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function GoalPanel({ day, summary }: { day: string; summary: DaySummary }) {
  const { t } = useTranslation()
  const status = useGoalStatus(summary)
  const { tipoMeta, valorMeta } = summary.goal
  const shown = tipoMeta === 'horas' ? String(valorMeta / 60) : String(valorMeta)
  const value = useDraft(shown, (text) => {
    const n = Number.parseFloat(text.replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) return
    void dailyGoalsRepo.setForDay(
      day,
      tipoMeta,
      tipoMeta === 'horas' ? Math.round(n * 60) : Math.round(n),
    )
  })
  const done =
    tipoMeta === 'horas' ? formatDuration(summary.focusMin) : String(summary.cardsDone.length)
  const target = tipoMeta === 'horas' ? formatDuration(valorMeta) : String(valorMeta)

  function changeType(next: DailyGoal['tipoMeta']) {
    void dailyGoalsRepo.setForDay(day, next, next === 'horas' ? 120 : 2)
  }

  return (
    <Panel title={t('today.goal')}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-black" aria-live="polite">
          {status}
        </p>
        <p className="text-sm font-bold text-muted-foreground">
          {t('today.doneOf', { done, target })}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={t('today.goal')}
        aria-valuenow={summary.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex h-2 rounded-full bg-track"
      >
        <div className="h-2 rounded-full bg-brand" style={{ width: `${summary.percent}%` }} />
      </div>
      <div className="flex flex-wrap items-end gap-4 border-t pt-3">
        <SegmentedControl
          label={t('today.goalType')}
          value={tipoMeta}
          onChange={changeType}
          options={[
            { value: 'horas', label: t('today.hours') },
            { value: 'cards', label: t('today.cards') },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-value" className="text-xs font-bold text-muted-foreground">
            {tipoMeta === 'horas' ? t('today.goalHours') : t('today.goalCards')}
          </Label>
          <Input key={tipoMeta} id="goal-value" {...value} inputMode="decimal" className="w-24" />
        </div>
      </div>
    </Panel>
  )
}

function EndDayDialog({ day, onClose }: { day: string; onClose: () => void }) {
  const { t } = useTranslation()
  const data = useLiveQuery(
    async () => ({ summary: await daySummary(day), pending: await pendingBlocks(day) }),
    [day],
  )
  const [moved, setMoved] = useState<number | null>(null)
  const status = useGoalStatus(
    data?.summary ?? {
      focusMin: 0,
      cardsDone: [],
      goal: { tipoMeta: 'horas', valorMeta: 1 },
      faltam: 1,
      percent: 0,
    },
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('today.endDay')}</DialogTitle>
          <DialogDescription>{status}</DialogDescription>
        </DialogHeader>
        {data && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {t('today.summary', {
                time: formatDuration(data.summary.focusMin),
                count: data.summary.cardsDone.length,
              })}
            </p>
            {moved !== null ? (
              <p role="status" className="font-bold">
                {t('today.moved', { count: moved })}
              </p>
            ) : data.pending.length > 0 ? (
              <>
                <p className="font-bold">{t('today.pending', { count: data.pending.length })}</p>
                <ul className="flex flex-col gap-1">
                  {data.pending.map(({ block, card }) => (
                    <li key={block.id} className="flex gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {block.inicio}
                      </span>
                      <span className="min-w-0 truncate">{card.titulo}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>{t('today.nothingPending')}</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('today.close')}
          </Button>
          {moved === null && data && data.pending.length > 0 && (
            <Button onClick={async () => setMoved(await pushPending(day))}>
              {t('today.push', { count: data.pending.length })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Tela Hoje: meta do dia, o que está planejado e o fechamento do dia. */
export function TodayPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const openCard = useUi((state) => state.openCard)
  const [day] = useState(() => localDate(new Date()))
  const data = useLiveQuery(() => loadToday(day), [day])
  const [ending, setEnding] = useState(false)
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseDay(day))

  if (!data) return null

  return (
    <Page title={t('today.title')}>
      <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted-foreground first-letter:uppercase">
          {dateLabel}
        </p>
        <Button variant="outline" onClick={() => setEnding(true)}>
          <Moon aria-hidden />
          {t('today.endDay')}
        </Button>
      </div>

      <div className="grid max-w-3xl gap-4">
        <GoalPanel
          key={`${data.summary.goal.tipoMeta}-${data.summary.goal.valorMeta}`}
          day={day}
          summary={data.summary}
        />

        <Panel title={t('today.plan')}>
          {data.plan.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('today.noPlan')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.plan.map(({ block, card }) => (
                <li key={block.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                    {block.inicio}–{block.fim}
                  </span>
                  <button
                    type="button"
                    onClick={() => openCard(card.id)}
                    className={`min-w-0 flex-1 truncate text-left text-sm font-bold hover:underline ${card.concluidoEm ? 'text-muted-foreground line-through' : ''}`}
                  >
                    {card.titulo}
                  </button>
                  {!card.concluidoEm && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t('today.focusOn', { name: card.titulo })}
                      onClick={async () => {
                        await startFocus(card)
                        void navigate(`/focus/${card.id}`)
                      }}
                    >
                      <Play aria-hidden />
                      {t('timer.start')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('today.column')}>
          {data.hoje.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('today.noCards')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.hoje.map((card) => (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => openCard(card.id)}
                    className="text-left text-sm font-bold hover:underline"
                  >
                    {card.titulo}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {ending && <EndDayDialog day={day} onClose={() => setEnding(false)} />}
    </Page>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { cardsRepo, checklistRepo, sessionsRepo } from '@/data/repos'
import { ChecklistEditor } from '@/features/card/ChecklistEditor'
import { NotesEditor } from '@/features/card/NotesEditor'
import { ProgressEditor } from '@/features/card/ProgressEditor'
import { formatClock, isEngaged, phaseDurationMs } from './engine'
import { spentLabel } from './spent'
import { TimerControls } from './TimerControls'
import { useClock, usePhaseLabel } from './useClock'

async function load(cardId: string | undefined) {
  if (!cardId) return { card: null, items: [], spent: 0 }
  const card = (await cardsRepo.get(cardId)) ?? null
  const [items, sessions] = await Promise.all([
    checklistRepo.listByCard(cardId),
    sessionsRepo.listByCard(cardId),
  ])
  return { card, items, spent: sessions.reduce((sum, session) => sum + session.duracaoMin, 0) }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xs font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Modo foco: só o card, o timer e as notas. O resto da interface some. */
export function FocusPage() {
  const { t } = useTranslation()
  const { cardId } = useParams()
  const data = useLiveQuery(() => load(cardId), [cardId])
  const { state, config, clock } = useClock()
  const mine = isEngaged(state) && state.cardId === (cardId ?? null)
  const phase = usePhaseLabel(mine ? state : null)

  if (data === undefined) return null
  if (cardId && data.card === null) return <Navigate to="/board" replace />
  const { card, items, spent } = data

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 p-3">
        <Button asChild variant="ghost">
          <Link to="/board">
            <ArrowLeft aria-hidden />
            {t('timer.exit')}
          </Link>
        </Button>
        <span className="flex-1" />
        {card?.url && (
          <Button asChild variant="outline">
            <a href={card.url} target="_blank" rel="noreferrer noopener">
              <ExternalLink aria-hidden />
              {t('card.open')}
            </a>
          </Button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 pt-4 pb-12">
        <div className="flex flex-col items-center gap-3 text-center">
          {card && (
            <p className="text-xs font-bold text-muted-foreground">
              {[t(`tipo.${card.tipo}`), card.plataforma, spentLabel(t, spent, card.estimativaMin)]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <h1 className="text-2xl leading-8 font-black tracking-[-0.01em] wrap-anywhere">
            {card ? card.titulo : t('timer.noCard')}
          </h1>
        </div>

        <div className="flex flex-col items-center gap-5 rounded-3xl bg-focus px-6 py-8 text-focus-foreground">
          <p className="text-sm font-extrabold text-focus-muted">{phase}</p>
          <p
            role="timer"
            aria-label={t('timer.clock')}
            className="font-mono text-7xl leading-none font-bold tracking-[-0.02em] tabular-nums"
          >
            {mine ? clock : formatClock(phaseDurationMs('foco', config))}
          </p>
          <div className="dark">
            <TimerControls card={card} state={state} />
          </div>
        </div>

        {card && (
          <>
            <Section title={t('card.progress')}>
              <ProgressEditor card={card} items={items} />
            </Section>
            <Section title={t('card.checklist')}>
              <ChecklistEditor cardId={card.id} items={items} />
            </Section>
            <Section title={t('card.notes')}>
              <NotesEditor key={card.id} card={card} className="min-h-64" />
            </Section>
          </>
        )}
      </main>
    </div>
  )
}

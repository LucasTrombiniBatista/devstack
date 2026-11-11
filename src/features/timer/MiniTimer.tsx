import { useLiveQuery } from 'dexie-react-hooks'
import { Pause, Play, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cardsRepo } from '@/data/repos'
import { isEngaged } from './engine'
import { timer } from './store'
import { useClock, usePhaseLabel } from './useClock'

const iconButton =
  'flex size-7 shrink-0 items-center justify-center rounded-full outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-focus-foreground [&_svg]:size-3.5'

/** Timer resumido que acompanha a pessoa em qualquer tela; some quando não há foco em andamento. */
export function MiniTimer() {
  const { t } = useTranslation()
  const { state, clock } = useClock()
  const phase = usePhaseLabel(state)
  const card = useLiveQuery(
    () => (state.cardId ? cardsRepo.get(state.cardId) : Promise.resolve(undefined)),
    [state.cardId],
  )
  if (!isEngaged(state)) return null

  return (
    <section
      aria-label={t('timer.mini')}
      className="flex shrink-0 items-center gap-1 rounded-full bg-focus py-1 pr-1.5 pl-3 text-focus-foreground md:rounded-2xl md:py-2 md:pr-2"
    >
      <Link
        to={state.cardId ? `/focus/${state.cardId}` : '/focus'}
        title={t('timer.openFocus')}
        className="flex min-w-0 flex-1 flex-col rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus-foreground"
      >
        <span className="font-mono text-sm leading-5 font-bold tracking-[-0.02em] tabular-nums md:text-lg md:leading-6">
          {clock}
        </span>
        <span className="hidden truncate text-xs font-bold text-focus-muted md:block">
          {phase}
          {card ? ` · ${card.titulo}` : ''}
        </span>
      </Link>
      {state.status === 'running' ? (
        <button
          type="button"
          aria-label={t('timer.pause')}
          title={t('timer.pause')}
          onClick={() => timer.pause()}
          className={iconButton}
        >
          <Pause aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          aria-label={state.status === 'paused' ? t('timer.resume') : t('timer.start')}
          title={state.status === 'paused' ? t('timer.resume') : t('timer.start')}
          onClick={() => void timer.resume()}
          className={iconButton}
        >
          <Play aria-hidden />
        </button>
      )}
      <button
        type="button"
        aria-label={t('timer.stop')}
        title={t('timer.stop')}
        onClick={() => void timer.stop()}
        className={iconButton}
      >
        <Square aria-hidden />
      </button>
    </section>
  )
}

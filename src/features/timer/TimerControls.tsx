import { Pause, Play, SkipForward, Square, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { Card } from '@/data/types'
import { isEngaged, type TimerState } from './engine'
import { timer } from './store'
import { startFocus } from './useClock'

type Props = {
  /** Card desta tela; `null` para o foco sem card. */
  card: Pick<Card, 'id' | 'url'> | null
  state: TimerState
}

/** Botões do timer para um card: iniciar, pausar, continuar, pular e encerrar. */
export function TimerControls({ card, state }: Props) {
  const { t } = useTranslation()
  const mine = isEngaged(state) && state.cardId === (card?.id ?? null)

  if (!mine) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="lg" onClick={() => void startFocus(card)}>
          <Play aria-hidden />
          {t('timer.start')}
        </Button>
        <Button size="lg" variant="outline" onClick={() => void startFocus(card, 'livre')}>
          <Timer aria-hidden />
          {t('timer.stopwatch')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {state.status === 'running' ? (
        <Button size="lg" onClick={() => timer.pause()}>
          <Pause aria-hidden />
          {t('timer.pause')}
        </Button>
      ) : (
        <Button size="lg" onClick={() => void timer.resume()}>
          <Play aria-hidden />
          {state.status === 'paused' ? t('timer.resume') : t('timer.start')}
        </Button>
      )}
      {state.status !== 'idle' && state.mode === 'pomodoro' && (
        <Button size="lg" variant="outline" onClick={() => void timer.skip()}>
          <SkipForward aria-hidden />
          {state.phase === 'foco' ? t('timer.skipToBreak') : t('timer.skipBreak')}
        </Button>
      )}
      <Button size="lg" variant="outline" onClick={() => void timer.stop()}>
        <Square aria-hidden />
        {t('timer.stop')}
      </Button>
    </div>
  )
}

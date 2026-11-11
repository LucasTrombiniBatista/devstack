import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_NAME } from '@/lib/constants'
import { announce } from './notify'
import { timer, useTimer } from './store'
import { useClock } from './useClock'

/**
 * Mantém o timer andando em qualquer tela: fecha a fase quando o tempo acaba, avisa a
 * pessoa e mostra a contagem no título da aba. Não desenha nada.
 */
export function TimerRunner() {
  const { t } = useTranslation()
  const { state, clock } = useClock()
  const running = state.status === 'running'

  useEffect(() => {
    if (!running) return
    async function check() {
      const ended = await timer.tick()
      if (ended === 'foco') announce(t('timer.done.focus'), t('timer.done.focusBody'))
      else if (ended) announce(t('timer.done.break'), t('timer.done.breakBody'))
    }
    void check()
    // Em segundo plano o navegador espaça o intervalo; ao voltar, confere na hora.
    const id = setInterval(() => void check(), 1000)
    const onVisible = () => void check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [running, t])

  // Outra aba mexeu no timer: acompanha.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === useTimer.persist.getOptions().name) void useTimer.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    document.title = state.status === 'idle' ? APP_NAME : `${clock} · ${APP_NAME}`
  }, [state.status, clock])

  return null
}

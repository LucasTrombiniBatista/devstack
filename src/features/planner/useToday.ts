import { useEffect, useState } from 'react'
import { localDate } from '@/lib/format'

/** Milissegundos até a próxima meia-noite local, com folga para não cair antes dela. */
function msUntilMidnight(now: Date): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime() + 500
}

/**
 * Dia local de hoje (YYYY-MM-DD) que se atualiza sozinho: na virada da meia-noite
 * e quando a janela volta a ficar visível (o timer pode atrasar com a aba suspensa).
 */
export function useToday(): string {
  const [day, setDay] = useState(() => localDate(new Date()))

  useEffect(() => {
    const refresh = () => setDay(localDate(new Date()))
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        refresh()
        schedule()
      }, msUntilMidnight(new Date()))
    }
    schedule()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return day
}

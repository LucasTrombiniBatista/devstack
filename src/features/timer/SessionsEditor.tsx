import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sessionsRepo } from '@/data/repos'
import type { Session } from '@/data/types'
import { useDraft } from '@/features/card/useDraft'
import { formatDuration, localDate, withLocalDate } from '@/lib/format'

function parseMinutes(text: string): number | null {
  const value = Math.round(Number.parseFloat(text.replace(',', '.')))
  return Number.isFinite(value) && value > 0 ? value : null
}

function SessionRow({ session }: { session: Session }) {
  const { t, i18n } = useTranslation()
  const inicio = new Date(session.inicio)
  const minutes = useDraft(String(session.duracaoMin), (text) => {
    const value = parseMinutes(text)
    if (value) void sessionsRepo.reschedule(session.id, inicio, value)
  })
  const dateLabel = inicio.toLocaleDateString(i18n.language)

  return (
    <li className="flex items-center gap-2">
      <Input
        type="date"
        aria-label={t('sessions.date')}
        value={localDate(inicio)}
        onChange={(event) => {
          if (!event.target.value) return
          void sessionsRepo.reschedule(
            session.id,
            withLocalDate(inicio, event.target.value),
            session.duracaoMin,
          )
        }}
        className="min-w-0 flex-1"
      />
      <Input
        {...minutes}
        type="number"
        min={1}
        aria-label={t('sessions.minutes')}
        className="w-20"
      />
      <span className="w-14 text-xs font-bold text-muted-foreground">
        {t(`sessions.origin.${session.origem}`)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('sessions.remove', { date: dateLabel })}
        onClick={() => void sessionsRepo.remove(session.id)}
      >
        <X aria-hidden />
      </Button>
    </li>
  )
}

/** Sessões de estudo do card: as do timer aparecem sozinhas; dá para lançar e corrigir à mão. */
export function SessionsEditor({ cardId }: { cardId: string }) {
  const { t } = useTranslation()
  const sessions = useLiveQuery(() => sessionsRepo.listByCard(cardId), [cardId]) ?? []
  const [day, setDay] = useState(() => localDate(new Date()))
  const [minutes, setMinutes] = useState('')
  const total = sessions.reduce((sum, session) => sum + session.duracaoMin, 0)

  function add(event: FormEvent) {
    event.preventDefault()
    const value = parseMinutes(minutes)
    if (!value || !day) return
    const now = new Date()
    // Hoje: a sessão acabou agora. Outro dia: sem hora conhecida, fica ao meio-dia.
    const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
    const inicio =
      day === localDate(now) ? new Date(now.getTime() - value * 60_000) : withLocalDate(noon, day)
    void sessionsRepo.createManual(cardId, inicio, value)
    setMinutes('')
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('sessions.empty')}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </ul>
          <p className="text-xs font-bold text-muted-foreground">
            {t('sessions.total', { total: formatDuration(total) })}
          </p>
        </>
      )}
      <form onSubmit={add} className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t('sessions.newDate')}
          value={day}
          onChange={(event) => setDay(event.target.value)}
          className="min-w-0 flex-1"
        />
        <Input
          type="number"
          min={1}
          aria-label={t('sessions.newMinutes')}
          placeholder={t('sessions.minutesPlaceholder')}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="w-24"
        />
        <Button type="submit" variant="outline" disabled={parseMinutes(minutes) === null}>
          <Plus aria-hidden />
          {t('sessions.add')}
        </Button>
      </form>
    </div>
  )
}

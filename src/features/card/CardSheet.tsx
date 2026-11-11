import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink, Focus, Play, Timer, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useUi } from '@/app/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cardsRepo, checklistRepo, columnsRepo, sessionsRepo, tracksRepo } from '@/data/repos'
import type { Card, CardPrioridade, CardTipo, ChecklistItem, Column, Track } from '@/data/types'
import { PRIORIDADES, TIPOS } from '@/features/card/options'
import { isEngaged } from '@/features/timer/engine'
import { SessionsEditor } from '@/features/timer/SessionsEditor'
import { spentLabel } from '@/features/timer/spent'
import { useTimer } from '@/features/timer/store'
import { startFocus } from '@/features/timer/useClock'
import { TrackDot } from '@/features/tracks/TrackDot'
import { parseTags } from '@/lib/format'
import { ChecklistEditor } from './ChecklistEditor'
import { LinksEditor } from './LinksEditor'
import { NotesEditor } from './NotesEditor'
import { ProgressEditor } from './ProgressEditor'
import { useDraft } from './useDraft'

const NONE = '__none'

type Loaded = { card: Card; columns: Column[]; tracks: Track[]; items: ChecklistItem[] }

async function load(id: string): Promise<Loaded | null> {
  const card = await cardsRepo.get(id)
  if (!card) return null
  const [columns, tracks, items] = await Promise.all([
    columnsRepo.listByBoard(card.boardId),
    tracksRepo.listSorted(),
    checklistRepo.listByCard(id),
  ])
  return { card, columns, tracks, items }
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-bold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-xs font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Tempo estudado no card e os botões que ligam o timer e levam ao modo foco. */
function FocusBar({ card }: { card: Card }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const closeCard = useUi((state) => state.closeCard)
  const active = useTimer((state) => isEngaged(state) && state.cardId === card.id)
  const spent = useLiveQuery(
    async () => (await sessionsRepo.listByCard(card.id)).reduce((sum, s) => sum + s.duracaoMin, 0),
    [card.id],
  )

  function go(mode?: 'pomodoro' | 'livre') {
    if (mode) void startFocus(card, mode)
    closeCard()
    void navigate(`/focus/${card.id}`)
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-well p-2.5">
      <span className="px-1 text-sm font-bold">
        {spent
          ? t('timer.studied', { time: spentLabel(t, spent, card.estimativaMin) })
          : t('timer.noTime')}
      </span>
      {active ? (
        <Button onClick={() => go()}>
          <Focus aria-hidden />
          {t('timer.openFocus')}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => go('pomodoro')}>
            <Play aria-hidden />
            {t('timer.start')}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => go('livre')}>
            <Timer aria-hidden />
            {t('timer.stopwatch')}
          </Button>
        </div>
      )}
    </div>
  )
}

function CardForm({ card, columns, tracks, items }: Loaded) {
  const { t } = useTranslation()
  const closeCard = useUi((state) => state.closeCard)
  const [confirming, setConfirming] = useState(false)
  const save = (patch: Parameters<typeof cardsRepo.update>[1]) =>
    void cardsRepo.update(card.id, patch)

  // Card recém-criado abre com o título vazio e em foco: é só digitar por cima.
  const untitled = card.titulo === t('card.untitled')
  const titulo = useDraft(untitled ? '' : card.titulo, (value) => {
    if (value.trim()) save({ titulo: value.trim() })
  })
  const url = useDraft(card.url ?? '', (value) => save({ url: value.trim() || null }))
  const plataforma = useDraft(card.plataforma ?? '', (value) =>
    save({ plataforma: value.trim() || null }),
  )
  const tags = useDraft(card.tags.map((tag) => `#${tag}`).join(' '), (value) =>
    save({ tags: parseTags(value) }),
  )
  const estimativa = useDraft(
    card.estimativaMin === null ? '' : String(card.estimativaMin / 60),
    (value) => {
      const hours = Number.parseFloat(value.replace(',', '.'))
      save({ estimativaMin: Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null })
    },
  )

  const column = columns.find((c) => c.id === card.columnId)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
      <div className="flex flex-col gap-3 pr-8">
        <SheetTitle asChild>
          <h2>
            <textarea
              {...titulo}
              rows={1}
              aria-label={t('card.title')}
              autoFocus={untitled}
              placeholder={t('card.untitled')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
              }}
              className="field-sizing-content w-full resize-none rounded-md bg-transparent text-xl leading-7 font-black tracking-[-0.01em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </h2>
        </SheetTitle>
        <SheetDescription className="sr-only">{t('card.details')}</SheetDescription>
        {card.miniaturaUrl && (
          <img
            src={card.miniaturaUrl}
            alt=""
            loading="lazy"
            onError={(event) => (event.currentTarget.hidden = true)}
            className="aspect-video w-full rounded-xl border object-cover"
          />
        )}
        <div className="flex items-center gap-2">
          <Input
            {...url}
            type="url"
            aria-label={t('card.link')}
            placeholder="https://"
            className="min-w-0 flex-1"
          />
          {card.url && (
            <Button asChild>
              <a href={card.url} target="_blank" rel="noreferrer noopener">
                <ExternalLink aria-hidden />
                {t('card.open')}
              </a>
            </Button>
          )}
        </div>
      </div>

      <FocusBar card={card} />

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('card.column')}>
          <Select
            value={card.columnId}
            onValueChange={(columnId) => void cardsRepo.move(card.id, columnId, Infinity)}
          >
            <SelectTrigger aria-label={t('card.column')} className="w-full">
              <SelectValue>{column?.nome}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('card.track')}>
          <Select
            value={card.trackId ?? NONE}
            onValueChange={(value) => save({ trackId: value === NONE ? null : value })}
          >
            <SelectTrigger aria-label={t('card.track')} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('board.noTrack')}</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  <TrackDot cor={track.cor} className="size-2.5" />
                  {track.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('card.type')}>
          <Select value={card.tipo} onValueChange={(tipo) => save({ tipo: tipo as CardTipo })}>
            <SelectTrigger aria-label={t('card.type')} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {t(`tipo.${tipo}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('card.priority')}>
          <Select
            value={card.prioridade}
            onValueChange={(prioridade) => save({ prioridade: prioridade as CardPrioridade })}
          >
            <SelectTrigger aria-label={t('card.priority')} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADES.map((prioridade) => (
                <SelectItem key={prioridade} value={prioridade}>
                  {t(`prioridade.${prioridade}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('card.platform')} htmlFor="card-platform">
          <Input id="card-platform" {...plataforma} placeholder="Alura, DIO, YouTube" />
        </Field>
        <Field label={t('card.estimate')} htmlFor="card-estimate">
          <Input id="card-estimate" {...estimativa} inputMode="decimal" placeholder="?" />
        </Field>
        <Field label={t('card.dueDate')} htmlFor="card-due">
          <Input
            id="card-due"
            type="date"
            value={card.dataAlvo ?? ''}
            onChange={(event) => save({ dataAlvo: event.target.value || null })}
          />
        </Field>
        <Field label={t('card.tags')} htmlFor="card-tags">
          <Input id="card-tags" {...tags} placeholder="#java #spring" className="font-mono" />
        </Field>
      </div>

      <Section title={t('card.progress')}>
        <ProgressEditor card={card} items={items} />
      </Section>

      <Section title={t('card.checklist')}>
        <ChecklistEditor cardId={card.id} items={items} />
      </Section>

      <Section title={t('card.notes')}>
        <NotesEditor card={card} />
      </Section>

      <Section title={t('sessions.title')}>
        <SessionsEditor cardId={card.id} />
      </Section>

      <Section title={t('card.extraLinks')}>
        <LinksEditor links={card.links} onChange={(links) => save({ links })} />
      </Section>

      <div className="mt-auto flex items-center gap-2 border-t pt-4">
        {confirming ? (
          <>
            <span className="flex-1 text-sm font-bold">{t('card.deleteConfirm')}</span>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                closeCard()
                void cardsRepo.remove(card.id)
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden />
            {t('card.delete')}
          </Button>
        )}
      </div>
    </div>
  )
}

/** Painel lateral com o detalhe do card aberto. Cada campo grava sozinho ao sair dele. */
export function CardSheet() {
  const openCardId = useUi((state) => state.openCardId)
  const closeCard = useUi((state) => state.closeCard)
  const data = useLiveQuery(
    () => (openCardId ? load(openCardId) : Promise.resolve(null)),
    [openCardId],
  )

  return (
    <Sheet open={openCardId !== null} onOpenChange={(open) => !open && closeCard()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        {data && data.card.id === openCardId && <CardForm key={data.card.id} {...data} />}
      </SheetContent>
    </Sheet>
  )
}

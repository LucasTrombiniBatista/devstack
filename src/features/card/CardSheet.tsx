import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink, Trash2 } from 'lucide-react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cardsRepo, checklistRepo, columnsRepo, tracksRepo } from '@/data/repos'
import type { Card, CardPrioridade, CardTipo, ChecklistItem, Column, Track } from '@/data/types'
import { PRIORIDADES, TIPOS } from '@/features/card/options'
import { TrackDot } from '@/features/tracks/TrackDot'
import { parseTags } from '@/lib/format'
import { ChecklistEditor } from './ChecklistEditor'
import { LinksEditor } from './LinksEditor'
import { cardProgress } from './progress'
import { useDraft } from './useDraft'

const Markdown = lazy(() => import('./Markdown'))
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

function CardForm({ card, columns, tracks, items }: Loaded) {
  const { t } = useTranslation()
  const closeCard = useUi((state) => state.closeCard)
  const [confirming, setConfirming] = useState(false)
  const [slider, setSlider] = useState<number | null>(null)
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
  const notas = useDraft(card.notasMd, (value) => save({ notasMd: value }))

  const done = items.filter((item) => item.feito).length
  const progress = cardProgress(card, { done, total: items.length })
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
        {items.length > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex h-1.5 flex-1 rounded-full bg-track">
              <div
                className="h-1.5 rounded-full bg-brand"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {done}/{items.length}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Slider
              aria-label={t('card.progress')}
              min={0}
              max={100}
              step={5}
              value={[slider ?? card.progresso]}
              onValueChange={([value]) => setSlider(value)}
              onValueCommit={([value]) => {
                setSlider(null)
                save({ progresso: value })
              }}
            />
            <span className="w-10 text-right text-xs font-bold text-muted-foreground">
              {slider ?? card.progresso}%
            </span>
          </div>
        )}
      </Section>

      <Section title={t('card.checklist')}>
        <ChecklistEditor cardId={card.id} items={items} />
      </Section>

      <Section title={t('card.notes')}>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">{t('card.write')}</TabsTrigger>
            <TabsTrigger value="preview">{t('card.preview')}</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              {...notas}
              aria-label={t('card.notes')}
              placeholder={t('card.notesPlaceholder')}
              className="min-h-40 font-mono text-[0.8125rem]"
            />
          </TabsContent>
          <TabsContent value="preview" className="min-h-40 rounded-lg border p-3">
            {notas.value.trim() ? (
              <Suspense fallback={null}>
                <Markdown source={notas.value} />
              </Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">{t('card.emptyPreview')}</p>
            )}
          </TabsContent>
        </Tabs>
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

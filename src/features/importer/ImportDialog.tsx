import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useUi } from '@/app/ui-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { boardsRepo } from '@/data/repos'
import { formatDuration } from '@/lib/format'
import { applyImport, planImport } from './apply'
import { parseImport } from './parse'

function ImportForm({ initialText }: { initialText: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const closeImport = useUi((state) => state.closeImport)
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseImport(text), [text])
  const plan = useLiveQuery(async () => {
    const [board] = await boardsRepo.list()
    if (!board) return null
    return { boardId: board.id, ...(await planImport(parsed.cards, board.id)) }
  }, [parsed])

  const novos = useMemo(() => plan?.novos ?? [], [plan])
  const groups = useMemo(() => {
    const map = new Map<string, typeof novos>()
    for (const card of novos) {
      const key = card.trilha ?? ''
      map.set(key, [...(map.get(key) ?? []), card])
    }
    return [...map]
  }, [novos])

  async function confirm() {
    if (!plan || novos.length === 0) return
    setBusy(true)
    try {
      await applyImport(novos, plan.boardId)
      closeImport()
      void navigate('/board')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('import.title')}</DialogTitle>
        <DialogDescription>{t('import.hint')}</DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            {t('import.openFile')}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            aria-label={t('import.openFile')}
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) setText(await file.text())
              event.target.value = ''
            }}
          />
          <span className="text-xs font-semibold text-muted-foreground">{t('import.orPaste')}</span>
        </div>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={t('import.text')}
          placeholder={'- [ ] [Título](https://...) · Alura · 8h · #java\nhttps://...'}
          className="max-h-40 min-h-24 font-mono text-xs"
        />

        <p role="status" className="text-sm font-bold">
          {parsed.cards.length === 0
            ? t('import.empty')
            : t('import.summary', {
                count: novos.length,
                trilhas: new Set(novos.map((card) => card.trilha).filter(Boolean)).size,
              })}
          {plan && plan.repetidos > 0 && (
            <span className="font-semibold text-muted-foreground">
              {' '}
              {t('import.repeated', { count: plan.repetidos })}
            </span>
          )}
        </p>

        {novos.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
            {groups.map(([trilha, cards]) => (
              <section key={trilha} aria-label={trilha || t('board.noTrack')}>
                <h3 className="sticky top-0 bg-popover px-3 py-1.5 text-[0.6875rem] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">
                  {trilha || t('board.noTrack')} · {cards.length}
                </h3>
                <ul>
                  {cards.map((card, index) => (
                    <li
                      key={`${card.titulo}-${index}`}
                      className="flex items-baseline gap-2 border-t px-3 py-1.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-bold">{card.titulo}</span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {[
                          card.plataforma ?? t(`tipo.${card.tipo}`),
                          card.estimativaMin === null ? null : formatDuration(card.estimativaMin),
                          card.checklist.length > 0
                            ? t('import.items', { count: card.checklist.length })
                            : null,
                          card.feito ? t('import.done') : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={closeImport}>
          {t('common.cancel')}
        </Button>
        <Button type="button" disabled={busy || novos.length === 0} onClick={() => void confirm()}>
          {t('import.confirm', { count: novos.length })}
        </Button>
      </DialogFooter>
    </>
  )
}

/** Colar ou abrir uma lista e ver o que vai entrar antes de confirmar. */
export function ImportDialog() {
  const importText = useUi((state) => state.importText)
  const closeImport = useUi((state) => state.closeImport)

  return (
    <Dialog open={importText !== null} onOpenChange={(open) => !open && closeImport()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
        {importText !== null && <ImportForm initialText={importText} />}
      </DialogContent>
    </Dialog>
  )
}

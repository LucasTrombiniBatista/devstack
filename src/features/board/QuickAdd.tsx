import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { createCardFromText } from '@/features/capture/capture'
import { cn } from '@/lib/utils'

type Props = {
  boardId: string
  columnId: string
  trackId: string | null
  /** Fica sempre visível; nas outras colunas só aparece ao passar o mouse ou focar. */
  prominent: boolean
}

/** Criação rápida no fim da coluna: digita, Enter, e já pode digitar o próximo. */
export function QuickAdd({ boardId, columnId, trackId, prominent }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    setText('')
    await createCardFromText(value, { boardId, columnId, trackId }, 'fim')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-9 shrink-0 items-center gap-2 rounded-xl border-[1.5px] border-dashed border-dash px-3 text-[0.8125rem] font-bold text-muted-foreground outline-none',
          'transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring',
          !prominent && 'opacity-0 group-hover/column:opacity-100',
        )}
      >
        <Plus aria-hidden className="size-3.5" />
        {t('board.addCard')}
      </button>
    )
  }

  return (
    <form onSubmit={submit}>
      <input
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => !text.trim() && setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setText('')
            setOpen(false)
          }
        }}
        aria-label={t('board.addCard')}
        placeholder={t('board.addCardPlaceholder')}
        className="h-9 w-full rounded-xl border-[1.5px] border-ring bg-transparent px-3 text-[0.8125rem] font-bold outline-none placeholder:text-muted-foreground"
      />
    </form>
  )
}

import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { checklistRepo } from '@/data/repos'
import type { ChecklistItem } from '@/data/types'
import { cn } from '@/lib/utils'
import { useDraft } from './useDraft'

function Item({ item }: { item: ChecklistItem }) {
  const { t } = useTranslation()
  const text = useDraft(item.texto, (texto) => {
    if (texto.trim()) void checklistRepo.update(item.id, { texto: texto.trim() })
    else void checklistRepo.remove(item.id)
  })

  return (
    <li className="group/item flex items-center gap-2">
      <Checkbox
        checked={item.feito}
        aria-label={item.texto}
        onCheckedChange={(checked) =>
          void checklistRepo.update(item.id, { feito: checked === true })
        }
      />
      <input
        {...text}
        aria-label={t('card.itemText')}
        className={cn(
          'h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
          item.feito && 'text-muted-foreground line-through',
        )}
      />
      <button
        type="button"
        aria-label={t('card.removeItem', { name: item.texto })}
        onClick={() => void checklistRepo.remove(item.id)}
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none group-hover/item:opacity-100 hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </li>
  )
}

export function ChecklistEditor({ cardId, items }: { cardId: string; items: ChecklistItem[] }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  async function add(event: FormEvent) {
    event.preventDefault()
    const texto = text.trim()
    if (!texto) return
    setText('')
    await checklistRepo.create({ cardId, texto })
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </ul>
      )}
      <form onSubmit={add}>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={t('card.addItem')}
          placeholder={t('card.addItem')}
        />
      </form>
    </div>
  )
}

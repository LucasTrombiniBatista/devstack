import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { columnsRepo } from '@/data/repos'
import type { Column } from '@/data/types'

type Props = {
  boardId: string
  /** Coluna em edição; sem ela, o diálogo cria uma nova. */
  column: Column | null
  onClose: () => void
}

export function ColumnDialog({ boardId, column, onClose }: Props) {
  const { t } = useTranslation()
  const [nome, setNome] = useState(column?.nome ?? '')
  const [wip, setWip] = useState(column?.limiteWip?.toString() ?? '')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const name = nome.trim()
    if (!name) return
    const parsed = Number.parseInt(wip, 10)
    const limiteWip = Number.isFinite(parsed) && parsed > 0 ? parsed : null
    if (column) await columnsRepo.update(column.id, { nome: name, limiteWip })
    else await columnsRepo.create({ boardId, nome: name, limiteWip })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{column ? t('column.edit') : t('column.create')}</DialogTitle>
            <DialogDescription>{t('column.wipHint')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="column-name">{t('column.name')}</Label>
            <Input
              id="column-name"
              autoFocus
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="column-wip">{t('column.wipLimit')}</Label>
            <Input
              id="column-wip"
              type="number"
              min={1}
              inputMode="numeric"
              value={wip}
              onChange={(event) => setWip(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

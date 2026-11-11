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
import { tracksRepo } from '@/data/repos'
import type { Track } from '@/data/types'
import { useBoardView } from '@/features/board/filters'
import { cn } from '@/lib/utils'
import { TRACK_COLORS } from './colors'
import { TrackDot } from './TrackDot'

type Props = {
  /** Trilha em edição; sem ela, o diálogo cria uma nova. */
  track: Track | null
  onClose: () => void
}

export function TrackDialog({ track, onClose }: Props) {
  const { t } = useTranslation()
  const [nome, setNome] = useState(track?.nome ?? '')
  const [cor, setCor] = useState<string>(track?.cor ?? TRACK_COLORS[0])
  const [metaData, setMetaData] = useState(track?.metaData ?? '')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const name = nome.trim()
    if (!name) return
    const data = { nome: name, cor, metaData: metaData || null }
    if (track) await tracksRepo.update(track.id, data)
    else await tracksRepo.create(data)
    onClose()
  }

  async function remove() {
    if (!track) return
    const view = useBoardView.getState()
    if (view.trackId === track.id) view.setTrack(null)
    await tracksRepo.removeAndDetach(track.id)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{track ? t('tracks.edit') : t('tracks.add')}</DialogTitle>
            <DialogDescription>{t('tracks.hint')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="track-name">{t('tracks.name')}</Label>
            <Input
              id="track-name"
              autoFocus
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t('tracks.color')}</legend>
            <div className="flex gap-2">
              {TRACK_COLORS.map((color) => (
                <label
                  key={color}
                  title={t(`tracks.colors.${color}`)}
                  className={cn(
                    'flex size-8 cursor-pointer items-center justify-center rounded-full border-2 has-focus-visible:ring-2 has-focus-visible:ring-ring',
                    cor === color ? 'border-foreground' : 'border-transparent',
                  )}
                >
                  <input
                    type="radio"
                    name="track-color"
                    className="sr-only"
                    value={color}
                    checked={cor === color}
                    onChange={() => setCor(color)}
                    aria-label={t(`tracks.colors.${color}`)}
                  />
                  <TrackDot cor={color} className="size-5" />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor="track-goal">{t('tracks.goalDate')}</Label>
            <Input
              id="track-goal"
              type="date"
              value={metaData}
              onChange={(event) => setMetaData(event.target.value)}
            />
          </div>
          <DialogFooter>
            {track && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto"
                onClick={() => void remove()}
              >
                {t('common.delete')}
              </Button>
            )}
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

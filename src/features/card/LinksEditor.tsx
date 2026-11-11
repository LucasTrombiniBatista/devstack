import { ExternalLink, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CardLink } from '@/data/types'

type Props = {
  links: CardLink[]
  onChange: (links: CardLink[]) => void
}

/** Links adicionais do card, além do link principal. */
export function LinksEditor({ links, onChange }: Props) {
  const { t } = useTranslation()
  const [titulo, setTitulo] = useState('')
  const [url, setUrl] = useState('')

  function add(event: FormEvent) {
    event.preventDefault()
    const href = url.trim()
    if (!href) return
    onChange([...links, { titulo: titulo.trim() || href, url: href }])
    setTitulo('')
    setUrl('')
  }

  return (
    <div className="flex flex-col gap-2">
      {links.length > 0 && (
        <ul className="flex flex-col gap-1">
          {links.map((link, index) => (
            <li key={`${link.url}-${index}`} className="flex items-center gap-2">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-bold text-brand underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{link.titulo}</span>
              </a>
              <button
                type="button"
                aria-label={t('card.removeItem', { name: link.titulo })}
                onClick={() => onChange(links.filter((_, i) => i !== index))}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <Input
          className="min-w-32 flex-1"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          aria-label={t('card.linkTitle')}
          placeholder={t('card.linkTitle')}
        />
        <Input
          className="min-w-32 flex-1"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-label={t('card.linkUrl')}
          placeholder="https://"
        />
        <Button type="submit" variant="outline">
          {t('card.addLink')}
        </Button>
      </form>
    </div>
  )
}

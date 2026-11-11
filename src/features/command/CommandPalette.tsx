import { useLiveQuery } from 'dexie-react-hooks'
import {
  CalendarDays,
  Columns3,
  FileDown,
  Link2,
  ListPlus,
  Plus,
  Settings,
  SunMoon,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useSettings } from '@/app/settings-store'
import { useUi } from '@/app/ui-store'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cardsRepo } from '@/data/repos'
import { EMPTY_FILTERS, matchesFilters } from '@/features/board/filters'
import { captureTarget, createCardFromText } from '@/features/capture/capture'
import { startFocus } from '@/features/timer/useClock'
import { isUrl, normalizeText } from '@/lib/format'

type Action = { id: string; label: string; icon: LucideIcon; run: () => void | Promise<void> }

const MAX_CARDS = 8

/** Paleta de comandos: criar card a partir do que foi digitado ou colado, navegar e achar cards. */
export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const open = useUi((state) => state.paletteOpen)
  const setOpen = useUi((state) => state.setPaletteOpen)
  const openCard = useUi((state) => state.openCard)
  const openImport = useUi((state) => state.openImport)
  const [query, setQuery] = useState('')
  const cards = useLiveQuery(() => (open ? cardsRepo.list() : Promise.resolve([])), [open])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!useUi.getState().paletteOpen)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setOpen])

  function close() {
    setOpen(false)
    setQuery('')
  }

  const text = query.trim()

  async function createFromQuery() {
    const target = await captureTarget()
    if (!target) return
    const value = text
    close()
    void navigate('/board')
    const card = await createCardFromText(value || t('card.untitled'), target)
    // Sem texto, abre o detalhe para a pessoa preencher.
    if (!value) openCard(card.id)
  }

  const actions: Action[] = [
    { id: 'new', label: t('board.newCard'), icon: Plus, run: createFromQuery },
    {
      id: 'import',
      label: t('import.title'),
      icon: ListPlus,
      run: () => openImport(),
    },
    {
      id: 'focus',
      label: t('timer.startNoCard'),
      icon: Timer,
      run: async () => {
        await startFocus(null)
        void navigate('/focus')
      },
    },
    {
      id: 'board',
      label: t('command.goTo', { page: t('nav.board') }),
      icon: Columns3,
      run: () => void navigate('/board'),
    },
    {
      id: 'week',
      label: t('command.goTo', { page: t('nav.week') }),
      icon: CalendarDays,
      run: () => void navigate('/week'),
    },
    {
      id: 'settings',
      label: t('command.goTo', { page: t('nav.settings') }),
      icon: Settings,
      run: () => void navigate('/settings'),
    },
    {
      id: 'export',
      label: t('command.export'),
      icon: FileDown,
      run: () => void navigate('/settings'),
    },
    {
      id: 'theme',
      label: t('command.toggleTheme'),
      icon: SunMoon,
      run: () => {
        const dark = document.documentElement.classList.contains('dark')
        useSettings.getState().setTheme(dark ? 'light' : 'dark')
      },
    },
  ]

  const needle = normalizeText(text)
  const shownActions = needle
    ? actions.filter(
        (action) => action.id !== 'new' && normalizeText(action.label).includes(needle),
      )
    : actions
  const shownCards = useMemo(
    () =>
      text
        ? (cards ?? [])
            .filter((card) => matchesFilters(card, { ...EMPTY_FILTERS, search: text }))
            .slice(0, MAX_CARDS)
        : [],
    [cards, text],
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      title={t('command.title')}
      description={t('command.hint')}
    >
      <Command shouldFilter={false} loop>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t('command.placeholder')}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text/plain')
            if (
              pasted
                .trim()
                .split(/\r?\n/)
                .filter((line) => line.trim()).length > 1
            ) {
              event.preventDefault()
              setQuery('')
              openImport(pasted)
            }
          }}
        />
        <CommandList>
          <CommandEmpty>{t('command.empty')}</CommandEmpty>
          {text && (
            <CommandGroup heading={t('command.create')}>
              <CommandItem value="create-from-query" onSelect={() => void createFromQuery()}>
                {isUrl(text) ? <Link2 aria-hidden /> : <Plus aria-hidden />}
                <span className="truncate">
                  {isUrl(text)
                    ? t('command.createFromLink', { link: text })
                    : t('command.createNamed', { name: text })}
                </span>
              </CommandItem>
            </CommandGroup>
          )}
          {shownCards.length > 0 && (
            <CommandGroup heading={t('command.cards')}>
              {shownCards.map((card) => (
                <CommandItem
                  key={card.id}
                  value={`card-${card.id}`}
                  onSelect={() => {
                    close()
                    void navigate('/board')
                    openCard(card.id)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{card.titulo}</span>
                  {card.tags.length > 0 && (
                    <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground">
                      {card.tags
                        .slice(0, 3)
                        .map((tag) => `#${tag}`)
                        .join(' ')}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {shownActions.length > 0 && (
            <CommandGroup heading={t('command.actions')}>
              {shownActions.map(({ id, label, icon: Icon, run }) => (
                <CommandItem
                  key={id}
                  value={`action-${id}`}
                  onSelect={() => {
                    if (id !== 'new') close()
                    void run()
                  }}
                >
                  <Icon aria-hidden />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

import {
  CalendarDays,
  Columns3,
  Pencil,
  Plus,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import type { Track } from '@/data/types'
import { useBoardView } from '@/features/board/filters'
import { useBoardData } from '@/features/board/useBoardData'
import { TrackDialog } from '@/features/tracks/TrackDialog'
import { TrackDot } from '@/features/tracks/TrackDot'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { to: string; labelKey: string; icon: LucideIcon }[] = [
  { to: '/board', labelKey: 'nav.board', icon: Columns3 },
  { to: '/week', labelKey: 'nav.week', icon: CalendarDays },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'

export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const data = useBoardData()
  const view = useBoardView()
  const [editing, setEditing] = useState<Track | 'new' | null>(null)

  const boardName = data?.board.nome ?? APP_NAME
  const countByTrack = new Map<string, number>()
  for (const card of data?.cards ?? []) {
    if (card.trackId) countByTrack.set(card.trackId, (countByTrack.get(card.trackId) ?? 0) + 1)
  }

  function goToBoard() {
    if (location.pathname !== '/board') void navigate('/board')
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground md:flex-row">
      <aside className="flex shrink-0 gap-2 border-b border-sidebar-border bg-sidebar p-2 text-sidebar-foreground md:w-63 md:flex-col md:gap-5 md:border-r md:border-b-0 md:px-3 md:py-4">
        <div className="hidden items-center gap-2.5 px-2 py-1 md:flex">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-[0.5625rem] bg-foreground text-[0.8125rem] font-extrabold text-background"
          >
            {boardName.charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm leading-[1.125rem] font-extrabold text-foreground">
              {boardName}
            </span>
            <span className="truncate text-xs font-semibold text-muted-foreground">
              {t('app.local')}
            </span>
          </div>
        </div>

        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-(--sidebar-well) px-3 has-focus-visible:ring-2 has-focus-visible:ring-sidebar-ring md:flex-none">
          <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={view.search}
            onChange={(event) => {
              view.setSearch(event.target.value)
              goToBoard()
            }}
            aria-label={t('app.search')}
            placeholder={t('app.search')}
            className="min-w-0 flex-1 bg-transparent text-[0.8125rem] font-semibold outline-none placeholder:text-muted-foreground"
          />
        </label>

        <nav aria-label={t('app.mainNav')} className="flex gap-0.5 md:flex-col">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={t(labelKey)}
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-2.5 rounded-[0.625rem] px-3 text-sm md:h-8.5',
                  focusRing,
                  isActive
                    ? 'bg-sidebar-accent font-extrabold text-sidebar-accent-foreground'
                    : 'font-semibold hover:bg-(--sidebar-well)',
                )
              }
            >
              <Icon aria-hidden className="size-4 shrink-0 md:hidden" />
              <span className="sr-only flex-1 md:not-sr-only">{t(labelKey)}</span>
              {to === '/board' && data && (
                <span aria-hidden className="hidden text-xs font-bold opacity-70 md:inline">
                  {data.cards.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <section aria-labelledby="sidebar-tracks" className="hidden flex-col gap-0.5 md:flex">
          <div className="flex items-center px-3 pb-1.5">
            <h2
              id="sidebar-tracks"
              className="flex-1 text-[0.6875rem] font-extrabold tracking-[0.08em] text-muted-foreground uppercase"
            >
              {t('tracks.title')}
            </h2>
            <button
              type="button"
              aria-label={t('tracks.add')}
              title={t('tracks.add')}
              onClick={() => setEditing('new')}
              className={cn(
                'flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-(--sidebar-well) hover:text-foreground',
                focusRing,
              )}
            >
              <Plus aria-hidden className="size-3.5" />
            </button>
          </div>
          {data?.tracks.length === 0 && (
            <p className="px-3 text-xs font-semibold text-muted-foreground">{t('tracks.empty')}</p>
          )}
          {data?.tracks.map((track) => {
            const active = view.trackId === track.id
            return (
              <div key={track.id} className="group/track flex items-center">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    view.setTrack(active ? null : track.id)
                    goToBoard()
                  }}
                  className={cn(
                    'flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-[0.625rem] px-3 text-left text-sm font-semibold hover:bg-(--sidebar-well)',
                    focusRing,
                    active && 'bg-(--sidebar-well) font-extrabold text-foreground',
                  )}
                >
                  <TrackDot cor={track.cor} className="size-2.5" />
                  <span className="min-w-0 flex-1 truncate">{track.nome}</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {countByTrack.get(track.id) ?? 0}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t('tracks.editNamed', { name: track.nome })}
                  onClick={() => setEditing(track)}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover/track:opacity-100 hover:text-foreground focus-visible:opacity-100',
                    focusRing,
                  )}
                >
                  <Pencil aria-hidden className="size-3" />
                </button>
              </div>
            )
          })}
        </section>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>

      {editing !== null && (
        <TrackDialog track={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

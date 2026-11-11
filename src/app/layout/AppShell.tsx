import { CalendarDays, Columns3, Settings, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { to: string; labelKey: string; icon: LucideIcon }[] = [
  { to: '/board', labelKey: 'nav.board', icon: Columns3 },
  { to: '/week', labelKey: 'nav.week', icon: CalendarDays },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export function AppShell() {
  const { t } = useTranslation()

  return (
    <div className="flex h-dvh bg-background text-foreground">
      <aside className="flex w-14 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:w-56">
        <div className="flex h-14 items-center gap-2 px-4">
          <span aria-hidden className="size-5 shrink-0 rounded-sm bg-sidebar-foreground" />
          <span className="hidden text-sm font-semibold tracking-tight md:inline">{APP_NAME}</span>
        </div>
        <nav aria-label={t('app.mainNav')} className="flex flex-1 flex-col gap-1 p-2">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={t(labelKey)}
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors',
                  'hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  isActive
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="sr-only md:not-sr-only">{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

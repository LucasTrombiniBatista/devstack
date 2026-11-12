import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { startApplyingSettings } from '@/app/apply-settings'
import { AppShell } from '@/app/layout/AppShell'
import { BoardPage } from '@/features/board/BoardPage'
import { seedLabels } from '@/app/seed-labels'
import { useSettings } from '@/app/settings-store'
import { ensureSeed } from '@/data/seed'
import { TimerRunner } from '@/features/timer/TimerRunner'

// O quadro vem no pacote principal; as outras telas carregam quando são abertas.
const TodayPage = lazy(() =>
  import('@/features/planner/TodayPage').then((m) => ({ default: m.TodayPage })),
)
const WeekPage = lazy(() =>
  import('@/features/planner/WeekPage').then((m) => ({ default: m.WeekPage })),
)
const SettingsPage = lazy(() =>
  import('@/app/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const LobbyPage = lazy(() =>
  import('@/features/lobby/LobbyPage').then((m) => ({ default: m.LobbyPage })),
)
const FocusPage = lazy(() =>
  import('@/features/timer/FocusPage').then((m) => ({ default: m.FocusPage })),
)

export function App() {
  // Lida uma vez: trocar a tela inicial não deve mudar a tela que já está aberta.
  const [startPage] = useState(() => useSettings.getState().startPage)
  useEffect(() => startApplyingSettings(), [])
  useEffect(() => {
    void ensureSeed(seedLabels(useSettings.getState().language))
  }, [])

  // HashRouter: funciona igual em site estático e dentro do Tauri, sem regra de rewrite.
  return (
    <HashRouter>
      <TimerRunner />
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to={`/${startPage}`} replace />} />
            <Route path="lobby" element={<LobbyPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="week" element={<WeekPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/board" replace />} />
          </Route>
          <Route path="focus/:cardId?" element={<FocusPage />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

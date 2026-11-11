import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { startApplyingSettings } from '@/app/apply-settings'
import { AppShell } from '@/app/layout/AppShell'
import { BoardPage } from '@/features/board/BoardPage'
import { SettingsPage } from '@/app/pages/SettingsPage'
import { WeekPage } from '@/app/pages/WeekPage'
import { seedLabels } from '@/app/seed-labels'
import { useSettings } from '@/app/settings-store'
import { ensureSeed } from '@/data/seed'

export function App() {
  useEffect(() => startApplyingSettings(), [])
  useEffect(() => {
    void ensureSeed(seedLabels(useSettings.getState().language))
  }, [])

  // HashRouter: funciona igual em site estático e dentro do Tauri, sem regra de rewrite.
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/board" replace />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="week" element={<WeekPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

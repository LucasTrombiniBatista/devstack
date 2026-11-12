import { create } from 'zustand'
import { useSettings } from '@/app/settings-store'
import { useTimer } from '@/features/timer/store'
import { isDesktop } from '@/platform/runtime'

/**
 * Atualização automática do desktop. Usa o plugin do Tauri, que lê o `latest.json`
 * da última release no GitHub e só aceita pacotes assinados com a nossa chave.
 * Na web nada disso roda: o service worker já atualiza o site sozinho.
 */

export type UpdateStatus =
  'idle' | 'checking' | 'upToDate' | 'available' | 'downloading' | 'installing' | 'error'

type UpdateState = {
  status: UpdateStatus
  currentVersion: string | null
  version: string | null
  notes: string
  /** 0 a 1 durante o download; null quando o tamanho é desconhecido. */
  progress: number | null
  /** O timer está rodando e a pessoa ainda não confirmou o reinício. */
  needsConfirm: boolean
  /** O aviso aparece; falso quando a versão foi adiada com "Depois". */
  visible: boolean
}

export const useUpdates = create<UpdateState>()(() => ({
  status: 'idle',
  currentVersion: null,
  version: null,
  notes: '',
  progress: null,
  needsConfirm: false,
  visible: false,
}))

/** Verificação automática: ao abrir e depois a cada 6 horas. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

type Pending = Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater').check>>
let pending: Pending = null

/**
 * Procura versão nova. Na verificação automática, falhas ficam em silêncio
 * (sem internet, GitHub fora) e uma versão adiada não volta a aparecer.
 */
export async function checkForUpdate({ manual = false } = {}): Promise<void> {
  if (!isDesktop) return
  const { status } = useUpdates.getState()
  if (status === 'checking' || status === 'downloading' || status === 'installing') return
  useUpdates.setState({ status: 'checking' })
  try {
    const [{ check }, { getVersion }] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/api/app'),
    ])
    const currentVersion = await getVersion()
    pending = await check()
    if (!pending) {
      useUpdates.setState({ status: 'upToDate', currentVersion, visible: false })
      return
    }
    const skipped = useSettings.getState().skippedVersion === pending.version
    useUpdates.setState({
      status: 'available',
      currentVersion,
      version: pending.version,
      notes: pending.body ?? '',
      visible: manual || !skipped,
      needsConfirm: false,
    })
  } catch {
    useUpdates.setState({ status: manual ? 'error' : 'idle' })
  }
}

/** "Depois": esconde o aviso e não mostra esta versão de novo na verificação automática. */
export function postponeUpdate(): void {
  const { version } = useUpdates.getState()
  if (version) useSettings.getState().setSkippedVersion(version)
  useUpdates.setState({ visible: false, needsConfirm: false })
}

/** Baixa, instala e reinicia. Com o timer rodando, pede confirmação antes. */
export async function installUpdate({ force = false } = {}): Promise<void> {
  if (!pending) return
  if (!force && useTimer.getState().status === 'running') {
    useUpdates.setState({ needsConfirm: true })
    return
  }
  useUpdates.setState({ status: 'downloading', progress: null, needsConfirm: false })
  let total = 0
  let received = 0
  try {
    await pending.downloadAndInstall((event) => {
      if (event.event === 'Started') total = event.data.contentLength ?? 0
      if (event.event === 'Progress') {
        received += event.data.chunkLength
        useUpdates.setState({ progress: total ? Math.min(1, received / total) : null })
      }
      if (event.event === 'Finished') useUpdates.setState({ status: 'installing', progress: 1 })
    })
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch {
    useUpdates.setState({ status: 'error', visible: true })
  }
}

/** Liga a verificação automática; devolve a função de limpeza. */
export function startUpdateChecks(): () => void {
  if (!isDesktop) return () => {}
  const run = () => {
    if (useSettings.getState().autoUpdate) void checkForUpdate()
  }
  run()
  const id = window.setInterval(run, CHECK_INTERVAL_MS)
  return () => window.clearInterval(id)
}

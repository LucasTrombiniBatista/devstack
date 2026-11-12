import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import i18n from '@/app/i18n'
import { parseHtmlMetadata } from '@/features/capture/html'
import { setMetadataProvider, webMetadataProvider } from '@/features/capture/metadata'
import { elapsedMs, formatClock, isEngaged, remainingMs } from '@/features/timer/engine'
import { timer, useTimer } from '@/features/timer/store'
import { APP_NAME } from '@/lib/constants'
import { openExternal } from './runtime'

const PAGE_LIMIT = 500_000

/** Metadados no desktop: oEmbed quando o serviço tem, senão lê o HTML da própria página. */
const desktopMetadataProvider = {
  async fetch(url: string) {
    const oembed = await webMetadataProvider.fetch(url)
    if (oembed?.titulo) return oembed
    try {
      const { fetch: httpFetch } = await import('@tauri-apps/plugin-http')
      const response = await httpFetch(url, {
        method: 'GET',
        connectTimeout: 6000,
        headers: { Accept: 'text/html' },
      })
      if (!response.ok) return null
      const html = (await response.text()).slice(0, PAGE_LIMIT)
      return parseHtmlMetadata(html, url)
    } catch {
      return null
    }
  },
}

/** Links com `target="_blank"` abrem no navegador padrão, não numa janela do app. */
function openLinksOutside() {
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as HTMLElement | null)?.closest('a')
      if (!link || link.target !== '_blank' || !/^https?:/i.test(link.href)) return
      event.preventDefault()
      void openExternal(link.href)
    },
    true,
  )
}

/** Mantém a bandeja com a contagem e os textos do menu no idioma atual. */
function syncTray() {
  let last = ''
  async function push() {
    const state = useTimer.getState()
    const now = Date.now()
    const engaged = isEngaged(state)
    const clock =
      state.status === 'idle'
        ? null
        : state.mode === 'livre'
          ? formatClock(elapsedMs(state, now), 'down')
          : formatClock(remainingMs(state, now))
    const t = i18n.t.bind(i18n)
    const status = {
      tooltip: clock
        ? `${APP_NAME} · ${clock} · ${t(state.mode === 'livre' ? 'timer.phase.livre' : `timer.phase.${state.phase}`)}`
        : APP_NAME,
      open: t('tray.open', { app: APP_NAME }),
      toggle:
        state.status === 'running'
          ? t('timer.pause')
          : state.status === 'paused'
            ? t('timer.resume')
            : t('timer.start'),
      skip: state.phase === 'foco' ? t('timer.skipToBreak') : t('timer.skipBreak'),
      quit: t('tray.quit'),
      active: true,
      can_skip: engaged && state.status !== 'idle' && state.mode === 'pomodoro',
    }
    const key = JSON.stringify(status)
    if (key === last) return
    last = key
    await invoke('tray_status', { status }).catch(() => undefined)
  }
  void push()
  setInterval(() => void push(), 1000)
  useTimer.subscribe(() => void push())
  i18n.on('languageChanged', () => void push())

  void listen<string>('tray-action', ({ payload }) => {
    const state = useTimer.getState()
    if (payload === 'toggle') {
      if (state.status === 'running') timer.pause()
      else void timer.resume()
    } else if (payload === 'skip') {
      void timer.skip()
    }
  })
}

/** Liga o que só existe no app desktop. */
export function initDesktop(): void {
  setMetadataProvider(desktopMetadataProvider)
  openLinksOutside()
  syncTray()
}

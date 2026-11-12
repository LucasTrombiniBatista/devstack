/**
 * O que muda entre o navegador e o app desktop (Tauri). O resto do código pergunta aqui
 * em vez de testar o ambiente por conta própria. Os módulos do Tauri só são carregados
 * no desktop, então não pesam no site.
 */

export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Abre um link fora do app: no navegador padrão (desktop) ou em outra aba (web). */
export async function openExternal(url: string): Promise<void> {
  if (isDesktop) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/** Pede permissão para notificar. Na web precisa vir de um clique. */
export async function requestNotificationPermission(): Promise<void> {
  if (isDesktop) {
    const { isPermissionGranted, requestPermission } =
      await import('@tauri-apps/plugin-notification')
    if (!(await isPermissionGranted())) await requestPermission()
    return
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

/** Mostra uma notificação do sistema, se houver permissão. */
export async function showNotification(title: string, body: string): Promise<void> {
  if (isDesktop) {
    const { isPermissionGranted, sendNotification } =
      await import('@tauri-apps/plugin-notification')
    if (await isPermissionGranted()) sendNotification({ title, body })
    return
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: 'devstack-timer' })
  } catch {
    // Alguns navegadores móveis só notificam pelo service worker.
    const registration = await navigator.serviceWorker?.getRegistration()
    await registration?.showNotification(title, { body, tag: 'devstack-timer' })
  }
}

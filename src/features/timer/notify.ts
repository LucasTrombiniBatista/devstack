import { useSettings } from '@/app/settings-store'

const supported = () => typeof Notification !== 'undefined'

/** Pede a permissão de notificação. Chamar a partir de um clique, como o navegador exige. */
export function requestNotifyPermission(): void {
  if (!useSettings.getState().notify || !supported()) return
  if (Notification.permission === 'default') void Notification.requestPermission()
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }

/** Dois toques curtos, gerados na hora: não precisa de arquivo de áudio. */
function beep(): void {
  const Context = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
  if (!Context) return
  try {
    const context = new Context()
    const start = context.currentTime
    for (const [offset, frequency] of [
      [0, 880],
      [0.22, 1175],
    ]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.2, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.2)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.21)
    }
    setTimeout(() => void context.close(), 800)
  } catch {
    // Sem áudio disponível: o aviso visual continua valendo.
  }
}

/** Avisa que uma fase terminou, conforme as preferências. */
export function announce(title: string, body: string): void {
  const { notify, sound } = useSettings.getState()
  if (notify && supported() && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag: 'devstack-timer' })
    } catch {
      // Alguns navegadores só aceitam notificação por service worker; entra na Fase 6.
    }
  }
  if (sound) beep()
}

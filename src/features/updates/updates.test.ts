import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettings } from '@/app/settings-store'
import { useTimer } from '@/features/timer/store'
import { IDLE } from '@/features/timer/engine'
import { checkForUpdate, installUpdate, postponeUpdate, useUpdates } from './store'

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  relaunch: vi.fn(),
  downloadAndInstall: vi.fn(),
}))

vi.mock('@/platform/runtime', () => ({ isDesktop: true }))
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: mocks.relaunch }))
vi.mock('@tauri-apps/api/app', () => ({ getVersion: async () => '0.1.1' }))

const update = () => ({
  version: '0.2.0',
  body: '### Adicionado\n\n- Atualização automática',
  downloadAndInstall: mocks.downloadAndInstall,
})

beforeEach(() => {
  vi.clearAllMocks()
  useUpdates.setState({ status: 'idle', visible: false, version: null, needsConfirm: false })
  useSettings.setState({ skippedVersion: null })
  useTimer.setState(IDLE)
})

describe('atualização automática', () => {
  it('avisa quando já está na versão mais recente', async () => {
    mocks.check.mockResolvedValue(null)
    await checkForUpdate({ manual: true })
    expect(useUpdates.getState()).toMatchObject({ status: 'upToDate', currentVersion: '0.1.1' })
  })

  it('mostra o aviso com a versão e as novidades', async () => {
    mocks.check.mockResolvedValue(update())
    await checkForUpdate()
    expect(useUpdates.getState()).toMatchObject({
      status: 'available',
      version: '0.2.0',
      visible: true,
    })
    expect(useUpdates.getState().notes).toContain('Atualização automática')
  })

  it('"Depois" silencia a versão na verificação automática, mas não na manual', async () => {
    mocks.check.mockResolvedValue(update())
    await checkForUpdate()
    postponeUpdate()
    expect(useSettings.getState().skippedVersion).toBe('0.2.0')

    useUpdates.setState({ status: 'idle' })
    await checkForUpdate()
    expect(useUpdates.getState().visible).toBe(false)

    useUpdates.setState({ status: 'idle' })
    await checkForUpdate({ manual: true })
    expect(useUpdates.getState().visible).toBe(true)
  })

  it('falha na verificação automática fica em silêncio', async () => {
    mocks.check.mockRejectedValue(new Error('offline'))
    await checkForUpdate()
    expect(useUpdates.getState().status).toBe('idle')
    await checkForUpdate({ manual: true })
    expect(useUpdates.getState().status).toBe('error')
  })

  it('com o timer rodando, pede confirmação antes de reiniciar', async () => {
    mocks.check.mockResolvedValue(update())
    await checkForUpdate()
    useTimer.setState({ ...IDLE, status: 'running' })

    await installUpdate()
    expect(useUpdates.getState().needsConfirm).toBe(true)
    expect(mocks.downloadAndInstall).not.toHaveBeenCalled()

    await installUpdate({ force: true })
    expect(mocks.downloadAndInstall).toHaveBeenCalled()
    expect(mocks.relaunch).toHaveBeenCalled()
  })
})

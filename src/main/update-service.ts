// src/main/update-service.ts
import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import type { PiEventPayloads, PiEventName } from '@shared/types'

type SendFn = <E extends PiEventName>(event: E, payload: PiEventPayloads[E]) => void

export class UpdateService {
  private initialized = false

  constructor(
    private readonly win: BrowserWindow,
    private readonly send: SendFn
  ) {}

  init(): void {
    if (this.initialized) return
    this.initialized = true

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    // Silence the built-in logger except in dev
    autoUpdater.logger = null

    autoUpdater.on('checking-for-update', () => {
      this.send('update:checking', {})
    })

    autoUpdater.on('update-available', (info) => {
      this.send('update:available', { version: info.version })
    })

    autoUpdater.on('update-not-available', (info) => {
      this.send('update:not-available', { version: info.version })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.send('update:progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.send('update:ready', { version: info.version })
    })

    autoUpdater.on('error', (err) => {
      this.send('update:error', { message: err.message ?? String(err) })
    })
  }

  async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      this.send('update:error', { message: err instanceof Error ? err.message : String(err) })
    }
  }

  install(): void {
    autoUpdater.quitAndInstall(false, true)
  }
}

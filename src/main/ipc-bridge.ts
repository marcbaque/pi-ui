// src/main/ipc-bridge.ts
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import type { AuthService } from './auth-service'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'
import type { PreferencesService } from './preferences-service'
import type { SessionService } from './session-service'
import { SessionStore } from './session-store'
import type { PiEventName, PiEventPayloads } from '@shared/types'

export class IpcBridge {
  constructor(
    private readonly win: BrowserWindow,
    private readonly auth: AuthService,
    private readonly models: ModelService,
    private readonly settings: SettingsService,
    private readonly prefs: PreferencesService,
    private readonly sessions: SessionService,
    private readonly store: SessionStore
  ) {}

  register(): void {
    this.registerConfig()
    this.registerModels()
    this.registerSession()
    this.registerDialog()
    this.registerShell()
    this.registerHistory()
  }

  sendToRenderer<E extends PiEventName>(event: E, payload: PiEventPayloads[E]): void {
    if (!this.win.isDestroyed()) {
      this.win.webContents.send(event, payload)
    }
  }

  private registerConfig(): void {
    ipcMain.handle('config:get', async () => {
      const [providers, defaults] = await Promise.all([
        this.auth.getProviderStatuses(),
        this.settings.getDefaults(),
      ])
      return { providers, ...defaults }
    })

    ipcMain.handle(
      'config:setApiKey',
      async (_e, { provider, key }: { provider: string; key: string }) => {
        await this.auth.setApiKey(provider, key)
      }
    )

    ipcMain.handle(
      'config:setDefaults',
      async (_e, opts: Parameters<SettingsService['setDefaults']>[0]) => {
        await this.settings.setDefaults(opts)
      }
    )
  }

  private registerModels(): void {
    ipcMain.handle('models:list', async () => {
      return this.models.listAvailable()
    })
  }

  private registerSession(): void {
    ipcMain.handle('session:create', async (_e, opts) => {
      try {
        return await this.sessions.createSession(opts, (event, payload) => {
          this.sendToRenderer(event, payload)
        })
      } catch (err) {
        console.error('[session:create]', err)
        throw err
      }
    })

    ipcMain.handle(
      'session:send',
      async (_e, { sessionId, message }: { sessionId: string; message: string }) => {
        try {
          await this.sessions.send(sessionId, message)
        } catch (err) {
          console.error('[session:send]', err)
          throw err
        }
      }
    )

    ipcMain.handle('session:abort', async (_e, { sessionId }: { sessionId: string }) => {
      await this.sessions.abort(sessionId)
    })

    ipcMain.handle('session:close', (_e, { sessionId }: { sessionId: string }) => {
      this.sessions.closeSession(sessionId)
    })
  }

  private registerDialog(): void {
    ipcMain.handle('dialog:openDirectory', async () => {
      const result = await dialog.showOpenDialog(this.win, {
        properties: ['openDirectory'],
        title: 'Select working directory',
      })
      if (result.canceled || result.filePaths.length === 0) return null
      const dir = result.filePaths[0]
      await this.prefs.set({ lastUsedDirectory: dir })
      return dir
    })
  }

  private registerShell(): void {
    ipcMain.handle('shell:openPath', (_e, { path }: { path: string }) => {
      shell.openPath(path)
    })
  }

  private registerHistory(): void {
    ipcMain.handle('sessions:list', async () => {
      try {
        const activeIds = this.sessions.getActiveSessionIds()
        return await this.store.list(activeIds)
      } catch (err) {
        console.error('[sessions:list]', err)
        throw err
      }
    })

    ipcMain.handle(
      'sessions:updateMeta',
      async (
        _e,
        {
          sessionId,
          patch,
        }: { sessionId: string; patch: Partial<{ tags: string[]; pinned: boolean }> }
      ) => {
        await this.store.updateMetaById(sessionId, patch)
      }
    )

    ipcMain.handle('sessions:delete', async (_e, { sessionId }: { sessionId: string }) => {
      await this.store.deleteMetaById(sessionId)
    })

    ipcMain.handle('session:load', async (_e, { sessionPath }: { sessionPath: string }) => {
      return this.store.load(sessionPath)
    })

    ipcMain.handle('session:resume', async (_e, { sessionPath }: { sessionPath: string }) => {
      const { sessionId, sdkSession } = await this.store.resume(
        sessionPath,
        this.models,
        this.settings,
        (event, payload) => this.sendToRenderer(event, payload)
      )
      const manager = (sdkSession as { sessionManager?: { getSessionId(): string } }).sessionManager
      const sdkSessionId = manager?.getSessionId() ?? sessionId
      this.sessions.registerResumedSession(sessionId, sdkSession, sdkSessionId)
      return { sessionId }
    })
  }
}

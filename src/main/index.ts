// src/main/index.ts
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { AuthService } from './auth-service'
import { ModelService } from './model-service'
import { SettingsService } from './settings-service'
import { PreferencesService } from './preferences-service'
import { SessionService } from './session-service'
import { IpcBridge } from './ipc-bridge'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const auth = new AuthService()
  const models = new ModelService(auth)
  const settings = new SettingsService()
  const prefs = new PreferencesService(app.getPath('userData'))
  const sessions = new SessionService(models, settings)

  const bridge = new IpcBridge(win, auth, models, settings, prefs, sessions)
  bridge.register()

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.on('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

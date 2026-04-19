// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { PiAPI, PiEventName, PiEventPayloads } from '@shared/types'

const api: PiAPI = {
  session: {
    create: (opts) => ipcRenderer.invoke('session:create', opts),
    send: (sessionId, message) => ipcRenderer.invoke('session:send', { sessionId, message }),
    abort: (sessionId) => ipcRenderer.invoke('session:abort', { sessionId }),
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    setApiKey: (provider, key) => ipcRenderer.invoke('config:setApiKey', { provider, key }),
    setDefaults: (opts) => ipcRenderer.invoke('config:setDefaults', opts),
  },
  models: {
    list: () => ipcRenderer.invoke('models:list'),
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  },
  shell: {
    openPath: (path) => ipcRenderer.invoke('shell:openPath', { path }),
  },
  on: <E extends PiEventName>(event: E, handler: (payload: PiEventPayloads[E]) => void) => {
    const listener = (_: import('electron').IpcRendererEvent, payload: PiEventPayloads[E]) =>
      handler(payload)
    ipcRenderer.on(event, listener)
    return () => ipcRenderer.removeListener(event, listener)
  },
}

contextBridge.exposeInMainWorld('pi', api)

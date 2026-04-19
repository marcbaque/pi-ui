// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { PiAPI, PiEventName, PiEventPayloads, AppConfig, ModelEntry } from '@shared/types'

// ─── E2E mock bridge ────────────────────────────────────────────────────────
if (process.env['PI_E2E']) {
  const handlers = new Map<string, Set<(payload: unknown) => void>>()
  let sessionCounter = 0

  const DEFAULT_CONFIG: AppConfig = {
    providers: [
      { name: 'Anthropic', authType: 'apikey', configured: true },
      { name: 'OpenAI', authType: 'apikey', configured: false },
    ],
    defaultModel: 'claude-sonnet-4-5',
    defaultProvider: 'Anthropic',
    defaultThinkingLevel: 'off',
    systemPrompt: '',
  }

  const DEFAULT_MODELS: ModelEntry[] = [
    {
      provider: 'Anthropic',
      modelId: 'claude-sonnet-4-5',
      displayName: 'Anthropic / claude-sonnet-4-5',
      supportsThinking: true,
    },
    {
      provider: 'Anthropic',
      modelId: 'claude-opus-4-5',
      displayName: 'Anthropic / claude-opus-4-5',
      supportsThinking: true,
    },
    {
      provider: 'OpenAI',
      modelId: 'gpt-4o',
      displayName: 'OpenAI / gpt-4o',
      supportsThinking: false,
    },
  ]

  function emit<E extends PiEventName>(event: E, payload: PiEventPayloads[E]): void {
    handlers.get(event)?.forEach((h) => h(payload as unknown))
  }

  const mockApi: PiAPI = {
    session: {
      create: async () => ({ sessionId: `test-session-${++sessionCounter}` }),
      send: async () => {},
      abort: async (sessionId) => {
        emit('pi:idle', { sessionId })
      },
    },
    config: {
      get: async () => ({
        ...DEFAULT_CONFIG,
        providers: DEFAULT_CONFIG.providers.map((p) => ({ ...p })),
      }),
      setApiKey: async () => {},
      setDefaults: async () => {},
    },
    models: {
      list: async () => DEFAULT_MODELS.map((m) => ({ ...m })),
    },
    dialog: {
      openDirectory: async () => '/tmp/test-project',
    },
    shell: {
      openPath: async () => {},
    },
    on: (event, handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler as (payload: unknown) => void)
      return () => {
        handlers.get(event)?.delete(handler as (payload: unknown) => void)
      }
    },
  }

  const mockControl = {
    emitToken: (sessionId: string, delta: string) => emit('pi:token', { sessionId, delta }),
    emitToolStart: (
      sessionId: string,
      toolCallId: string,
      toolName: string,
      args: Record<string, unknown>
    ) => emit('pi:tool-start', { sessionId, toolCallId, toolName, args }),
    emitToolEnd: (
      sessionId: string,
      toolCallId: string,
      toolName: string,
      result: string,
      isError: boolean,
      durationMs: number
    ) => emit('pi:tool-end', { sessionId, toolCallId, toolName, result, isError, durationMs }),
    emitTurnEnd: (sessionId: string) => emit('pi:turn-end', { sessionId }),
    emitIdle: (sessionId: string) => emit('pi:idle', { sessionId }),
    emitError: (sessionId: string, message: string) => emit('pi:error', { sessionId, message }),
    getLastSessionId: () => `test-session-${sessionCounter}`,
  }

  contextBridge.exposeInMainWorld('pi', mockApi)
  contextBridge.exposeInMainWorld('__mockPi', mockControl)
} else {
  // ─── Real bridge ────────────────────────────────────────────────────────────
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
}

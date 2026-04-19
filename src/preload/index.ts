// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type {
  PiAPI,
  PiEventName,
  PiEventPayloads,
  AppConfig,
  ModelEntry,
  SessionSummary,
  Message,
} from '@shared/types'

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
    homedir: '/Users/test',
    defaultWorkingDirectory: null,
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

  const MOCK_SESSIONS: SessionSummary[] = [
    {
      id: 'past-session-1',
      path: '/mock/sessions/--mock-project--/2024-01-01T00-00-00-000Z_past-session-1.jsonl',
      cwd: '/mock/project',
      cwdSlug: '--mock-project--',
      lastActiveAt: Date.now() - 3600_000,
      model: 'claude-sonnet-4-5',
      pinned: false,
      tags: [],
      name: null,
      isActive: false,
    },
    {
      id: 'past-session-2',
      path: '/mock/sessions/--mock-project--/2024-01-02T00-00-00-000Z_past-session-2.jsonl',
      cwd: '/mock/project',
      cwdSlug: '--mock-project--',
      lastActiveAt: Date.now() - 86400_000,
      model: 'claude-opus-4-5',
      pinned: true,
      tags: ['important'],
      name: 'My important session',
      isActive: false,
    },
  ]

  const MOCK_LOADED_MESSAGES: Message[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'This is a past message',
      toolCalls: [],
      createdAt: Date.now() - 3600_000,
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'This is a past assistant reply',
      toolCalls: [],
      createdAt: Date.now() - 3590_000,
    },
  ]

  const mockApi: PiAPI = {
    session: {
      create: async () => ({ sessionId: `test-session-${++sessionCounter}` }),
      send: async () => {},
      abort: async (sessionId) => {
        emit('pi:idle', { sessionId })
      },
      close: async () => {},
    },
    config: {
      get: async () => ({
        ...DEFAULT_CONFIG,
        providers: DEFAULT_CONFIG.providers.map((p) => ({ ...p })),
        homedir: '/Users/test',
        defaultWorkingDirectory: null,
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
    sessions: {
      list: async () => MOCK_SESSIONS,
      updateMeta: async () => {},
      delete: async () => {},
      load: async (_sessionPath: string) => MOCK_LOADED_MESSAGES,
      resume: async (_sessionPath: string) => ({
        sessionId: `test-session-${++sessionCounter}`,
      }),
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
    ) =>
      emit('pi:tool-end', {
        sessionId,
        toolCallId,
        toolName,
        result,
        details: null,
        isError,
        durationMs,
      }),
    emitTurnEnd: (sessionId: string) => emit('pi:turn-end', { sessionId }),
    emitIdle: (sessionId: string) => emit('pi:idle', { sessionId }),
    emitError: (sessionId: string, message: string) => emit('pi:error', { sessionId, message }),
    getLastSessionId: () => `test-session-${sessionCounter}`,
    getSessions: () => MOCK_SESSIONS,
  }

  contextBridge.exposeInMainWorld('pi', mockApi)
  contextBridge.exposeInMainWorld('__mockPi', mockControl)
} else {
  // ─── Real bridge ────────────────────────────────────────────────────────────
  const api: PiAPI = {
    session: {
      create: (opts) => ipcRenderer.invoke('session:create', opts),
      send: (sessionId, message) => {
        console.log('[preload] session:send', sessionId)
        return ipcRenderer.invoke('session:send', { sessionId, message })
      },
      abort: (sessionId) => ipcRenderer.invoke('session:abort', { sessionId }),
      close: (sessionId) => ipcRenderer.invoke('session:close', { sessionId }),
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
    sessions: {
      list: () => ipcRenderer.invoke('sessions:list'),
      updateMeta: (sessionId, patch) =>
        ipcRenderer.invoke('sessions:updateMeta', { sessionId, patch }),
      delete: (sessionId) => ipcRenderer.invoke('sessions:delete', { sessionId }),
      load: (sessionPath) => ipcRenderer.invoke('session:load', { sessionPath }),
      resume: (sessionPath) => {
        console.log('[preload] session:resume', sessionPath)
        return ipcRenderer.invoke('session:resume', { sessionPath })
      },
    },
    on: <E extends PiEventName>(event: E, handler: (payload: PiEventPayloads[E]) => void) => {
      const listener = (_: import('electron').IpcRendererEvent, payload: PiEventPayloads[E]) => {
        console.log('[preload] ipc event received:', event, JSON.stringify(payload).slice(0, 80))
        handler(payload)
      }
      ipcRenderer.on(event, listener)
      return () => ipcRenderer.removeListener(event, listener)
    },
  }

  contextBridge.exposeInMainWorld('pi', api)
  contextBridge.exposeInMainWorld('piDebug', {
    sessions: () => ipcRenderer.invoke('debug:sessions'),
  })
}

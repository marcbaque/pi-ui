# pi-ui Phase 1 — Plan 3: IPC Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full communication bridge between the renderer and the pi SDK: `SessionService` (owns `AgentSession`), `IpcBridge` (registers `ipcMain` handlers, forwards SDK events), `Preload` (exposes `window.pi` via `contextBridge`), and the main-process entry point that wires everything together.

**Architecture:** `SessionService` creates and owns one `AgentSession` at a time (Phase 1). It subscribes to SDK events and calls back into `IpcBridge`, which calls `webContents.send()` to push events to the renderer. The preload script exposes a typed `window.pi` API using Electron's `contextBridge`. The renderer is fully sandboxed.

**Tech Stack:** `@mariozechner/pi-coding-agent` (createAgentSession, DefaultResourceLoader, SessionManager), Electron `ipcMain` / `contextBridge` / `dialog` / `shell`, Vitest (node env).

---

### Task 1: SessionService (TDD)

**Files:**
- Create: `src/main/session-service.test.ts`
- Create: `src/main/session-service.ts`

`SessionService.createSession()` calls `createAgentSession()`, subscribes to SDK events, and calls a provided `onEvent` callback for each relevant event. This keeps it decoupled from Electron IPC — making it fully testable without a real BrowserWindow.

- [ ] **Step 1: Write failing tests**

```typescript
// @vitest-environment node
// src/main/session-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionService } from './session-service'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'

// --- SDK mock ---
const mockPrompt = vi.fn()
const mockAbort = vi.fn()
const mockSetModel = vi.fn()
const mockSetThinkingLevel = vi.fn()
const mockDispose = vi.fn()
let capturedSubscriber: ((event: unknown) => void) | null = null

const mockSession = {
  prompt: mockPrompt,
  abort: mockAbort,
  setModel: mockSetModel,
  setThinkingLevel: mockSetThinkingLevel,
  dispose: mockDispose,
  subscribe: vi.fn((cb: (event: unknown) => void) => {
    capturedSubscriber = cb
    return () => {}
  }),
}

vi.mock('@mariozechner/pi-coding-agent', () => ({
  createAgentSession: vi.fn(async () => ({ session: mockSession })),
  DefaultResourceLoader: vi.fn(() => ({ reload: vi.fn() })),
  SessionManager: { create: vi.fn() },
}))

const fakeModel = { id: 'claude-sonnet-4.6', provider: 'github-copilot', reasoning: true, name: 'Claude' }
const fakeModelService = { findModel: vi.fn(() => fakeModel) } as unknown as ModelService
const fakeSettingsService = { getDefaults: vi.fn(async () => ({ systemPrompt: 'Be concise.' })) } as unknown as SettingsService

describe('SessionService', () => {
  let service: SessionService
  const onEvent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    capturedSubscriber = null
    service = new SessionService(fakeModelService, fakeSettingsService)
  })

  describe('createSession', () => {
    it('returns a sessionId', async () => {
      const result = await service.createSession(
        { cwd: '/tmp', model: 'claude-sonnet-4.6', provider: 'github-copilot', thinkingLevel: 'low' },
        onEvent
      )
      expect(typeof result.sessionId).toBe('string')
      expect(result.sessionId.length).toBeGreaterThan(0)
    })

    it('throws when model is not found', async () => {
      fakeModelService.findModel = vi.fn(() => undefined)

      await expect(
        service.createSession(
          { cwd: '/tmp', model: 'bad-model', provider: 'bad', thinkingLevel: 'low' },
          onEvent
        )
      ).rejects.toThrow('Model not found: bad/bad-model')
    })
  })

  describe('send', () => {
    it('calls session.prompt with the message', async () => {
      const { sessionId } = await service.createSession(
        { cwd: '/tmp', model: 'claude-sonnet-4.6', provider: 'github-copilot', thinkingLevel: 'low' },
        onEvent
      )
      await service.send(sessionId, 'hello')
      expect(mockPrompt).toHaveBeenCalledWith('hello')
    })

    it('throws for an unknown sessionId', async () => {
      await expect(service.send('bad-id', 'hi')).rejects.toThrow('Session not found: bad-id')
    })
  })

  describe('abort', () => {
    it('calls session.abort', async () => {
      const { sessionId } = await service.createSession(
        { cwd: '/tmp', model: 'claude-sonnet-4.6', provider: 'github-copilot', thinkingLevel: 'low' },
        onEvent
      )
      await service.abort(sessionId)
      expect(mockAbort).toHaveBeenCalled()
    })
  })

  describe('event forwarding', () => {
    it('calls onEvent with pi:token when SDK emits message_update text_delta', async () => {
      const { sessionId } = await service.createSession(
        { cwd: '/tmp', model: 'claude-sonnet-4.6', provider: 'github-copilot', thinkingLevel: 'low' },
        onEvent
      )

      capturedSubscriber!({
        type: 'message_update',
        assistantMessageEvent: { type: 'text_delta', delta: 'hello' },
      })

      expect(onEvent).toHaveBeenCalledWith('pi:token', { sessionId, delta: 'hello' })
    })

    it('calls onEvent with pi:idle when SDK emits agent_end', async () => {
      const { sessionId } = await service.createSession(
        { cwd: '/tmp', model: 'claude-sonnet-4.6', provider: 'github-copilot', thinkingLevel: 'low' },
        onEvent
      )

      capturedSubscriber!({ type: 'agent_end' })

      expect(onEvent).toHaveBeenCalledWith('pi:idle', { sessionId })
    })

    it('calls onEvent with pi:turn-end when SDK emits turn_end', async () => {
      const { sessionId } = await service.createSession(
        { cwd: '/tmp', model: 'claude-sonnet-4.6', provider: 'github-copilot', thinkingLevel: 'low' },
        onEvent
      )

      capturedSubscriber!({ type: 'turn_end' })

      expect(onEvent).toHaveBeenCalledWith('pi:turn-end', { sessionId })
    })
  })

  describe('closeSession', () => {
    it('calls session.dispose and removes the session', async () => {
      const { sessionId } = await service.createSession(
        { cwd: '/tmp', model: 'claude-sonnet-4.6', provider: 'github-copilot', thinkingLevel: 'low' },
        onEvent
      )

      service.closeSession(sessionId)

      expect(mockDispose).toHaveBeenCalled()
      await expect(service.send(sessionId, 'hi')).rejects.toThrow('Session not found')
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/main/session-service.test.ts
```

Expected: FAIL — `SessionService` not found.

- [ ] **Step 3: Implement SessionService**

```typescript
// src/main/session-service.ts
import { createAgentSession, DefaultResourceLoader, SessionManager } from '@mariozechner/pi-coding-agent'
import { randomUUID } from 'crypto'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'
import type { AppThinkingLevel, PiEventName, PiEventPayloads } from '@shared/types'

type EventCallback = <E extends PiEventName>(event: E, payload: PiEventPayloads[E]) => void

interface ActiveSession {
  session: Awaited<ReturnType<typeof createAgentSession>>['session']
  unsubscribe: () => void
}

export interface CreateSessionOpts {
  cwd: string
  model: string
  provider: string
  thinkingLevel: AppThinkingLevel
}

export class SessionService {
  private readonly sessions = new Map<string, ActiveSession>()

  constructor(
    private readonly modelService: ModelService,
    private readonly settingsService: SettingsService
  ) {}

  async createSession(opts: CreateSessionOpts, onEvent: EventCallback): Promise<{ sessionId: string }> {
    const model = this.modelService.findModel(opts.provider, opts.model)
    if (!model) throw new Error(`Model not found: ${opts.provider}/${opts.model}`)

    const { systemPrompt } = await this.settingsService.getDefaults()
    const loader = new DefaultResourceLoader({
      cwd: opts.cwd,
      systemPromptOverride: systemPrompt ? () => systemPrompt : undefined,
    })
    await loader.reload()

    const { session } = await createAgentSession({
      cwd: opts.cwd,
      model,
      thinkingLevel: opts.thinkingLevel,
      resourceLoader: loader,
      sessionManager: SessionManager.create(opts.cwd),
    })

    const sessionId = randomUUID()

    const unsubscribe = session.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        onEvent('pi:token', { sessionId, delta: event.assistantMessageEvent.delta })
      } else if (event.type === 'tool_execution_start') {
        onEvent('pi:tool-start', {
          sessionId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: event.args as Record<string, unknown>,
        })
      } else if (event.type === 'tool_execution_end') {
        const result = typeof event.result === 'string' ? event.result : JSON.stringify(event.result)
        onEvent('pi:tool-end', {
          sessionId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          result,
          isError: event.isError,
          durationMs: 0,
        })
      } else if (event.type === 'turn_end') {
        onEvent('pi:turn-end', { sessionId })
      } else if (event.type === 'agent_end') {
        onEvent('pi:idle', { sessionId })
      }
    })

    this.sessions.set(sessionId, { session, unsubscribe })
    return { sessionId }
  }

  async send(sessionId: string, message: string): Promise<void> {
    const entry = this.getOrThrow(sessionId)
    await entry.session.prompt(message)
  }

  async abort(sessionId: string): Promise<void> {
    const entry = this.getOrThrow(sessionId)
    await entry.session.abort()
  }

  closeSession(sessionId: string): void {
    const entry = this.sessions.get(sessionId)
    if (!entry) return
    entry.unsubscribe()
    entry.session.dispose()
    this.sessions.delete(sessionId)
  }

  private getOrThrow(sessionId: string): ActiveSession {
    const entry = this.sessions.get(sessionId)
    if (!entry) throw new Error(`Session not found: ${sessionId}`)
    return entry
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/main/session-service.test.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/session-service.ts src/main/session-service.test.ts
git commit -m "feat: add SessionService wrapping AgentSession lifecycle"
```

---

### Task 2: IPC Bridge

**Files:**
- Create: `src/main/ipc-bridge.ts`

Registers all `ipcMain.handle` channels and forwards SDK events to the renderer via `webContents.send`. Receives service instances injected in the constructor — no singletons.

- [ ] **Step 1: Implement IpcBridge**

No unit test for IpcBridge itself (it's pure wiring — integration tested by running the app). We do add a type-check guard instead.

```typescript
// src/main/ipc-bridge.ts
import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import type { AuthService } from './auth-service'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'
import type { PreferencesService } from './preferences-service'
import type { SessionService } from './session-service'
import type { PiEventName, PiEventPayloads } from '@shared/types'

export class IpcBridge {
  constructor(
    private readonly win: BrowserWindow,
    private readonly auth: AuthService,
    private readonly models: ModelService,
    private readonly settings: SettingsService,
    private readonly prefs: PreferencesService,
    private readonly sessions: SessionService
  ) {}

  register(): void {
    this.registerConfig()
    this.registerModels()
    this.registerSession()
    this.registerDialog()
    this.registerShell()
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

    ipcMain.handle('config:setApiKey', async (_e, { provider, key }: { provider: string; key: string }) => {
      await this.auth.setApiKey(provider, key)
    })

    ipcMain.handle('config:setDefaults', async (_e, opts: Parameters<SettingsService['setDefaults']>[0]) => {
      await this.settings.setDefaults(opts)
    })
  }

  private registerModels(): void {
    ipcMain.handle('models:list', async () => {
      return this.models.listAvailable()
    })
  }

  private registerSession(): void {
    ipcMain.handle('session:create', async (_e, opts) => {
      return this.sessions.createSession(opts, (event, payload) => {
        this.sendToRenderer(event, payload)
      })
    })

    ipcMain.handle('session:send', async (_e, { sessionId, message }: { sessionId: string; message: string }) => {
      await this.sessions.send(sessionId, message)
    })

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
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-bridge.ts
git commit -m "feat: add IpcBridge registering all ipcMain handlers"
```

---

### Task 3: Preload script

**Files:**
- Create: `src/preload/index.ts`
- Create: `src/renderer/src/env.d.ts`

The preload runs in a privileged Node.js context but exposes only a curated API to the renderer via `contextBridge`. The renderer accesses it as `window.pi`.

- [ ] **Step 1: Implement preload**

```typescript
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
    const listener = (_: Electron.IpcRendererEvent, payload: PiEventPayloads[E]) => handler(payload)
    ipcRenderer.on(event, listener)
    return () => ipcRenderer.removeListener(event, listener)
  },
}

contextBridge.exposeInMainWorld('pi', api)
```

- [ ] **Step 2: Add window.pi type declaration to renderer**

```typescript
// src/renderer/src/env.d.ts
/// <reference types="vite/client" />

import type { PiAPI } from '../../shared/types'

declare global {
  interface Window {
    pi: PiAPI
  }
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/renderer/src/env.d.ts
git commit -m "feat: add preload script exposing window.pi via contextBridge"
```

---

### Task 4: Main process entry point

**Files:**
- Create: `src/main/index.ts`

Wires all services together, creates the `BrowserWindow`, and registers the IPC bridge.

- [ ] **Step 1: Implement main/index.ts**

```typescript
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

  // Instantiate services
  const auth = new AuthService()
  const models = new ModelService(auth)
  const settings = new SettingsService()
  const prefs = new PreferencesService(app.getPath('userData'))
  const sessions = new SessionService(models, settings)

  // Register IPC handlers
  const bridge = new IpcBridge(win, auth, models, settings, prefs, sessions)
  bridge.register()

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.on('ready-to-show', () => win.show())

  // Clean up sessions when window closes
  win.on('closed', () => {
    // SessionService does not need explicit cleanup — sessions are GC'd with the process
  })
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
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
pnpm test:run
```

Expected: all tests pass (no new tests for main/index.ts — it's wiring).

- [ ] **Step 4: Start the app in dev mode**

```bash
pnpm dev
```

Expected: Electron window opens showing "pi-ui loading…" in the dark background. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add main process entry point — Electron window + full IPC wiring"
```

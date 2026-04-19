# pi-ui Phase 1 — Plan 4: Renderer Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the renderer-side foundation: Zustand store (session, config, UI slices), the `usePiEvents` hook that wires IPC events into the store, the `useAutoScroll` hook, and the App shell layout with the sidebar/chat split.

**Architecture:** Zustand store is the single source of truth for all UI state. `usePiEvents` subscribes to `window.pi.on(...)` events on mount and dispatches store actions. The App shell renders `<Sidebar>` and `<ChatPane>` in a fixed two-column layout.

**Tech Stack:** Zustand 5, React 19, Vitest 4 + @testing-library/react (jsdom env).

---

### Task 1: Zustand store (TDD)

**Files:**
- Create: `src/renderer/src/store/session-slice.ts`
- Create: `src/renderer/src/store/config-slice.ts`
- Create: `src/renderer/src/store/ui-slice.ts`
- Create: `src/renderer/src/store/index.ts`
- Create: `src/renderer/src/store/store.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/renderer/src/store/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './index'

// Reset store between tests using act
function getStore() {
  return useStore.getState()
}

function resetStore() {
  useStore.setState(useStore.getInitialState())
}

describe('session slice', () => {
  beforeEach(resetStore)

  it('starts with no active session', () => {
    expect(getStore().session.active).toBe(false)
    expect(getStore().session.messages).toEqual([])
  })

  it('setSessionActive marks session as active with given props', () => {
    getStore().setSessionActive({ sessionId: 'abc', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    expect(getStore().session.active).toBe(true)
    expect(getStore().session.sessionId).toBe('abc')
    expect(getStore().session.status).toBe('idle')
  })

  it('appendToken appends delta to currentStreamingContent', () => {
    getStore().setSessionActive({ sessionId: 'abc', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    getStore().appendToken('Hello')
    getStore().appendToken(' world')
    expect(getStore().session.currentStreamingContent).toBe('Hello world')
  })

  it('addUserMessage pushes a user message and clears streaming content', () => {
    getStore().setSessionActive({ sessionId: 'abc', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    getStore().addUserMessage('fix the bug')
    expect(getStore().session.messages).toHaveLength(1)
    expect(getStore().session.messages[0].role).toBe('user')
    expect(getStore().session.messages[0].content).toBe('fix the bug')
  })

  it('finalizeAssistantMessage moves streaming content into a message and clears buffer', () => {
    getStore().setSessionActive({ sessionId: 'abc', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    getStore().appendToken('Sure!')
    getStore().finalizeAssistantMessage()
    expect(getStore().session.messages).toHaveLength(1)
    expect(getStore().session.messages[0].role).toBe('assistant')
    expect(getStore().session.messages[0].content).toBe('Sure!')
    expect(getStore().session.currentStreamingContent).toBe('')
  })

  it('addToolCall adds a pending tool call to the latest assistant message', () => {
    getStore().setSessionActive({ sessionId: 'abc', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    getStore().addUserMessage('read the file')
    getStore().appendToken('Reading...')
    getStore().finalizeAssistantMessage()
    getStore().addToolCall({ toolCallId: 't1', toolName: 'read', args: { path: 'foo.ts' } })
    const lastMsg = getStore().session.messages[1]
    expect(lastMsg.toolCalls).toHaveLength(1)
    expect(lastMsg.toolCalls[0].status).toBe('pending')
  })

  it('resolveToolCall updates the matching tool call to done', () => {
    getStore().setSessionActive({ sessionId: 'abc', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    getStore().appendToken('ok')
    getStore().finalizeAssistantMessage()
    getStore().addToolCall({ toolCallId: 't1', toolName: 'read', args: {} })
    getStore().resolveToolCall({ toolCallId: 't1', result: 'file contents', isError: false, durationMs: 42 })
    const tool = getStore().session.messages[0].toolCalls[0]
    expect(tool.status).toBe('done')
    expect(tool.result).toBe('file contents')
    expect(tool.durationMs).toBe(42)
  })

  it('setSessionStatus updates the status', () => {
    getStore().setSessionActive({ sessionId: 'abc', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    getStore().setSessionStatus('thinking')
    expect(getStore().session.status).toBe('thinking')
  })
})

describe('config slice', () => {
  beforeEach(resetStore)

  it('starts with empty config', () => {
    expect(getStore().config.providers).toEqual([])
    expect(getStore().config.models).toEqual([])
  })

  it('setConfig replaces the full config', () => {
    getStore().setConfig({
      providers: [{ name: 'anthropic', authType: 'apikey', configured: true }],
      defaultModel: 'claude',
      defaultProvider: 'anthropic',
      defaultThinkingLevel: 'low',
      systemPrompt: '',
    })
    expect(getStore().config.providers).toHaveLength(1)
    expect(getStore().config.defaultModel).toBe('claude')
  })

  it('setModels replaces the model list', () => {
    getStore().setModels([{ provider: 'anthropic', modelId: 'claude', displayName: 'Claude', supportsThinking: true }])
    expect(getStore().config.models).toHaveLength(1)
  })
})

describe('ui slice', () => {
  beforeEach(resetStore)

  it('starts with all modals closed', () => {
    expect(getStore().ui.settingsOpen).toBe(false)
    expect(getStore().ui.newSessionOpen).toBe(false)
  })

  it('openSettings sets settingsOpen to true', () => {
    getStore().openSettings()
    expect(getStore().ui.settingsOpen).toBe(true)
  })

  it('closeSettings sets settingsOpen to false', () => {
    getStore().openSettings()
    getStore().closeSettings()
    expect(getStore().ui.settingsOpen).toBe(false)
  })

  it('openNewSession sets newSessionOpen to true', () => {
    getStore().openNewSession()
    expect(getStore().ui.newSessionOpen).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/renderer/src/store/store.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement store slices**

`src/renderer/src/store/session-slice.ts`:
```typescript
// Use Web Crypto API (available in browser and jsdom) — not the Node.js 'crypto' module
const uuid = () => crypto.randomUUID()
import type { Message, ToolCall, AppThinkingLevel } from '@shared/types'

export interface SessionState {
  active: boolean
  sessionId: string | null
  cwd: string | null
  model: string | null
  provider: string | null
  thinkingLevel: AppThinkingLevel
  status: 'idle' | 'thinking' | 'error'
  messages: Message[]
  currentStreamingContent: string
}

export interface SessionActions {
  setSessionActive(opts: { sessionId: string; cwd: string; model: string; provider: string; thinkingLevel: AppThinkingLevel }): void
  clearSession(): void
  setSessionStatus(status: SessionState['status']): void
  addUserMessage(content: string): void
  appendToken(delta: string): void
  finalizeAssistantMessage(): void
  addToolCall(call: { toolCallId: string; toolName: string; args: Record<string, unknown> }): void
  resolveToolCall(result: { toolCallId: string; result: string; isError: boolean; durationMs: number }): void
}

export const initialSessionState: SessionState = {
  active: false,
  sessionId: null,
  cwd: null,
  model: null,
  provider: null,
  thinkingLevel: 'low',
  status: 'idle',
  messages: [],
  currentStreamingContent: '',
}

export const createSessionSlice = (set: (fn: (s: { session: SessionState }) => void) => void): SessionActions => ({
  setSessionActive: (opts) =>
    set((s) => {
      s.session = { ...initialSessionState, active: true, ...opts }
    }),

  clearSession: () =>
    set((s) => {
      s.session = { ...initialSessionState }
    }),

  setSessionStatus: (status) =>
    set((s) => {
      s.session.status = status
    }),

  addUserMessage: (content) =>
    set((s) => {
      s.session.messages.push({ id: uuid(), role: 'user', content, toolCalls: [], createdAt: Date.now() })
    }),

  appendToken: (delta) =>
    set((s) => {
      s.session.currentStreamingContent += delta
    }),

  finalizeAssistantMessage: () =>
    set((s) => {
      if (!s.session.currentStreamingContent) return
      s.session.messages.push({
        id: uuid(),
        role: 'assistant',
        content: s.session.currentStreamingContent,
        toolCalls: [],
        createdAt: Date.now(),
      })
      s.session.currentStreamingContent = ''
    }),

  addToolCall: ({ toolCallId, toolName, args }) =>
    set((s) => {
      // Attach to the last message (the current assistant response)
      const last = s.session.messages[s.session.messages.length - 1]
      if (!last) return
      const call: ToolCall = { id: toolCallId, toolName, args, result: null, isError: false, durationMs: null, status: 'pending' }
      last.toolCalls.push(call)
    }),

  resolveToolCall: ({ toolCallId, result, isError, durationMs }) =>
    set((s) => {
      for (const msg of s.session.messages) {
        const call = msg.toolCalls.find((c) => c.id === toolCallId)
        if (call) {
          call.result = result
          call.isError = isError
          call.durationMs = durationMs
          call.status = 'done'
          break
        }
      }
    }),
})
```

`src/renderer/src/store/config-slice.ts`:
```typescript
import type { AppConfig, ModelEntry } from '@shared/types'

export interface ConfigState {
  providers: AppConfig['providers']
  defaultModel: string | null
  defaultProvider: string | null
  defaultThinkingLevel: AppConfig['defaultThinkingLevel']
  systemPrompt: string
  models: ModelEntry[]
}

export interface ConfigActions {
  setConfig(config: AppConfig): void
  setModels(models: ModelEntry[]): void
}

export const initialConfigState: ConfigState = {
  providers: [],
  defaultModel: null,
  defaultProvider: null,
  defaultThinkingLevel: 'low',
  systemPrompt: '',
  models: [],
}

export const createConfigSlice = (set: (fn: (s: { config: ConfigState }) => void) => void): ConfigActions => ({
  setConfig: (config) =>
    set((s) => {
      s.config = { ...s.config, ...config }
    }),

  setModels: (models) =>
    set((s) => {
      s.config.models = models
    }),
})
```

`src/renderer/src/store/ui-slice.ts`:
```typescript
export interface UiState {
  settingsOpen: boolean
  newSessionOpen: boolean
}

export interface UiActions {
  openSettings(): void
  closeSettings(): void
  openNewSession(): void
  closeNewSession(): void
}

export const initialUiState: UiState = {
  settingsOpen: false,
  newSessionOpen: false,
}

export const createUiSlice = (set: (fn: (s: { ui: UiState }) => void) => void): UiActions => ({
  openSettings: () => set((s) => { s.ui.settingsOpen = true }),
  closeSettings: () => set((s) => { s.ui.settingsOpen = false }),
  openNewSession: () => set((s) => { s.ui.newSessionOpen = true }),
  closeNewSession: () => set((s) => { s.ui.newSessionOpen = false }),
})
```

`src/renderer/src/store/index.ts`:
```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { initialSessionState, createSessionSlice, type SessionState, type SessionActions } from './session-slice'
import { initialConfigState, createConfigSlice, type ConfigState, type ConfigActions } from './config-slice'
import { initialUiState, createUiSlice, type UiState, type UiActions } from './ui-slice'

type AppStore = { session: SessionState; config: ConfigState; ui: UiState } &
  SessionActions & ConfigActions & UiActions

const initialState = { session: initialSessionState, config: initialConfigState, ui: initialUiState }

export const useStore = create<AppStore>()(
  immer((set) => ({
    ...initialState,
    ...createSessionSlice(set as Parameters<typeof createSessionSlice>[0]),
    ...createConfigSlice(set as Parameters<typeof createConfigSlice>[0]),
    ...createUiSlice(set as Parameters<typeof createUiSlice>[0]),
  }))
)

// Expose initial state for test resets
;(useStore as unknown as { getInitialState: () => typeof initialState }).getInitialState = () => ({ ...initialState })
```

- [ ] **Step 4: Install zustand immer middleware**

```bash
pnpm add immer
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pnpm test:run src/renderer/src/store/store.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/store/
git commit -m "feat: add Zustand store with session, config, and UI slices"
```

---

### Task 2: usePiEvents hook (TDD)

**Files:**
- Create: `src/renderer/src/hooks/usePiEvents.test.tsx`
- Create: `src/renderer/src/hooks/usePiEvents.ts`

Subscribes to `window.pi.on(...)` events and dispatches the appropriate store actions.

- [ ] **Step 1: Write failing tests**

```typescript
// src/renderer/src/hooks/usePiEvents.test.tsx
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePiEvents } from './usePiEvents'
import { useStore } from '../store'

type Handler = (payload: unknown) => void
const handlers: Record<string, Handler> = {}
const mockOn = vi.fn((event: string, handler: Handler) => {
  handlers[event] = handler
  return () => { delete handlers[event] }
})

vi.stubGlobal('window', {
  pi: { on: mockOn },
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('usePiEvents', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
    Object.keys(handlers).forEach((k) => delete handlers[k])
    // Set up an active session so events have a sessionId to match
    useStore.getState().setSessionActive({
      sessionId: 'sess-1',
      cwd: '/code',
      model: 'claude',
      provider: 'anthropic',
      thinkingLevel: 'low',
    })
  })

  it('registers listeners for all pi events on mount', () => {
    renderHook(() => usePiEvents('sess-1'))
    expect(mockOn).toHaveBeenCalledWith('pi:token', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:tool-start', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:tool-end', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:idle', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('pi:error', expect.any(Function))
  })

  it('appends token on pi:token event', () => {
    renderHook(() => usePiEvents('sess-1'))
    act(() => { handlers['pi:token']({ sessionId: 'sess-1', delta: 'Hello' }) })
    expect(useStore.getState().session.currentStreamingContent).toBe('Hello')
  })

  it('sets status to thinking on pi:token when idle', () => {
    renderHook(() => usePiEvents('sess-1'))
    act(() => { handlers['pi:token']({ sessionId: 'sess-1', delta: 'x' }) })
    expect(useStore.getState().session.status).toBe('thinking')
  })

  it('finalizes message and sets idle on pi:idle', () => {
    renderHook(() => usePiEvents('sess-1'))
    act(() => { handlers['pi:token']({ sessionId: 'sess-1', delta: 'Done!' }) })
    act(() => { handlers['pi:idle']({ sessionId: 'sess-1' }) })
    const msgs = useStore.getState().session.messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe('Done!')
    expect(useStore.getState().session.status).toBe('idle')
  })

  it('adds a pending tool call on pi:tool-start', () => {
    renderHook(() => usePiEvents('sess-1'))
    // First add an assistant message to attach to
    act(() => { handlers['pi:token']({ sessionId: 'sess-1', delta: 'reading...' }) })
    act(() => { handlers['pi:idle']({ sessionId: 'sess-1' }) })
    // Now another turn with a tool call
    act(() => { handlers['pi:token']({ sessionId: 'sess-1', delta: 'ok' }) })
    act(() => {
      handlers['pi:tool-start']({ sessionId: 'sess-1', toolCallId: 't1', toolName: 'read', args: { path: 'x.ts' } })
    })
    const lastMsg = useStore.getState().session.messages.at(-1)!
    expect(lastMsg.toolCalls.some((c) => c.id === 't1' && c.status === 'pending')).toBe(true)
  })

  it('ignores events for a different sessionId', () => {
    renderHook(() => usePiEvents('sess-1'))
    act(() => { handlers['pi:token']({ sessionId: 'OTHER', delta: 'ignore me' }) })
    expect(useStore.getState().session.currentStreamingContent).toBe('')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/renderer/src/hooks/usePiEvents.test.tsx
```

Expected: FAIL — `usePiEvents` not found.

- [ ] **Step 3: Implement usePiEvents**

```typescript
// src/renderer/src/hooks/usePiEvents.ts
import { useEffect } from 'react'
import { useStore } from '../store'

export function usePiEvents(sessionId: string | null): void {
  const {
    appendToken,
    setSessionStatus,
    finalizeAssistantMessage,
    addToolCall,
    resolveToolCall,
  } = useStore()

  useEffect(() => {
    if (!sessionId) return

    const unsubs = [
      window.pi.on('pi:token', ({ sessionId: sid, delta }) => {
        if (sid !== sessionId) return
        appendToken(delta)
        setSessionStatus('thinking')
      }),

      window.pi.on('pi:tool-start', ({ sessionId: sid, toolCallId, toolName, args }) => {
        if (sid !== sessionId) return
        addToolCall({ toolCallId, toolName, args })
      }),

      window.pi.on('pi:tool-end', ({ sessionId: sid, toolCallId, result, isError, durationMs }) => {
        if (sid !== sessionId) return
        resolveToolCall({ toolCallId, result, isError, durationMs })
      }),

      window.pi.on('pi:turn-end', ({ sessionId: sid }) => {
        if (sid !== sessionId) return
        // Turn ended — assistant message will be finalized on agent_end (pi:idle)
      }),

      window.pi.on('pi:idle', ({ sessionId: sid }) => {
        if (sid !== sessionId) return
        finalizeAssistantMessage()
        setSessionStatus('idle')
      }),

      window.pi.on('pi:error', ({ sessionId: sid }) => {
        if (sid !== sessionId) return
        setSessionStatus('error')
      }),
    ]

    return () => unsubs.forEach((unsub) => unsub())
  }, [sessionId, appendToken, setSessionStatus, finalizeAssistantMessage, addToolCall, resolveToolCall])
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/renderer/src/hooks/usePiEvents.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/hooks/usePiEvents.ts src/renderer/src/hooks/usePiEvents.test.tsx
git commit -m "feat: add usePiEvents hook wiring IPC events into Zustand store"
```

---

### Task 3: useAutoScroll hook + App shell

**Files:**
- Create: `src/renderer/src/hooks/useAutoScroll.ts`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Implement useAutoScroll**

```typescript
// src/renderer/src/hooks/useAutoScroll.ts
import { useEffect, useRef } from 'react'

/**
 * Scrolls a container to the bottom whenever `trigger` changes,
 * unless the user has manually scrolled up.
 */
export function useAutoScroll<T extends HTMLElement>(trigger: unknown) {
  const ref = useRef<T>(null)
  const userScrolledUp = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
      userScrolledUp.current = !atBottom
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (userScrolledUp.current) return
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [trigger])

  return ref
}
```

- [ ] **Step 2: Build App shell with startup data loading**

```tsx
// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useStore } from './store'

export default function App() {
  const { setConfig, setModels } = useStore()

  // Load config and models on startup
  useEffect(() => {
    Promise.all([window.pi.config.get(), window.pi.models.list()])
      .then(([config, models]) => {
        setConfig(config)
        setModels(models)
      })
      .catch(console.error)
  }, [setConfig, setModels])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar placeholder — filled in Plan 5 */}
      <div className="w-56 shrink-0 border-r border-border bg-[#0a0a0a]" />
      {/* Chat area placeholder — filled in Plan 5 */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">pi-ui</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update App test to match new placeholder text**

```tsx
// src/renderer/src/App.test.tsx
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock window.pi
vi.stubGlobal('window', {
  pi: {
    config: { get: vi.fn(async () => ({ providers: [], defaultModel: null, defaultProvider: null, defaultThinkingLevel: 'low', systemPrompt: '' })) },
    models: { list: vi.fn(async () => []) },
    on: vi.fn(() => () => {}),
  },
})

describe('App', () => {
  it('renders the shell without crashing', () => {
    render(<App />)
    expect(screen.getByText('pi-ui')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run tests**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 5: Run full check**

```bash
pnpm check
```

Expected: typecheck, lint, tests all pass.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/hooks/useAutoScroll.ts src/renderer/src/App.tsx src/renderer/src/App.test.tsx
git commit -m "feat: add useAutoScroll hook and App shell with startup data loading"
```

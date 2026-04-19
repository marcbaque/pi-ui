# pi-ui Phase 1 — Plan 5: UI Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all five React UI components — Sidebar, New Session Dialog, Chat Pane (Toolbar + MessageList + InputArea), and Settings Modal — and wire them into the App shell so the app is fully functional end-to-end.

**Architecture:** Each component reads from the Zustand store and calls `window.pi.*` for side effects. `window.pi` is accessed directly in components (not through React context) because it is a stable singleton. Component tests mock `window.pi` and the store.

**Tech Stack:** React 19, Zustand, Tailwind CSS 4, shadcn/ui primitives (Button, Input, Select, Dialog, Textarea, ScrollArea), lucide-react icons.

---

### Task 1: Sidebar

**Files:**
- Create: `src/renderer/src/components/sidebar/ModelList.tsx`
- Create: `src/renderer/src/components/sidebar/ProviderList.tsx`
- Create: `src/renderer/src/components/sidebar/Sidebar.tsx`
- Create: `src/renderer/src/components/sidebar/Sidebar.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/renderer/src/components/sidebar/Sidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Sidebar from './Sidebar'
import { useStore } from '../../store'

vi.stubGlobal('window', { pi: { on: vi.fn(() => () => {}) } })

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('Sidebar', () => {
  beforeEach(resetStore)

  it('renders the pi-ui logo', () => {
    render(<Sidebar />)
    expect(screen.getByText('pi-ui')).toBeInTheDocument()
  })

  it('renders each model from the store', () => {
    useStore.getState().setModels([
      { provider: 'github-copilot', modelId: 'claude-sonnet-4.6', displayName: 'Claude Sonnet 4.6', supportsThinking: true },
      { provider: 'github-copilot', modelId: 'gpt-5', displayName: 'GPT-5', supportsThinking: false },
    ])
    render(<Sidebar />)
    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument()
    expect(screen.getByText('GPT-5')).toBeInTheDocument()
  })

  it('renders provider statuses', () => {
    useStore.getState().setConfig({
      providers: [
        { name: 'github-copilot', authType: 'oauth', configured: true },
        { name: 'anthropic', authType: 'apikey', configured: false },
      ],
      defaultModel: null,
      defaultProvider: null,
      defaultThinkingLevel: 'low',
      systemPrompt: '',
    })
    render(<Sidebar />)
    expect(screen.getByText('github-copilot')).toBeInTheDocument()
    expect(screen.getByText('anthropic')).toBeInTheDocument()
  })

  it('opens new session dialog when + button is clicked', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: /new session/i }))
    expect(useStore.getState().ui.newSessionOpen).toBe(true)
  })

  it('opens settings when Settings button is clicked', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(useStore.getState().ui.settingsOpen).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/renderer/src/components/sidebar/Sidebar.test.tsx
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement ModelList**

```tsx
// src/renderer/src/components/sidebar/ModelList.tsx
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

export default function ModelList() {
  const { config, setConfig } = useStore()

  function selectModel(provider: string, modelId: string) {
    setConfig({ ...config, defaultProvider: provider, defaultModel: modelId })
    window.pi.config.setDefaults({ defaultModel: modelId, defaultProvider: provider }).catch(console.error)
  }

  return (
    <div className="px-2 pb-2">
      <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-zinc-600">Models</p>
      {config.models.map((m) => {
        const selected = m.provider === config.defaultProvider && m.modelId === config.defaultModel
        return (
          <button
            key={`${m.provider}/${m.modelId}`}
            onClick={() => selectModel(m.provider, m.modelId)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              selected
                ? 'bg-emerald-950 text-emerald-400'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', selected ? 'bg-emerald-400' : 'bg-zinc-700')}
            />
            <span className="truncate">{m.displayName}</span>
          </button>
        )
      })}
      {config.models.length === 0 && (
        <p className="px-2 text-xs text-zinc-700">No models — add a provider key in Settings.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement ProviderList**

```tsx
// src/renderer/src/components/sidebar/ProviderList.tsx
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

const CHIP: Record<string, string> = {
  ok: 'bg-emerald-950 text-emerald-400',
  no: 'bg-red-950 text-red-400',
}

export default function ProviderList() {
  const { config, openSettings } = useStore()

  return (
    <div className="px-2 pb-2">
      <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-zinc-600">Providers</p>
      {config.providers.map((p) => (
        <button
          key={p.name}
          onClick={openSettings}
          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
        >
          <span className="truncate">{p.name}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px]', p.configured ? CHIP.ok : CHIP.no)}>
            {p.configured ? 'on' : 'off'}
          </span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Implement Sidebar**

```tsx
// src/renderer/src/components/sidebar/Sidebar.tsx
import { Plus, Settings } from 'lucide-react'
import { useStore } from '@/store'
import ModelList from './ModelList'
import ProviderList from './ProviderList'

export default function Sidebar() {
  const { openNewSession, openSettings } = useStore()

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col overflow-hidden border-r border-zinc-900 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 px-3 py-3">
        <span className="text-sm font-bold tracking-tight text-white">
          <span className="text-emerald-400">pi</span>-ui
        </span>
        <button
          aria-label="New session"
          onClick={openNewSession}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2 space-y-4">
        <ModelList />
        <ProviderList />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-900 p-2">
        <button
          aria-label="Settings"
          onClick={openSettings}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
        >
          <Settings size={13} />
          Settings
          <span className="ml-auto text-[10px] text-zinc-700">⌘,</span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
pnpm test:run src/renderer/src/components/sidebar/Sidebar.test.tsx
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/components/sidebar/
git commit -m "feat: add Sidebar with ModelList and ProviderList"
```

---

### Task 2: New Session Dialog

**Files:**
- Create: `src/renderer/src/components/modals/NewSessionDialog.tsx`
- Create: `src/renderer/src/components/modals/NewSessionDialog.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/renderer/src/components/modals/NewSessionDialog.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NewSessionDialog from './NewSessionDialog'
import { useStore } from '../../store'

const mockCreate = vi.fn(async () => ({ sessionId: 'new-sess' }))
const mockOpenDir = vi.fn(async () => '/selected/dir')

vi.stubGlobal('window', {
  pi: {
    session: { create: mockCreate },
    dialog: { openDirectory: mockOpenDir },
    on: vi.fn(() => () => {}),
  },
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('NewSessionDialog', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
    useStore.getState().setModels([
      { provider: 'anthropic', modelId: 'claude', displayName: 'Claude', supportsThinking: true },
    ])
    useStore.getState().setConfig({
      providers: [],
      defaultModel: 'claude',
      defaultProvider: 'anthropic',
      defaultThinkingLevel: 'low',
      systemPrompt: '',
    })
  })

  it('does not render when newSessionOpen is false', () => {
    render(<NewSessionDialog />)
    expect(screen.queryByText('New Session')).not.toBeInTheDocument()
  })

  it('renders when newSessionOpen is true', () => {
    useStore.getState().openNewSession()
    render(<NewSessionDialog />)
    expect(screen.getByText('New Session')).toBeInTheDocument()
  })

  it('opens directory picker when Browse is clicked', async () => {
    useStore.getState().openNewSession()
    render(<NewSessionDialog />)
    fireEvent.click(screen.getByRole('button', { name: /browse/i }))
    await waitFor(() => expect(mockOpenDir).toHaveBeenCalled())
  })

  it('calls session.create and closes dialog on Start', async () => {
    useStore.getState().openNewSession()
    render(<NewSessionDialog />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(useStore.getState().ui.newSessionOpen).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/renderer/src/components/modals/NewSessionDialog.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement NewSessionDialog**

```tsx
// src/renderer/src/components/modals/NewSessionDialog.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import type { AppThinkingLevel } from '@shared/types'

const THINKING_LEVELS: AppThinkingLevel[] = ['off', 'low', 'high']

export default function NewSessionDialog() {
  const { ui, config, closeNewSession, setSessionActive } = useStore()

  const [cwd, setCwd] = useState(config.defaultModel ? '~' : '~')
  const [model, setModel] = useState(config.defaultModel ?? '')
  const [provider, setProvider] = useState(config.defaultProvider ?? '')
  const [thinking, setThinking] = useState<AppThinkingLevel>(config.defaultThinkingLevel)
  const [loading, setLoading] = useState(false)

  async function handleBrowse() {
    const dir = await window.pi.dialog.openDirectory()
    if (dir) setCwd(dir)
  }

  async function handleStart() {
    if (!cwd || !model || !provider) return
    setLoading(true)
    try {
      const { sessionId } = await window.pi.session.create({ cwd, model, provider, thinkingLevel: thinking })
      setSessionActive({ sessionId, cwd, model, provider, thinkingLevel: thinking })
      closeNewSession()
    } catch (err) {
      console.error('Failed to create session:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={ui.newSessionOpen} onOpenChange={(open) => !open && closeNewSession()}>
      <DialogContent className="border-zinc-800 bg-[#161616] text-zinc-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">New Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Working directory */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Working Directory</label>
            <div className="flex gap-2">
              <Input
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                className="flex-1 border-zinc-800 bg-zinc-900 text-xs text-zinc-300"
                placeholder="~/code/project"
              />
              <Button
                aria-label="Browse"
                variant="outline"
                size="sm"
                onClick={handleBrowse}
                className="border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Browse
              </Button>
            </div>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Model</label>
            <Select
              value={`${provider}/${model}`}
              onValueChange={(val) => {
                const [p, ...rest] = val.split('/')
                setProvider(p)
                setModel(rest.join('/'))
              }}
            >
              <SelectTrigger className="border-zinc-800 bg-zinc-900 text-xs text-zinc-300">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                {config.models.map((m) => (
                  <SelectItem key={`${m.provider}/${m.modelId}`} value={`${m.provider}/${m.modelId}`} className="text-xs text-zinc-300">
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Thinking level */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Thinking</label>
            <div className="flex overflow-hidden rounded-md border border-zinc-800">
              {THINKING_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setThinking(level)}
                  className={cn(
                    'flex-1 py-1.5 text-xs capitalize transition-colors',
                    thinking === level ? 'bg-emerald-950 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            aria-label="Start"
            onClick={handleStart}
            disabled={loading || !cwd || !model}
            className="bg-emerald-950 text-xs text-emerald-400 hover:bg-emerald-900"
          >
            {loading ? 'Starting…' : 'Start Session →'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/renderer/src/components/modals/NewSessionDialog.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/modals/NewSessionDialog.tsx src/renderer/src/components/modals/NewSessionDialog.test.tsx
git commit -m "feat: add NewSessionDialog with cwd picker, model select, and thinking control"
```

---

### Task 3: Chat Pane

**Files:**
- Create: `src/renderer/src/components/chat/ToolCallEntry.tsx`
- Create: `src/renderer/src/components/chat/MessageList.tsx`
- Create: `src/renderer/src/components/chat/Toolbar.tsx`
- Create: `src/renderer/src/components/chat/InputArea.tsx`
- Create: `src/renderer/src/components/chat/ChatPane.tsx`
- Create: `src/renderer/src/components/chat/ChatPane.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/renderer/src/components/chat/ChatPane.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChatPane from './ChatPane'
import { useStore } from '../../store'

const mockSend = vi.fn(async () => {})
const mockAbort = vi.fn(async () => {})

vi.stubGlobal('window', {
  pi: {
    session: { send: mockSend, abort: mockAbort },
    shell: { openPath: vi.fn() },
    on: vi.fn(() => () => {}),
  },
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('ChatPane', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('shows empty state when no session is active', () => {
    render(<ChatPane />)
    expect(screen.getByText(/no active session/i)).toBeInTheDocument()
  })

  it('shows the message input when a session is active', () => {
    useStore.getState().setSessionActive({ sessionId: 's1', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    render(<ChatPane />)
    expect(screen.getByPlaceholderText(/send a message/i)).toBeInTheDocument()
  })

  it('sends a message on Enter and clears the input', async () => {
    useStore.getState().setSessionActive({ sessionId: 's1', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    render(<ChatPane />)
    const input = screen.getByPlaceholderText(/send a message/i)
    fireEvent.change(input, { target: { value: 'hello pi' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('s1', 'hello pi'))
    expect((input as HTMLTextAreaElement).value).toBe('')
  })

  it('does not send on Shift+Enter', () => {
    useStore.getState().setSessionActive({ sessionId: 's1', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    render(<ChatPane />)
    const input = screen.getByPlaceholderText(/send a message/i)
    fireEvent.change(input, { target: { value: 'draft' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('shows Stop button while thinking and calls abort', async () => {
    useStore.getState().setSessionActive({ sessionId: 's1', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    useStore.getState().setSessionStatus('thinking')
    render(<ChatPane />)
    const stop = screen.getByRole('button', { name: /stop/i })
    fireEvent.click(stop)
    await waitFor(() => expect(mockAbort).toHaveBeenCalledWith('s1'))
  })

  it('renders user and assistant messages', () => {
    useStore.getState().setSessionActive({ sessionId: 's1', cwd: '/code', model: 'claude', provider: 'anthropic', thinkingLevel: 'low' })
    useStore.getState().addUserMessage('hello')
    render(<ChatPane />)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/renderer/src/components/chat/ChatPane.test.tsx
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement ToolCallEntry**

```tsx
// src/renderer/src/components/chat/ToolCallEntry.tsx
import { cn } from '@/lib/utils'
import type { ToolCall } from '@shared/types'

interface Props { call: ToolCall }

function getDisplayPath(call: ToolCall): string {
  const args = call.args
  if (typeof args.path === 'string') return args.path
  if (typeof args.command === 'string') return args.command.slice(0, 60)
  return ''
}

export default function ToolCallEntry({ call }: Props) {
  return (
    <div className="flex items-center gap-2 border-l-2 border-zinc-800 py-0.5 pl-4 pr-2 font-mono text-[11px]">
      <span className="text-zinc-600">▸</span>
      <span className="text-zinc-500">{call.toolName}</span>
      <span className="truncate text-emerald-900">{getDisplayPath(call)}</span>
      <span className={cn('ml-auto', call.status === 'pending' ? 'text-zinc-700' : call.isError ? 'text-red-700' : 'text-zinc-700')}>
        {call.status === 'pending'
          ? 'running…'
          : call.isError
          ? `${call.durationMs}ms ✗`
          : `${call.durationMs}ms ✓`}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Implement MessageList**

```tsx
// src/renderer/src/components/chat/MessageList.tsx
import { useStore } from '@/store'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import ToolCallEntry from './ToolCallEntry'

export default function MessageList() {
  const { session } = useStore()
  const scrollRef = useAutoScroll<HTMLDivElement>(session.messages.length + session.currentStreamingContent.length)

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
      {session.messages.map((msg) => (
        <div key={msg.id}>
          <div className="px-5 py-2">
            <p className={`mb-1 text-[10px] font-semibold uppercase tracking-widest ${msg.role === 'user' ? 'text-emerald-500' : 'text-blue-400'}`}>
              {msg.role === 'user' ? 'You' : 'pi'}
            </p>
            <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{msg.content}</p>
          </div>
          {msg.toolCalls.map((call) => (
            <ToolCallEntry key={call.id} call={call} />
          ))}
        </div>
      ))}

      {/* Streaming assistant content */}
      {session.currentStreamingContent && (
        <div className="px-5 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-blue-400">pi</p>
          <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
            {session.currentStreamingContent}
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-blue-400 align-middle" />
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Implement Toolbar**

```tsx
// src/renderer/src/components/chat/Toolbar.tsx
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AppThinkingLevel } from '@shared/types'

const LEVELS: AppThinkingLevel[] = ['off', 'low', 'high']

export default function Toolbar() {
  const { session, config, setSessionActive } = useStore()

  if (!session.active) return null

  async function handleModelChange(val: string) {
    const [provider, ...rest] = val.split('/')
    const model = rest.join('/')
    try {
      await window.pi.session.send(session.sessionId!, `/model ${provider}/${model}`)
      setSessionActive({ ...session, provider, model } as Parameters<typeof setSessionActive>[0])
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-zinc-900 bg-[#0a0a0a] px-3 py-2">
      {/* Model selector */}
      <Select
        value={`${session.provider}/${session.model}`}
        onValueChange={handleModelChange}
      >
        <SelectTrigger className="h-7 w-48 border-zinc-800 bg-zinc-900 text-xs text-zinc-400">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-zinc-800 bg-zinc-900">
          {config.models.map((m) => (
            <SelectItem key={`${m.provider}/${m.modelId}`} value={`${m.provider}/${m.modelId}`} className="text-xs text-zinc-300">
              {m.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Thinking level */}
      <div className="flex overflow-hidden rounded border border-zinc-800">
        {LEVELS.map((level) => (
          <button
            key={level}
            className={cn(
              'px-2 py-0.5 text-[10px] capitalize transition-colors',
              session.thinkingLevel === level ? 'bg-emerald-950 text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Working directory */}
      <button
        onClick={() => session.cwd && window.pi.shell.openPath(session.cwd)}
        className="ml-auto max-w-[200px] truncate text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
      >
        {session.cwd}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Implement InputArea**

```tsx
// src/renderer/src/components/chat/InputArea.tsx
import { useState, useRef } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'

export default function InputArea() {
  const { session, addUserMessage } = useStore()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const thinking = session.status === 'thinking'

  async function send() {
    const msg = value.trim()
    if (!msg || !session.sessionId) return
    setValue('')
    addUserMessage(msg)
    try {
      await window.pi.session.send(session.sessionId, msg)
    } catch (err) {
      console.error(err)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function handleAbort() {
    if (!session.sessionId) return
    await window.pi.session.abort(session.sessionId)
  }

  return (
    <div className="border-t border-zinc-900 bg-[#0a0a0a] px-3 py-3">
      <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 focus-within:border-zinc-700">
        <textarea
          ref={textareaRef}
          value={thinking ? '' : value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={thinking}
          rows={1}
          placeholder={thinking ? 'pi is working…' : 'Send a message… (Enter to send, Shift+Enter for newline)'}
          className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none disabled:cursor-not-allowed"
          style={{ minHeight: 40, maxHeight: 160 }}
        />
        {thinking && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              aria-label="Stop"
              size="sm"
              onClick={handleAbort}
              className="h-7 border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              ■ Stop
            </Button>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3 px-1">
        <span className={`flex items-center gap-1.5 text-[11px] ${session.status === 'thinking' ? 'text-amber-600' : session.status === 'error' ? 'text-red-600' : 'text-zinc-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${session.status === 'thinking' ? 'bg-amber-500 animate-pulse' : session.status === 'error' ? 'bg-red-500' : 'bg-emerald-700'}`} />
          {session.status}
        </span>
        <span className="ml-auto text-[11px] text-zinc-700">
          {session.model} · {session.cwd}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Implement ChatPane**

```tsx
// src/renderer/src/components/chat/ChatPane.tsx
import { useStore } from '@/store'
import { usePiEvents } from '@/hooks/usePiEvents'
import Toolbar from './Toolbar'
import MessageList from './MessageList'
import InputArea from './InputArea'

function EmptyState() {
  const { openNewSession } = useStore()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-700">
      <span className="text-4xl opacity-30">⌬</span>
      <p className="text-sm font-medium text-zinc-500">No active session</p>
      <p className="max-w-[220px] text-center text-xs text-zinc-700">
        Start a new session to begin working with pi.
      </p>
      <button
        onClick={openNewSession}
        className="mt-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs text-emerald-500 transition-colors hover:bg-zinc-800"
      >
        ＋ New session
      </button>
    </div>
  )
}

export default function ChatPane() {
  const { session } = useStore()

  // Wire IPC events → store for the active session
  usePiEvents(session.sessionId)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Toolbar />
      {session.active ? (
        <>
          <MessageList />
          <InputArea />
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
```

- [ ] **Step 8: Run tests — expect pass**

```bash
pnpm test:run src/renderer/src/components/chat/ChatPane.test.tsx
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/src/components/chat/
git commit -m "feat: add ChatPane with MessageList, Toolbar, ToolCallEntry, and InputArea"
```

---

### Task 4: Settings Modal

**Files:**
- Create: `src/renderer/src/components/modals/SettingsModal.tsx`
- Create: `src/renderer/src/components/modals/SettingsModal.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/renderer/src/components/modals/SettingsModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SettingsModal from './SettingsModal'
import { useStore } from '../../store'

const mockSetApiKey = vi.fn(async () => {})
const mockSetDefaults = vi.fn(async () => {})
const mockListModels = vi.fn(async () => [])

vi.stubGlobal('window', {
  pi: {
    config: { setApiKey: mockSetApiKey, setDefaults: mockSetDefaults },
    models: { list: mockListModels },
    on: vi.fn(() => () => {}),
  },
})

function resetStore() {
  useStore.setState((useStore as unknown as { getInitialState: () => object }).getInitialState())
}

describe('SettingsModal', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('does not render when settingsOpen is false', () => {
    render(<SettingsModal />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders sections when open', () => {
    useStore.getState().openSettings()
    render(<SettingsModal />)
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Defaults')).toBeInTheDocument()
    expect(screen.getByText('System Prompt')).toBeInTheDocument()
  })

  it('calls config.setApiKey when Save is clicked', async () => {
    useStore.getState().openSettings()
    useStore.getState().setConfig({
      providers: [{ name: 'anthropic', authType: 'apikey', configured: false }],
      defaultModel: null, defaultProvider: null, defaultThinkingLevel: 'low', systemPrompt: '',
    })
    render(<SettingsModal />)
    const input = screen.getByPlaceholderText(/sk-ant/i)
    fireEvent.change(input, { target: { value: 'sk-ant-abc' } })
    fireEvent.click(screen.getByRole('button', { name: /save anthropic/i }))
    await waitFor(() => expect(mockSetApiKey).toHaveBeenCalledWith('anthropic', 'sk-ant-abc'))
  })

  it('closes when the X button is clicked', () => {
    useStore.getState().openSettings()
    render(<SettingsModal />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(useStore.getState().ui.settingsOpen).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/renderer/src/components/modals/SettingsModal.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement SettingsModal**

```tsx
// src/renderer/src/components/modals/SettingsModal.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import type { AppThinkingLevel } from '@shared/types'

const OAUTH_PROVIDERS = ['github-copilot', 'claude-pro', 'google-gemini-cli', 'openai-codex']
const THINKING_LEVELS: AppThinkingLevel[] = ['off', 'low', 'high']

export default function SettingsModal() {
  const { ui, config, closeSettings, setConfig, setModels } = useStore()
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt)
  const [thinking, setThinking] = useState<AppThinkingLevel>(config.defaultThinkingLevel)

  async function handleSaveApiKey(provider: string) {
    const key = apiKeys[provider]
    if (!key) return
    await window.pi.config.setApiKey(provider, key)
    // Refresh model list and config after key change
    const [models] = await Promise.all([window.pi.models.list()])
    setModels(models)
    setConfig({ ...config, providers: config.providers.map((p) => p.name === provider ? { ...p, configured: true } : p) })
  }

  async function handleSaveDefaults() {
    await window.pi.config.setDefaults({ defaultThinkingLevel: thinking, systemPrompt })
    setConfig({ ...config, defaultThinkingLevel: thinking, systemPrompt })
  }

  const apiKeyProviders = config.providers.filter((p) => p.authType === 'apikey')
  const oauthProviders = config.providers.filter((p) => p.authType === 'oauth')

  return (
    <Dialog open={ui.settingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-zinc-800 bg-[#161616] text-zinc-200 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Settings</DialogTitle>
          <Button
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={closeSettings}
            className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
          >
            ✕
          </Button>
        </DialogHeader>

        {/* OAuth Providers */}
        {oauthProviders.length > 0 && (
          <div className="border-t border-zinc-900 pt-4">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">Connected Accounts</p>
            {oauthProviders.map((p) => (
              <div key={p.name} className="mb-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">{p.name}</span>
                {p.configured ? (
                  <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-400">● connected</span>
                ) : (
                  <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                    Run <code className="font-mono">pi /login</code> in terminal
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* API Keys */}
        <div className="border-t border-zinc-900 pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">API Keys</p>
          {apiKeyProviders.map((p) => (
            <div key={p.name} className="mb-3 flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-zinc-400">{p.name}</span>
              <Input
                type="password"
                placeholder={p.name === 'anthropic' ? 'sk-ant-…' : p.name === 'openai' ? 'sk-…' : 'API key'}
                value={apiKeys[p.name] ?? ''}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.name]: e.target.value }))}
                className={cn(
                  'flex-1 border-zinc-800 bg-zinc-900 font-mono text-xs',
                  p.configured && 'border-emerald-900 text-emerald-400'
                )}
              />
              <Button
                aria-label={`Save ${p.name}`}
                size="sm"
                onClick={() => handleSaveApiKey(p.name)}
                disabled={!apiKeys[p.name]}
                className="border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Save
              </Button>
            </div>
          ))}
        </div>

        {/* Defaults */}
        <div className="border-t border-zinc-900 pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">Defaults</p>
          <div className="mb-3">
            <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-zinc-600">Thinking Level</label>
            <div className="flex overflow-hidden rounded border border-zinc-800">
              {THINKING_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setThinking(level)}
                  className={cn(
                    'flex-1 py-1.5 text-xs capitalize',
                    thinking === level ? 'bg-emerald-950 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="border-t border-zinc-900 pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">System Prompt</p>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="Global default system prompt for all sessions…"
            className="border-zinc-800 bg-zinc-900 text-xs text-zinc-300 placeholder-zinc-700"
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleSaveDefaults}
              className="bg-emerald-950 text-xs text-emerald-400 hover:bg-emerald-900"
            >
              Save defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/renderer/src/components/modals/SettingsModal.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/modals/SettingsModal.tsx src/renderer/src/components/modals/SettingsModal.test.tsx
git commit -m "feat: add SettingsModal with API keys, OAuth status, and defaults"
```

---

### Task 5: Wire everything into App + keyboard shortcuts

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Update App.tsx to mount all components**

```tsx
// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useStore } from './store'
import Sidebar from './components/sidebar/Sidebar'
import ChatPane from './components/chat/ChatPane'
import NewSessionDialog from './components/modals/NewSessionDialog'
import SettingsModal from './components/modals/SettingsModal'

export default function App() {
  const { setConfig, setModels, openSettings } = useStore()

  // Load config + models on startup
  useEffect(() => {
    Promise.all([window.pi.config.get(), window.pi.models.list()])
      .then(([config, models]) => {
        setConfig(config)
        setModels(models)
      })
      .catch(console.error)
  }, [setConfig, setModels])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettings()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSettings])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <ChatPane />
      <NewSessionDialog />
      <SettingsModal />
    </div>
  )
}
```

- [ ] **Step 2: Update App test**

```tsx
// src/renderer/src/App.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.stubGlobal('window', {
  pi: {
    config: {
      get: vi.fn(async () => ({ providers: [], defaultModel: null, defaultProvider: null, defaultThinkingLevel: 'low', systemPrompt: '' })),
    },
    models: { list: vi.fn(async () => []) },
    on: vi.fn(() => () => {}),
  },
})

describe('App', () => {
  it('renders sidebar and chat pane', () => {
    render(<App />)
    // Sidebar logo
    expect(screen.getByText('pi-ui')).toBeInTheDocument()
    // Chat empty state
    expect(screen.getByText(/no active session/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 4: Run full check**

```bash
pnpm check
```

Expected: typecheck, lint, and all tests pass with no errors.

- [ ] **Step 5: Start the app and do a manual smoke test**

```bash
pnpm dev
```

Verify:
- Dark window opens with sidebar on the left, chat area on the right
- Sidebar shows "No models" until a provider is configured
- Clicking `+` opens the New Session dialog
- Clicking ⚙ Settings (or pressing `Cmd+,`) opens the Settings modal
- Settings modal shows OAuth Providers and API Keys sections
- Entering an API key and clicking Save calls `config:setApiKey`
- After saving, the model list populates in the sidebar
- Starting a session opens the chat pane with the toolbar
- Typing a message and pressing Enter sends it to pi and streams the response

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/App.test.tsx
git commit -m "feat: wire all components into App shell with Cmd+, keyboard shortcut"
```

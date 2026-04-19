# pi-ui Phase 1 — Design Spec

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Phase 1 — provider authentication + single session interaction

---

## 1. Overview

pi-ui is a desktop application (macOS only, v1) that wraps the pi coding agent, providing a graphical interface for session management and real-time visibility into agent actions. It does not replace pi — it embeds it directly via the pi Node.js SDK (`@mariozechner/pi-coding-agent`).

**Phase 1** delivers the minimum useful product: configure providers and run a single interactive coding session.

**Subsequent phases** (out of scope here):
- Phase 2: Session history sidebar, multi-tab layout, diff pane
- Phase 3: Quality-of-life utilities (command palette, notifications, search)

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Desktop shell | Electron | Node.js runtime required to use pi SDK directly |
| Frontend | React + TypeScript (Vite) | Strong ecosystem, good component libraries |
| Styling | Tailwind CSS + shadcn/ui | Dark theme, terminal-aesthetic |
| State management | Zustand | Simple, minimal boilerplate |
| Pi integration | `@mariozechner/pi-coding-agent` SDK | Type-safe, protocol-change-proof, no subprocess |
| Theme | Dark only | Single opinionated theme |
| Platform | macOS only | v1 scope |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────┐
│           Renderer Process (React + Vite)            │
│   Sidebar │ ChatPane │ NewSessionDialog │ Settings   │
│                  Zustand store                       │
└─────────────────────┬────────────────────────────────┘
                      │ window.pi (contextBridge)
              ┌───────▼────────┐
              │ Preload Script │  exposes typed IPC API
              └───────┬────────┘
                      │ ipcRenderer / ipcMain
┌─────────────────────▼────────────────────────────────┐
│             Main Process (Node.js)                   │
│  SessionService   AuthService   ModelService         │
│  SettingsService  IpcBridge                          │
│                                                      │
│  — owns all SDK instances                            │
│  — forwards SDK events → renderer                    │
└─────────────────────┬────────────────────────────────┘
                      │ pi Node.js SDK (in-process)
              ┌───────▼──────────────────────┐
              │  @mariozechner/pi-coding-agent│
              │  AgentSession  AuthStorage    │
              │  ModelRegistry SettingsManager│
              └──────────────────────────────┘
                      │
              ~/.pi/agent/auth.json
              ~/.pi/agent/settings.json
              ~/.pi/agent/sessions/
```

### 3.1 Process Responsibilities

**Main process** owns all SDK objects and all Node.js I/O:
- `AuthStorage.create()` — reads/writes `~/.pi/agent/auth.json`
- `ModelRegistry.create(authStorage)` — resolves available models
- `SettingsManager.create()` — reads/writes `~/.pi/agent/settings.json`
- `AgentSession` — one instance per active session (Phase 1 has one at a time)
- `IpcBridge` — maps SDK events to `webContents.send()` calls; handles `ipcMain` command handlers

**Renderer process** is sandboxed (no direct Node.js access):
- All communication via `window.pi` API exposed through the preload `contextBridge`
- Holds UI state in Zustand
- Never touches the filesystem directly

**Preload script** exposes a typed `window.pi` object via `contextBridge`:

```typescript
interface PiAPI {
  // Commands
  session: {
    create(opts: { cwd: string; model: string; provider: string; thinkingLevel: ThinkingLevel }): Promise<void>;
    send(message: string): Promise<void>;
    abort(): Promise<void>;
  };
  config: {
    get(): Promise<AppConfig>;
    setApiKey(provider: string, key: string): Promise<void>;
    setDefaults(opts: { model?: string; provider?: string; thinkingLevel?: ThinkingLevel; systemPrompt?: string }): Promise<void>;
  };
  models: {
    list(): Promise<ModelEntry[]>;
  };
  // Events
  on(event: PiEvent, handler: (payload: unknown) => void): () => void;
}
```

### 3.2 IPC Surface (Phase 1)

**Commands (renderer → main via `ipcMain.handle`)**

| Channel | Payload | Description |
|---|---|---|
| `session:create` | `{ cwd, model, provider, thinkingLevel }` | Create `AgentSession`, subscribe to events |
| `session:send` | `{ message }` | Call `session.prompt(message)` |
| `session:abort` | — | Call `session.abort()` |
| `config:get` | — | Return serialised `AppConfig` |
| `config:setApiKey` | `{ provider, key }` | Write key to `auth.json` via `AuthStorage` |
| `config:setDefaults` | `{ model?, provider?, thinkingLevel?, systemPrompt? }` | Write to `settings.json` via `SettingsManager` |
| `models:list` | — | Return `ModelEntry[]` from `ModelRegistry.getAvailable()` |

**Events (main → renderer via `webContents.send`)**

| Channel | Payload | SDK source |
|---|---|---|
| `pi:token` | `{ delta: string }` | `message_update` + `text_delta` |
| `pi:tool-start` | `{ toolCallId, toolName, args }` | `tool_execution_start` |
| `pi:tool-end` | `{ toolCallId, toolName, result, isError, durationMs }` | `tool_execution_end` |
| `pi:turn-end` | — | `turn_end` (one LLM response + its tool calls complete) |
| `pi:idle` | — | `agent_end` (entire prompt run finished, agent ready for input) |
| `pi:error` | `{ message: string }` | caught exceptions from `session.prompt()` |

---

## 4. Features

### 4.1 App Layout

Persistent two-column layout:

```
┌─────────────────────────────────────────────────────┐
│  pi-ui                                          [−][□][✕] │  ← native title bar
├──────────────┬──────────────────────────────────────┤
│              │  Toolbar                             │
│   Sidebar    │  ─────────────────────────────────   │
│              │                                      │
│  Models      │  Chat Pane                           │
│  Providers   │  (empty state or messages)           │
│              │                                      │
│              │  ─────────────────────────────────   │
│  [⚙ Settings]│  Input area                         │
└──────────────┴──────────────────────────────────────┘
```

### 4.2 Sidebar

The sidebar is always visible. In Phase 1 it serves two purposes: model selection and provider status. In Phase 2 it gains session history.

**Model list**
- Populated from `ModelRegistry.getAvailable()` on startup and after any auth change
- Each entry: status dot (green = available, dim = not configured), model name, provider name
- Clicking a model row selects it as the default for new sessions
- Selected model is highlighted

**Provider status**
- One row per configured provider, showing name and status chip: `connected` (OAuth), `configured` (API key present), `no key`
- Status derived from `AuthStorage` — check which providers have entries in `auth.json`
- Clicking a provider row opens the Settings modal scrolled to that provider

**Footer**
- Single "⚙ Settings" button (also triggered by `Cmd+,`)

### 4.3 New Session Dialog

Triggered by the `+` button in the sidebar header. A modal dialog with three fields:

| Field | Control | Default |
|---|---|---|
| Working directory | Text input + Browse button (native folder picker) | Last used directory (persisted in Electron `userData` store), or `~` on first launch |
| Model | Dropdown grouped by provider | Default model from `settings.json` |
| Thinking level | Segmented control: Off / Low / High | Default from `settings.json` |

**[Start Session]** button:
1. Calls `session:create` with the selected options
2. Closes the dialog
3. Transitions chat pane from empty state to active

### 4.4 Chat Pane

**Toolbar** (above messages):
- Model dropdown — changing it calls `session:send` with the equivalent `/model` command mid-session via `session.setModel()`
- Thinking segmented control — Off / Low / High
- Working directory shown right-aligned, clickable to open in Finder

**Message list**:
- User messages: role label "You", message text
- Assistant messages: role label "pi", content streamed token by token via `pi:token` events
- Tool calls: inline between messages as collapsed single-line entries showing `▸ toolName  path/or/command  duration ✓/✗`
- Expand tool call on click (Phase 2 detail — Phase 1 can show collapsed only)
- Auto-scrolls to bottom during streaming; stops auto-scroll if user scrolls up

**Input area**:
- Multiline textarea, `Enter` sends, `Shift+Enter` newlines
- While pi is active: textarea disabled, replaced with "pi is working…" placeholder + **[■ Stop]** button
- Stop calls `session:abort`

**Status bar** (below input):
- Left: status dot + label (`● idle` / `● thinking`)
- Right: model name + working directory

**Empty state** (no active session):
- Centered illustration, "No active session" heading, "＋ New session" button

### 4.5 Settings Modal

Triggered by `Cmd+,` or the sidebar footer button. Three sections:

**OAuth Providers**
- One row per subscription provider: GitHub Copilot, Claude Pro/Max, Google Gemini, OpenAI Codex
- Each row: provider name, status (`connected` chip or `Connect` button)
- `Connect` opens a new Electron `BrowserWindow` pointing to pi's OAuth flow (pi handles this via its existing `/login` command — Phase 1 defers full OAuth UI; button shows a message directing user to `pi /login` in terminal if OAuth flow is complex)

**API Keys**
- One row per API-key provider: Anthropic, OpenAI, Google, Mistral, Groq, xAI, OpenRouter, others
- Each row: provider name, masked password input, Save button
- Save calls `config:setApiKey`; on success, `models:list` is refreshed and sidebar model list updates
- Configured rows show key masked as `sk-ant-••••••` with green border tint

**Defaults**
- Default model: dropdown (same as New Session dialog)
- Thinking level: segmented control Off / Low / Medium / High
- System prompt: multiline textarea

All saves call `config:setDefaults` and persist via `SettingsManager`.

---

## 5. State Model

### Zustand store shape

```typescript
interface AppStore {
  // Session state
  session: {
    active: boolean;
    cwd: string | null;
    model: string | null;
    provider: string | null;
    thinkingLevel: ThinkingLevel;
    status: 'idle' | 'thinking' | 'error';
    messages: Message[];
    currentStreamingContent: string; // partial assistant text being streamed
  };

  // Config (mirrors main process state, loaded on startup)
  config: {
    providers: ProviderStatus[];   // name, authType, configured: boolean
    defaultModel: string | null;
    defaultProvider: string | null;
    defaultThinkingLevel: ThinkingLevel;
    systemPrompt: string;
  };

  // Available models (from ModelRegistry)
  models: ModelEntry[];

  // UI state
  ui: {
    settingsOpen: boolean;
    newSessionOpen: boolean;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCall[];
  createdAt: number;
}

interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result: string | null;
  isError: boolean;
  durationMs: number | null;
  status: 'pending' | 'done';
}

type ThinkingLevel = 'off' | 'low' | 'medium' | 'high';

interface ModelEntry {
  provider: string;
  modelId: string;
  displayName: string;
  supportsThinking: boolean;
}

interface ProviderStatus {
  name: string;
  authType: 'oauth' | 'apikey';
  configured: boolean;
}

interface AppConfig {
  providers: ProviderStatus[];
  defaultModel: string | null;
  defaultProvider: string | null;
  defaultThinkingLevel: ThinkingLevel;
  systemPrompt: string;
}
```

---

## 6. Main Process Structure

```
src/
  main/
    index.ts              # Electron app bootstrap, BrowserWindow creation
    ipc-bridge.ts         # ipcMain.handle registrations, webContents.send wrappers
    session-service.ts    # owns AgentSession, calls SDK, emits events to ipc-bridge
    auth-service.ts       # owns AuthStorage, exposes get/set API key methods
    model-service.ts      # owns ModelRegistry, exposes list() 
    settings-service.ts   # owns SettingsManager, exposes get/set methods
  preload/
    index.ts              # contextBridge.exposeInMainWorld('pi', ...)
  renderer/
    main.tsx              # React entry point
    App.tsx               # Root layout: Sidebar + ChatPane
    components/
      Sidebar.tsx
      ChatPane.tsx
      Toolbar.tsx
      MessageList.tsx
      ToolCallEntry.tsx
      InputArea.tsx
      NewSessionDialog.tsx
      SettingsModal.tsx
    store/
      index.ts            # Zustand store
      session.ts          # session slice
      config.ts           # config slice
    hooks/
      usePiEvents.ts      # subscribes to window.pi.on(...) events, updates store
```

---

## 7. Data Flow: Sending a Message

1. User types message, presses `Enter`
2. React `InputArea` calls `window.pi.session.send(message)`
3. Preload forwards via `ipcRenderer.invoke('session:send', { message })`
4. Main `IpcBridge` handler calls `sessionService.send(message)`
5. `SessionService` calls `agentSession.prompt(message)`
6. SDK emits `message_update` events with `text_delta` → `IpcBridge` calls `webContents.send('pi:token', { delta })`
7. Renderer `usePiEvents` hook receives `pi:token`, appends delta to `store.session.currentStreamingContent`
8. `MessageList` renders the accumulating content live
9. SDK emits `tool_execution_start` → `pi:tool-start` → store adds `ToolCall` with `status: 'pending'`
10. SDK emits `tool_execution_end` → `pi:tool-end` → store updates `ToolCall` with result + duration
11. SDK emits `agent_end` → `pi:idle` → store sets `status: 'idle'`, finalises streaming message

---

## 8. Startup Sequence

1. Electron creates `BrowserWindow`
2. Main process instantiates `AuthService`, `ModelService`, `SettingsService` (no session yet)
3. Renderer loads, `usePiEvents` hook registers event listeners
4. Renderer calls `config:get` + `models:list` on mount
5. Store is hydrated with provider status, available models, and defaults
6. App renders with sidebar populated, chat pane in empty state
7. User opens New Session dialog, fills in options, clicks Start
8. `session:create` is called → `SessionService` creates `AgentSession` → ready

---

## 9. Out of Scope (Phase 1)

- Multi-tab / multi-session
- Session history sidebar
- Diff pane
- File attachments
- Token usage display
- Command palette
- Desktop notifications
- Session search
- Session rename / tags
- Full OAuth login flow (Phase 1 shows status; full connect UI deferred)
- Windows / Linux support

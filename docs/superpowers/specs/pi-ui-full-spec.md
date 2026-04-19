# pi-ui — Full Product Spec & Roadmap

**Version:** 0.2
**Status:** Living document — updated after each phase design session
**Last updated:** 2026-04-19

---

## 1. Overview

pi-ui is a macOS desktop application that wraps the [pi coding agent](https://pi.dev), providing a graphical interface for session management, model selection, multi-session workflows, and real-time visibility into agent actions. It does not replace pi — it embeds it directly via the pi Node.js SDK.

**Core principle:** Stay out of the way. No additional abstractions over pi's capabilities. The UI surfaces what pi already does.

---

## 2. Goals

- Make pi sessions persistent, browsable, and resumable without touching the terminal
- Support multiple concurrent pi sessions in a tabbed interface
- Provide real-time visibility into what pi is doing (tool calls, file diffs)
- Remain maintainable as pi evolves — use the SDK, not subprocess parsing

## 3. Non-Goals (v1)

- Branching / non-linear session trees (linear sessions only)
- Export or share sessions
- Tool approval or permission gating
- Extension management
- Multiple UI themes
- Mobile or web version
- Cloud sync of sessions
- Windows / Linux support

---

## 4. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Desktop shell | Electron | Node.js runtime required for pi SDK; no Rust translation layer |
| Frontend | React + TypeScript (Vite) | Strong ecosystem, good component libraries |
| Styling | Tailwind CSS + shadcn/ui | Dark theme, terminal-aesthetic |
| State management | Zustand | Simple, minimal boilerplate |
| Pi integration | `@mariozechner/pi-coding-agent` SDK | Type-safe, protocol-change-proof, no subprocess spawning |
| Theme | Dark only | Single opinionated theme |
| Platform | macOS only | v1 scope |

### Why Electron over Tauri

The pi Node.js SDK (`@mariozechner/pi-coding-agent`) uses Node.js APIs that cannot run in a browser WebView or Rust process. Electron provides a Node.js main process where the SDK runs natively — no subprocess spawning, no JSONL parsing, no protocol translation layer. When pi updates its internal protocol, we get the changes automatically via an SDK version bump.

---

## 5. Architecture

```
┌──────────────────────────────────────────────────────┐
│           Renderer Process (React + Vite)            │
│   Sidebar │ TabBar │ ChatPane │ DiffPane │ Modals    │
│                  Zustand store                       │
└─────────────────────┬────────────────────────────────┘
                      │ window.pi (contextBridge)
              ┌───────▼────────┐
              │ Preload Script │  typed IPC bridge
              └───────┬────────┘
                      │ ipcRenderer / ipcMain
┌─────────────────────▼────────────────────────────────┐
│             Main Process (Node.js / Electron)        │
│  SessionService   AuthService   ModelService         │
│  SettingsService  SessionStore  IpcBridge            │
│                                                      │
│  — owns all SDK instances                            │
│  — one AgentSession per open tab                     │
│  — forwards SDK events → renderer                    │
└─────────────────────┬────────────────────────────────┘
                      │ @mariozechner/pi-coding-agent (in-process)
              ┌───────▼──────────────────────────────┐
              │  AgentSession    AuthStorage          │
              │  ModelRegistry   SettingsManager      │
              │  SessionManager                       │
              └──────────────────────────────────────┘
                      │
              ~/.pi/agent/auth.json
              ~/.pi/agent/settings.json
              ~/.pi/agent/sessions/
```

### 5.1 Process Responsibilities

**Main process** owns all SDK objects and all Node.js I/O:
- `AuthStorage` — reads/writes `~/.pi/agent/auth.json`
- `ModelRegistry` — resolves available models with valid credentials
- `SettingsManager` — reads/writes `~/.pi/agent/settings.json`
- `SessionService` — creates/destroys `AgentSession` instances (one per tab in Phase 2+)
- `SessionStore` — reads session JSONL files from `~/.pi/agent/sessions/` (Phase 2+)
- `IpcBridge` — registers `ipcMain` handlers, routes SDK events to renderer

**Renderer process** is sandboxed (no direct Node.js access). All communication via `window.pi` contextBridge API. Holds all UI state in Zustand.

**Preload script** exposes a typed `window.pi` API via Electron's `contextBridge`.

### 5.2 IPC Contract

**Commands (renderer → main)**

| Channel | Payload | Description |
|---|---|---|
| `session:create` | `{ cwd, model, provider, thinkingLevel }` | Spawn `AgentSession`, return `sessionId` |
| `session:send` | `{ sessionId, message }` | Call `session.prompt()` |
| `session:abort` | `{ sessionId }` | Call `session.abort()` |
| `session:close` | `{ sessionId }` | Dispose session, free resources |
| `session:load` | `{ sessionId }` | Read past session JSONL, return messages |
| `session:resume` | `{ sessionId }` | Create new `AgentSession` continuing from saved session |
| `session:setModel` | `{ sessionId, model, provider }` | Call `session.setModel()` |
| `session:setThinking` | `{ sessionId, level }` | Call `session.setThinkingLevel()` |
| `config:get` | — | Return `AppConfig` |
| `config:setApiKey` | `{ provider, key }` | Write key via `AuthStorage` |
| `config:setDefaults` | `{ model?, provider?, thinkingLevel?, systemPrompt? }` | Write via `SettingsManager` |
| `models:list` | — | Return `ModelEntry[]` from `ModelRegistry.getAvailable()` |
| `sessions:list` | — | Return all past sessions from `~/.pi/agent/sessions/` |
| `sessions:updateMeta` | `{ sessionId, name?, tags?, pinned? }` | Write to `.meta.json` sidecar |

**Events (main → renderer)**

| Channel | Payload | SDK source |
|---|---|---|
| `pi:token` | `{ sessionId, delta }` | `message_update` + `text_delta` |
| `pi:tool-start` | `{ sessionId, toolCallId, toolName, args }` | `tool_execution_start` |
| `pi:tool-end` | `{ sessionId, toolCallId, toolName, result, isError, durationMs }` | `tool_execution_end` |
| `pi:turn-end` | `{ sessionId }` | `turn_end` |
| `pi:idle` | `{ sessionId }` | `agent_end` |
| `pi:error` | `{ sessionId, message }` | caught exception from `session.prompt()` |

---

## 6. UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  pi-ui                        Tab 1: auth   Tab 2: tests        [+] │  ← title bar + tab bar (Phase 2)
├─────────────────┬─────────────────────────────────┬──────────────────┤
│                 │                                 │                  │
│  SIDEBAR        │  CHAT PANE                      │  DIFF PANE       │
│                 │                                 │  (Phase 2)       │
│  🔍 Search      │  ┌─ Toolbar ─────────────────┐  │                  │
│  (Phase 2)      │  │ model ▾  ◉Low  ~/proj     │  │  src/auth.ts     │
│  ─────────────  │  └───────────────────────────┘  │  ─────────────   │
│  Models         │                                 │  diff view       │
│  > sonnet  ●    │  [message list]                 │                  │
│    gpt-5        │                                 │                  │
│    gemini       │  [input area]                   │                  │
│  ─────────────  │  ─────────────────────────────  │                  │
│  Providers      │  ● idle · model · ~/proj        │                  │
│  Copilot  ✓     │                                 │                  │
│  Anthropic ✗    │                                 │                  │
│                 │                                 │                  │
│  [⚙ Settings]   │                                 │                  │
└─────────────────┴─────────────────────────────────┴──────────────────┘
```

The sidebar is always visible. The tab bar and diff pane are Phase 2 additions. The sidebar gains session history in Phase 2.

---

## 7. Phase Roadmap

### Phase 1 — Foundation (this phase)

**Deliverable:** Configure providers, run a single interactive session.

Full design: `docs/superpowers/specs/2026-04-19-pi-ui-phase1-design.md`

**Features:**
- Persistent sidebar with model list and provider status
- New Session dialog (cwd, model, thinking level)
- Chat pane with streaming messages and tool call log
- Settings modal: OAuth providers, API keys, defaults, system prompt
- Single active session at a time

**Architecture established:**
- Electron main + renderer + preload pattern
- All SDK instances owned by main process
- Typed `window.pi` contextBridge API
- Zustand store shape

---

### Phase 2 — Session History & Multi-Tab

**Deliverable:** Browse past sessions, run multiple sessions concurrently, inspect file diffs.

**Sidebar additions:**
- Session history list below providers, grouped by date (Today, Yesterday, past weeks)
- Each entry: session name (or first message truncated), working directory, model, last active timestamp
- Full-text search across session content (text input at top of sidebar)
- Right-click context menu: rename, add/remove tags, pin, delete
- Tags shown as small chips; pinned sessions float to top
- Metadata (name, tags, pin) stored in `~/.pi/agent/sessions/.meta.json` sidecar

**Tab bar:**
- Tabs across the top of the window, one per open session
- Tab shows: session name (or cwd basename), status dot (green=idle, yellow=thinking, red=error)
- `+` opens New Session dialog; `×` or `Cmd+W` closes tab (aborts if mid-turn)
- Drag to reorder; warn at ≥5 concurrent sessions
- Clicking a past session in the sidebar opens it in a new tab (read-only) or resumes it

**Diff pane:**
- Right panel of per-tab split view, hidden by default
- Auto-opens on first `write` or `edit` tool call in the session
- Shows most recent file change using Monaco Editor in diff mode (side-by-side)
- New tool calls replace the current diff
- Toggle button in toolbar to show/hide

**Inline diff comments:**
- Hover any diff line → `+` icon in gutter → click to open inline comment textarea
- Multiple comments across different lines before sending
- **[Send review to pi]** button in diff pane footer constructs a structured message and sends it to the active session's chat
- Comments are in-memory only; cleared when a new diff replaces the current one

**Architecture additions:**
- `SessionService` manages a map of `sessionId → AgentSession`
- `SessionStore` reads JSONL files, writes `.meta.json`
- `session:load` and `session:resume` IPC commands
- Monaco Editor integration in renderer

---

### Phase 3 — Quality of Life

**Deliverable:** Polish, productivity shortcuts, ambient awareness.

**Command palette (`Cmd+K`):**

| Command | Action |
|---|---|
| `New session` | Opens New Session dialog |
| `Switch to [name]` | Focuses that tab |
| `Close current tab` | Closes active tab |
| `Open settings` | Opens Settings modal |
| `Toggle diff pane` | Shows/hides diff pane |
| `Interrupt` | Aborts active session |
| `Search sessions…` | Focuses sidebar search |
| `[session name]` | Jump to any open or past session |

Fuzzy-searchable, keyboard-navigable.

**File attachments:**
- Drag a file onto the input area, or click paperclip icon
- Attached files appear as chips above textarea (filename + size), each removable with `×`
- On send, file content is inlined as fenced code block prepended to the message
- Binary files rejected with error chip
- Attachments cleared after send

**Desktop notifications:**
- Native OS notification when a session transitions from active → idle and pi-ui is not focused
- Title: `pi-ui — [session name]`; Body: `Task complete in [working directory]`
- Clicking notification focuses app and switches to that tab
- Can be disabled in Settings

**Token usage:**
- Session token counts (input / output) displayed in status bar
- Sourced from `session.agent.state` after each `agent_end`
- Shown only when the active provider reports usage (Anthropic reliable; others best-effort)

---

## 8. Feature Reference

### 8.1 Session History (Phase 2)

Sessions are read from pi's JSONL files in `~/.pi/agent/sessions/`. pi-ui does not write to them. Metadata (name, tags, pin) is stored in a sidecar `~/.pi/agent/sessions/.meta.json` managed by pi-ui.

Sessions are resumed via `SessionManager.open(path)` → `createAgentSession({ sessionManager })`, which continues from the saved conversation history.

### 8.2 Model Selector

Available in the sidebar (default for new sessions) and the chat toolbar (mid-session change).

- Dropdown grouped by provider
- List sourced from `ModelRegistry.getAvailable()` — only shows models with valid credentials
- Mid-session change calls `session.setModel(model)`
- Current model shown in status bar

### 8.3 Settings

Three sections accessible via `Cmd+,` or sidebar footer:

**OAuth Providers** — GitHub Copilot, Claude Pro/Max, Google Gemini, OpenAI Codex. Status shown; Phase 1 defers full in-app OAuth flow (directs to `pi /login` in terminal). Phase 3 candidate for in-app OAuth window.

**API Keys** — Anthropic, OpenAI, Google, Mistral, Groq, xAI, OpenRouter, others. Written directly to `~/.pi/agent/auth.json` via `AuthStorage`. Saved keys trigger `models:list` refresh.

**Defaults** — Default model, thinking level (Off/Low/Medium/High), system prompt (global, used for all new sessions).

---

## 9. Data Model

### Active session (in-memory, Zustand)

```typescript
interface SessionState {
  id: string;
  cwd: string;
  model: string;
  provider: string;
  thinkingLevel: ThinkingLevel;
  status: 'idle' | 'thinking' | 'error';
  messages: Message[];
  currentStreamingContent: string;
  startedAt: number;
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
  diff: FileDiff | null;        // Phase 2: present for write/edit
}

interface FileDiff {
  path: string;
  before: string;
  after: string;
}

// Phase 2
interface DiffComment {
  id: string;
  lineNumber: number;
  side: 'before' | 'after';
  lineContent: string;
  content: string;
}
```

### Past session (from JSONL, read-only)

```typescript
interface SessionSummary {
  id: string;
  name: string | null;          // from .meta.json
  tags: string[];               // from .meta.json
  pinned: boolean;              // from .meta.json
  cwd: string;                  // from JSONL header
  model: string;                // from first message
  lastActiveAt: number;         // mtime of JSONL file
  firstMessage: string | null;  // truncated first user turn
}
```

### Config

```typescript
interface AppConfig {
  providers: ProviderStatus[];
  defaultModel: string | null;
  defaultProvider: string | null;
  defaultThinkingLevel: ThinkingLevel;
  systemPrompt: string;
}

interface ProviderStatus {
  name: string;
  authType: 'oauth' | 'apikey';
  configured: boolean;
}

interface ModelEntry {
  provider: string;
  modelId: string;
  displayName: string;           // "provider / modelId"
  supportsThinking: boolean;
}

type ThinkingLevel = 'off' | 'low' | 'medium' | 'high';
```

---

## 10. Source Structure (Full)

```
pi-ui/
  src/
    main/
      index.ts              # Electron bootstrap, BrowserWindow
      ipc-bridge.ts         # ipcMain.handle registrations + webContents.send
      session-service.ts    # AgentSession lifecycle (map of id → session)
      auth-service.ts       # AuthStorage wrapper
      model-service.ts      # ModelRegistry wrapper
      settings-service.ts   # SettingsManager wrapper
      session-store.ts      # JSONL reader, .meta.json writer (Phase 2)
    preload/
      index.ts              # contextBridge.exposeInMainWorld('pi', ...)
      types.ts              # PiAPI interface (shared with renderer via tsconfig paths)
    renderer/
      main.tsx
      App.tsx               # Root: Sidebar + [TabBar +] ChatPane [+ DiffPane]
      components/
        sidebar/
          Sidebar.tsx
          ModelList.tsx
          ProviderList.tsx
          SessionList.tsx   # Phase 2
          SessionSearch.tsx # Phase 2
        chat/
          ChatPane.tsx
          Toolbar.tsx
          MessageList.tsx
          MessageBubble.tsx
          ToolCallEntry.tsx
          InputArea.tsx
          FileChips.tsx     # Phase 3
        diff/
          DiffPane.tsx       # Phase 2
          DiffComment.tsx    # Phase 2
        tabs/
          TabBar.tsx         # Phase 2
          Tab.tsx            # Phase 2
        modals/
          NewSessionDialog.tsx
          SettingsModal.tsx
          CommandPalette.tsx # Phase 3
      store/
        index.ts
        session.ts          # active session(s) slice
        config.ts           # providers, models, defaults slice
        ui.ts               # modal open/close, active tab
        history.ts          # past sessions list (Phase 2)
      hooks/
        usePiEvents.ts      # window.pi.on(...) → store updates
        useAutoScroll.ts    # auto-scroll message list
      lib/
        format.ts           # message formatting helpers
  docs/
    superpowers/
      specs/
        2026-04-19-pi-ui-phase1-design.md
        (future phase specs added here)
```

---

## 11. Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Electron over Tauri** | pi SDK requires Node.js runtime; Tauri's WebView and Rust backend have no Node.js. Electron lets us use SDK in-process. |
| 2 | **pi Node.js SDK over `pi --mode rpc` subprocess** | SDK is type-safe, protocol-change-proof (update via npm), and eliminates a JSONL parsing layer. |
| 3 | **Persistent sidebar layout** | Sidebar visible in all phases; model/provider content in Phase 1 becomes session history in Phase 2 with no layout refactor. |
| 4 | **System prompt in Settings only** | System prompt is a global default, not a per-session field. Removed from New Session dialog to reduce noise. |
| 5 | **macOS only (v1)** | Simplifies packaging, native APIs, and testing surface. Cross-platform deferred. |
| 6 | **Sessions from pi JSONL (read-only)** | pi-ui reads pi's native session format; metadata (name, tags, pin) stored in a separate `.meta.json` sidecar so pi-ui never modifies pi's session files. |
| 7 | **Phase 1: single session** | Multi-session infrastructure (tab bar, session map) built in Phase 2; Phase 1 validates the core SDK integration with minimal complexity. |
| 8 | **`pi --mode json` vs `pi --mode rpc`** | `--mode json` is one-shot (prompt on CLI, exits). `--mode rpc` is bidirectional. Both are now superseded by direct SDK use; noted for historical context. |

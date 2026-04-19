# pi-ui — Full Product Spec & Roadmap

**Version:** 0.3
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
| Package manager | pnpm | Fast, strict, disk-efficient |
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

### Phase 1 — Foundation

**Deliverable:** Configure providers, run a single interactive session.

#### Sidebar

- Model list populated from `ModelRegistry.getAvailable()` on startup and after any auth change
- Each entry: status dot (green = available, dim = not configured), model name, provider name
- Clicking a model selects it as the default for new sessions
- Provider status section: one row per provider with `connected` / `configured` / `no key` chip; clicking opens Settings scrolled to that provider
- Footer: **⚙ Settings** button (also `Cmd+,`)

#### New Session Dialog

Triggered by `+` in the sidebar header. Three fields only:

| Field | Control | Default |
|---|---|---|
| Working directory | Text input + Browse (native folder picker) | Last used dir (persisted in Electron `userData`), or `~` on first launch |
| Model | Dropdown grouped by provider | Default model from `settings.json` |
| Thinking level | Segmented control: Off / Low / High | Default from `settings.json` |

System prompt is **not** a per-session field — it is set globally in Settings.

#### Chat Pane

**Toolbar:** model dropdown (calls `session.setModel()` mid-session), thinking segmented control (Off/Low/High), working directory right-aligned (clickable → opens in Finder).

**Message list:**
- User messages: role label "You" + message text
- Assistant messages: role label "pi" + content streamed token by token via `pi:token` events
- Tool calls: inline collapsed entries — `▸ toolName  path/command  duration ✓/✗`
- Auto-scrolls to bottom during streaming; pauses if user scrolls up

**Input area:**
- Multiline textarea; `Enter` sends, `Shift+Enter` adds newline
- While pi is active: disabled, shows "pi is working…" + **■ Stop** button (calls `session.abort()`)

**Status bar:** left — status dot + `idle` / `thinking`; right — model name + working directory.

**Empty state:** shown when no session is active — "No active session" heading + **＋ New session** button.

#### Settings Modal

**OAuth Providers** — GitHub Copilot, Claude Pro/Max, Google Gemini, OpenAI Codex. Shows `connected` chip or `Connect` button. Phase 1 defers full in-app OAuth; Connect button directs user to run `pi /login` in terminal.

**API Keys** — one row per provider (Anthropic, OpenAI, Google, Mistral, Groq, xAI, OpenRouter, others). Masked password input + Save button writes to `auth.json` via `AuthStorage`. Saving triggers `models:list` refresh. Configured rows show green-tinted border.

**Defaults** — default model dropdown, thinking level (Off/Low/Medium/High), system prompt textarea. All persisted via `SettingsManager`.

#### Startup Sequence

1. Electron creates `BrowserWindow`
2. Main process instantiates `AuthService`, `ModelService`, `SettingsService`
3. Renderer loads; `usePiEvents` hook registers event listeners
4. Renderer calls `config:get` + `models:list` on mount
5. Store hydrated with provider status, available models, defaults
6. App renders: sidebar populated, chat pane in empty state
7. User opens New Session dialog → clicks Start
8. `session:create` → `SessionService` creates `AgentSession` → ready

#### Architecture established

- Electron main + renderer + preload pattern
- All SDK instances owned by main process
- Typed `window.pi` contextBridge API
- Zustand store shape (see §9)

---

### Session A — Release Pipeline + E2E Test Infrastructure

**Deliverable:** Two things shipped together:
1. Automated GitHub Actions workflow that builds and publishes a `.dmg` on every tagged release. Users can download and run pi-ui without terminal setup.
2. E2E test suite using Playwright covering all Phase 1 features, plus E2E test specs (non-implemented) for Phase 2 sessions B–D and placeholders for future phases.

This ships before Phase 2 work begins — release infrastructure and test coverage from the first usable version.

**Build tooling:**
- `electron-builder` for packaging and `.dmg` creation
- Universal binary (Apple Silicon + Intel) via `--universal` flag
- App icon set (`.icns`)

**GitHub Actions workflow** (`.github/workflows/release.yml`):
- Triggers on `v*` tags (e.g. `v0.1.0`)
- Runs on `macos-latest` runner
- Steps: checkout → install deps → build renderer (Vite) → package with electron-builder → upload `.dmg` as GitHub Release asset
- Release notes auto-generated from tag annotation

**macOS code signing & notarization:**
- Requires an Apple Developer account ($99/year) — **optional for early distribution**
- Without signing, users see a Gatekeeper warning on first launch but can bypass it (right-click → Open, or `xattr -cr app.dmg` in terminal); acceptable for technical early adopters
- When ready for wider distribution: certificate stored as `APPLE_CERTIFICATE` GitHub secret (base64-encoded `.p12`), notarization credentials as `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD`
- `electron-builder` handles signing and notarization via its `afterSign` hook once credentials are configured

**Versioning:**
- Version sourced from `package.json`
- Tag `v0.1.0` → GitHub Release titled `pi-ui v0.1.0` with `.dmg` attached
- Pre-release tags (`v0.1.0-beta.1`) create draft/pre-release entries

**Auto-update (future):** `electron-updater` integration deferred — users re-download for now. Can be layered on later using GitHub Releases as the update feed.

**E2E test infrastructure:**
- Framework: Playwright with `@playwright/test` + `electron` launch support
- Tests live in `e2e/` at project root, separate from unit tests in `src/`
- Main process IPC is tested via mocked `window.pi` bridge in renderer; no real LLM calls
- Phase 1 tests: session creation dialog, provider/model list rendering, settings modal, chat message flow (mocked events), tool call display, abort, empty state
- Phase 2–D specs: written as `test.skip(...)` stubs with descriptions, ready to be fleshed out in each session
- CI: E2E tests run in GitHub Actions on every PR and push to `main` (headless, `xvfb-run` on Linux or macOS runner)

---

### Session B — Session History & Sidebar

**Deliverable:** Browse past pi sessions from the sidebar. Sessions are read-only; resuming a session opens it live in the chat pane (Phase C adds tabs).

*(Full design to be written in the Session B brainstorm. Spec summary from full roadmap below.)*

**Sidebar additions:**
- Session history list below providers, grouped by date (Today, Yesterday, past weeks)
- Each entry: session name (or first message truncated), working directory, model, last active timestamp
- Full-text search across session content (text input at top of sidebar)
- Right-click context menu: rename, add/remove tags, pin, delete
- Tags shown as small chips; pinned sessions float to top
- Metadata (name, tags, pin) stored in `~/.pi/agent/sessions/.meta.json` sidecar

**Architecture additions:**
- `SessionStore` — reads JSONL files from `~/.pi/agent/sessions/`, writes `.meta.json`
- `session:load` IPC command — returns `SessionSummary[]`
- `session:resume` IPC command — creates new `AgentSession` continuing from saved session
- `sessions:updateMeta` IPC command — writes to `.meta.json`
- `history` Zustand slice — past sessions list

---

### Session C — Tab Bar & Multi-Session

**Deliverable:** Run multiple pi sessions concurrently in tabs.

*(Full design to be written in the Session C brainstorm. Spec summary from full roadmap below.)*

**Tab bar:**
- Tabs across the top of the window, one per open session
- Tab: session name (or cwd basename), status dot (green=idle, yellow=thinking, red=error)
- `+` opens New Session dialog; `×` or `Cmd+W` closes tab (aborts if mid-turn)
- Drag to reorder; warn at ≥5 concurrent sessions
- Clicking a past session in the sidebar opens it in a new tab (read-only) or resumes it

**Architecture additions:**
- `SessionService` manages map of `sessionId → AgentSession`
- `ui` Zustand slice gains `activetabId`, `tabs: Tab[]`
- `TabBar` + `Tab` components

---

### Session D — Diff Pane

**Deliverable:** Real-time file diff view alongside the chat, with inline comments.

*(Full design to be written in the Session D brainstorm. Spec summary from full roadmap below.)*

**Diff pane:**
- Right panel of per-tab split view, hidden by default
- Auto-opens on first `write` or `edit` tool call in the session
- Shows most recent file change using Monaco Editor in diff mode (side-by-side)
- New tool calls replace the current diff
- Toggle button in toolbar to show/hide

**Inline diff comments:**
- Hover any diff line → `+` icon in gutter → click to open inline comment textarea
- Multiple comments across different lines before sending
- **[Send review to pi]** button constructs a structured message and sends it to the active session's chat
- Comments are in-memory only; cleared when a new diff replaces the current one

**Architecture additions:**
- `FileDiff` captured from `write`/`edit` tool call results
- Monaco Editor integration in renderer
- `DiffPane`, `DiffComment` components

---

### Phase 2 — Session History & Multi-Tab (legacy section, superseded by Sessions B–D above)

See Sessions B, C, and D above for the detailed breakdown.

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
| 9 | **electron-builder for packaging** | Standard Electron packaging tool; handles `.dmg` creation, universal binary, code signing, and notarization in one config. |
| 10 | **Release pipeline after Phase 1** | Ship the build infrastructure before adding features — every subsequent phase has a distributable artifact from day one. |
| 11 | **Code signing deferred** | Unsigned `.dmg` works for technical early adopters (one-time Gatekeeper bypass). Apple Developer account ($99/year) added when distributing to non-technical users. | | `--mode json` is one-shot (prompt on CLI, exits). `--mode rpc` is bidirectional. Both are now superseded by direct SDK use; noted for historical context. |

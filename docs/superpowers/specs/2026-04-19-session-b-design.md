# pi-ui Session B — Session History & Sidebar

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Session history in sidebar, read-only past session view, resume, metadata (rename/pin/delete)

---

## 1. Overview

Session B replaces the Models/Providers sidebar with a full session history browser. Users can see all past pi sessions grouped by working directory, search them, open them in a read-only view, and resume them as live sessions. Model selection moves entirely to the New Session dialog and chat toolbar. Provider status moves to Settings.

---

## 2. Architecture

### 2.1 Main process additions

**`src/main/session-store.ts`** — new service, owns all session history I/O:
- Uses `SessionManager.listAll()` from the pi SDK to get all sessions — returns `SessionInfo[]` with `path`, `id`, `cwd`, `name`, `created`, `modified`, `firstMessage`, `allMessagesText`
- Reads/writes `.meta.json` sidecar per cwd dir: `{ [sessionId]: { tags, pinned } }` — `name` is stored in the JSONL by the SDK itself (via `session_info` entries) so we only persist tags and pin state
- Returns `SessionSummary[]` sorted by `lastActiveAt` descending within each cwd group
- `load(sessionId)` uses `loadEntriesFromFile` + `parseSessionEntries` from the SDK to parse JSONL into `Message[]`
- `resume(sessionId)` calls `SessionManager.open(path)` → `createAgentSession({ sessionManager })` to continue from saved history

**`src/main/ipc-bridge.ts`** — new handlers:

| Channel | Direction | Description |
|---|---|---|
| `sessions:list` | renderer → main | Returns `SessionSummary[]` |
| `sessions:updateMeta` | renderer → main | Writes name/tags/pinned to `.meta.json` |
| `sessions:delete` | renderer → main | Removes entry from `.meta.json`; does not touch JSONL |
| `session:load` | renderer → main | Reads full JSONL, returns `Message[]` |
| `session:resume` | renderer → main | Creates new `AgentSession` from saved session, returns `{ sessionId }` |

### 2.2 Renderer additions

**`src/renderer/src/store/history-slice.ts`** — new Zustand slice:

```typescript
interface HistoryState {
  sessions: SessionSummary[]
  expandedCwds: string[]          // cwdSlugs currently expanded
  selectedSessionId: string | null
  loadedMessages: Message[]       // messages for read-only view
  loadStatus: 'idle' | 'loading' | 'error'
}
```

Sessions list refreshed: on app mount + after every `session:create` + after `session:resume`.

**`ChatPane.tsx`** gains a `readonly` view mode alongside `active` and empty state.

### 2.3 Preload additions

`window.pi.sessions` namespace added:

```typescript
sessions: {
  list(): Promise<SessionSummary[]>
  updateMeta(sessionId: string, patch: Partial<{ name: string; tags: string[]; pinned: boolean }>): Promise<void>
  delete(sessionId: string): Promise<void>
  load(sessionId: string): Promise<Message[]>
  resume(sessionId: string): Promise<{ sessionId: string }>
}
```

---

## 3. Data Model

**New shared types in `src/shared/types.ts`:**

```typescript
export interface SessionSummary {
  id: string
  path: string          // full path to JSONL file
  cwd: string           // full path e.g. /Users/marc/code/pi-ui
  cwdSlug: string       // dir name e.g. --Users-marc-code-pi-ui--
  lastActiveAt: number  // modified date of JSONL (ms)
  model: string | null  // from first model_change event in JSONL
  pinned: boolean       // from .meta.json
  tags: string[]        // from .meta.json
  name: string | null   // from SDK SessionInfo.name; null = use timestamp
  isActive: boolean     // true if sessionId matches a live session
}

export interface SessionMeta {
  [sessionId: string]: {
    tags: string[]        // tags managed by pi-ui
    pinned: boolean       // pin state managed by pi-ui
    // name is stored in the JSONL by the SDK, not here
  }
}
```

**Display name rule:** `name ?? formatTimestamp(lastActiveAt)` — e.g. `"Today 14:32"`, `"Yesterday 09:15"`, `"Apr 14 11:00"`.

---

## 4. UI

### 4.1 Sidebar layout

```
┌─────────────────────────┐
│ pi-ui              [+]  │  ← header (unchanged)
├─────────────────────────┤
│ 🔍 Search sessions…     │  ← SessionSearch
├─────────────────────────┤
│ ▾ pi-ui             ●  │  ← CwdGroup (expanded, has active session)
│   Today 14:32       ●  │  ← SessionEntry (active)
│   Today 11:05          │
│   Yesterday 16:44      │
│ ▸ factorial-backend    │  ← CwdGroup (collapsed)
│ ▸ factorial-agent      │
├─────────────────────────┤
│ ⚙ Settings      ⌘,    │  ← footer (unchanged)
└─────────────────────────┘
```

**Cwd groups:**
- Header: `▸`/`▾` chevron + cwd basename + full path tooltip
- Sorted by most recently active session within the group
- Collapsed by default when more than 3 groups exist
- The cwd group containing the active session is always expanded

**Session entries:**
- Status dot: green if `isActive`, grey otherwise
- Label: `name ?? formatTimestamp(lastActiveAt)`
- Pinned sessions: `📌` icon, float to top of their group
- Right-click context menu: Rename / Pin|Unpin / Delete
- Rename: inline `RenameInput` replaces label; `Enter` confirms, `Escape` cancels

**Search:**
- Filters by timestamp label and cwd path as user types
- Matching groups auto-expand; non-matching groups hidden
- `Escape` clears search and restores previous state

### 4.2 Read-only view

Activated when a past session entry is clicked.

**Toolbar:** model name and cwd shown as plain text (no dropdowns — not editable).

**Message list:** renders `Message[]` from `session:load` using existing `MessageList` + `ToolCallEntry` components.

**Loading state:** centered spinner while `session:load` is in flight.

**Error state:** centered error message + Retry button.

**Resume bar** (replaces InputArea):
```
  This is a past session                    Resume →
```
- `Resume →` calls `session:resume`, shows inline spinner while in flight
- On success: refreshes session list, switches chat pane to `active` mode with the new sessionId

---

## 5. Components

### Removed
- `src/renderer/src/components/sidebar/ModelList.tsx`
- `src/renderer/src/components/sidebar/ProviderList.tsx`

### New
| File | Responsibility |
|---|---|
| `src/main/session-store.ts` | JSONL scanning, `.meta.json` read/write, session load/resume |
| `src/renderer/src/store/history-slice.ts` | History Zustand slice |
| `src/renderer/src/components/sidebar/SessionSearch.tsx` | Controlled search input |
| `src/renderer/src/components/sidebar/SessionList.tsx` | Cwd group list, expand/collapse state |
| `src/renderer/src/components/sidebar/CwdGroup.tsx` | Single collapsible cwd group |
| `src/renderer/src/components/sidebar/SessionEntry.tsx` | Single session row + context menu |
| `src/renderer/src/components/sidebar/RenameInput.tsx` | Inline rename input |
| `src/renderer/src/components/chat/ResumeBar.tsx` | Resume button bar for read-only view |

### Modified
| File | Change |
|---|---|
| `src/shared/types.ts` | Add `SessionSummary`, `SessionMeta`, `sessions` namespace to `PiAPI` |
| `src/preload/index.ts` | Expose `window.pi.sessions.*` (real + mock) |
| `src/main/ipc-bridge.ts` | Register 5 new IPC handlers |
| `src/main/index.ts` | Instantiate `SessionStore`, pass to `IpcBridge` |
| `src/renderer/src/store/index.ts` | Add `history` slice |
| `src/renderer/src/App.tsx` | Call `sessions:list` on mount + after session create |
| `src/renderer/src/components/sidebar/Sidebar.tsx` | Replace ModelList/ProviderList with SessionSearch/SessionList |
| `src/renderer/src/components/chat/ChatPane.tsx` | Add readonly branch with ResumeBar |

---

## 6. E2E Tests

Session B implements the skipped stubs in `e2e/session-history.spec.ts` and adds any new scenarios discovered during implementation.

---

## 7. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Models/Providers removed from sidebar** | Session history takes the full sidebar area; model selection in dialog + toolbar is sufficient; provider status belongs in Settings |
| 2 | **Read-only view before tabs** | Useful on its own — lets users review past work; Resume creates a new live session in the single-pane view |
| 3 | **Grouped by cwd, not date** | pi sessions are inherently project-scoped; cwd grouping makes navigation more intuitive than a flat date list |
| 4 | **Collapsed groups by default (>3)** | Prevents overwhelming the sidebar when many projects exist |
| 5 | **No file watcher** | Refresh on session create covers the main live-update case; watcher adds dependency and complexity for negligible benefit at current scale |
| 6 | **`.meta.json` stores only tags + pin** | Session names are stored in the JSONL by the SDK via `session_info` entries; pi-ui only manages tags and pin state in its sidecar |
| 7 | **Timestamp-only default name** | Clean, no truncation issues, always accurate; custom names opt-in via rename |

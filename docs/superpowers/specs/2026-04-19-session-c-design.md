# pi-ui Session C — Tab Bar & Multi-Session

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Horizontal tab bar, concurrent pi sessions, tab lifecycle (create/close/switch), routing IPC events per-tab, sidebar past-session deduplication.

---

## 1. Overview

Session C adds a tab bar that lets users run multiple pi sessions concurrently. Each tab is an independent session with its own message history, streaming state, and status. Sessions run in the background when not visible — tokens and tool calls accumulate in memory and are visible when the tab is re-focused. No keyboard shortcuts for tab navigation are added in this session.

---

## 2. Store

`session-slice.ts` is deleted and replaced by `tabs-slice.ts`.

### 2.1 Types

```typescript
interface Tab {
  id: string                      // tabId == sessionId passed to IPC
  sessionId: string               // explicit alias of id
  cwd: string
  model: string
  provider: string
  thinkingLevel: AppThinkingLevel
  status: 'idle' | 'thinking' | 'error'
  messages: Message[]
  currentStreamingContent: string
  mode: 'active' | 'readonly' | 'loading' | 'error'
  readonlySessionId?: string      // past session id for readonly tabs
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
}
```

### 2.2 Actions

| Action | Description |
|---|---|
| `createTab(tab: Tab)` | Push tab, set as active |
| `closeTab(tabId: string)` | Remove tab; activate nearest remaining (prefer left, fallback right) |
| `setActiveTab(tabId: string)` | Set `activeTabId` |
| `setTabStatus(tabId, status)` | Update `status` on a tab |
| `setTabMode(tabId, mode)` | Update `mode` on a tab |
| `setTabMessages(tabId, messages)` | Replace messages (readonly load) |
| `addUserMessage(tabId, content)` | Push user message to tab |
| `appendToken(tabId, delta)` | Append streaming delta |
| `finalizeAssistantMessage(tabId)` | Flush `currentStreamingContent` to messages |
| `addToolCall(tabId, call)` | Add tool call to last message |
| `resolveToolCall(tabId, result)` | Mark tool call done |

### 2.3 `useActiveTab` hook

```typescript
// src/renderer/src/hooks/useActiveTab.ts
export function useActiveTab(): Tab | null {
  return useStore((s) => s.tabs.tabs.find((t) => t.id === s.tabs.activeTabId) ?? null)
}
```

All components that previously read `store.session.*` are updated to use `useActiveTab()`.

---

## 3. Tab Bar UI

The tab bar spans the chat-pane area only (not behind the sidebar). It sits at the same vertical height as the sidebar header, forming a single visual band across the top of the window.

```
┌─────────────────┬──────────────────────────────────────────────┐
│  pi-ui          │  pi-ui  ·  factorial-backend   [+]           │
├─────────────────┼──────────────────────────────────────────────┤
│  SIDEBAR        │  CHAT PANE                                   │
```

**Tab anatomy:**
- Status dot: yellow = `thinking`, green = `idle`, red = `error`, dim = `readonly`
- Label: `name ?? cwd basename`, truncated with ellipsis at 160px max width
- Close button (`×`): always visible on active tab; appears on hover for inactive tabs
- Active tab: lighter background, full-opacity label
- Inactive tabs: dimmer label

**`[+]` button:** sits after the last tab. Opens the New Session dialog. This is the only entry point for new sessions — the `+` button in the sidebar header is removed.

**Visibility:** the tab bar is hidden when `tabs.length === 0`. The existing empty state in `ChatPane` (with its "＋ New session" button) handles the zero-tab case.

---

## 4. Tab Lifecycle

### 4.1 Creating a tab

New Session dialog calls `session:create` → receives `{ sessionId }` → `createTab({ id: sessionId, sessionId, mode: 'active', status: 'idle', ... })`.

### 4.2 Opening a past session (from sidebar)

1. Sidebar `SessionEntry` click triggers `session:load` for messages and renders a readonly tab.
2. **Deduplication:** before creating, check `tabs.find(t => t.readonlySessionId === pastSessionId || t.sessionId === pastSessionId)`. If found, `setActiveTab` to that tab — no new tab created.
3. If not found: `createTab({ mode: 'loading', readonlySessionId: pastSessionId, ... })`, call `sessions.load(path)`, `setTabMessages` + `setTabMode('readonly')` on success, `setTabMode('error')` on failure.

### 4.3 Resuming a past session

Resume bar in a readonly tab calls `session:resume` → receives `{ sessionId }` → replaces the readonly tab in-place with an active tab (`id = sessionId`, `mode = 'active'`). Does not create a new tab.

### 4.4 Closing a tab

- `mode === 'readonly'` or `mode === 'loading'` or `mode === 'error'`: remove immediately, no IPC call.
- `status !== 'thinking'`: call `session:close`, then `closeTab`.
- `status === 'thinking'`: show native Electron `dialog.showMessageBox`:
  - Message: *"pi is still working. Close this tab and stop the session?"*
  - Buttons: **Cancel**, **Close tab**
  - On confirm: `session:abort` → `session:close` → `closeTab`.

After close, activate nearest tab: prefer the tab to the left, fallback to right. If no tabs remain, `activeTabId = null` and chat pane shows empty state.

---

## 5. IPC Event Routing

No new IPC channels are needed. All existing events (`pi:token`, `pi:tool-start`, `pi:tool-end`, `pi:turn-end`, `pi:idle`, `pi:error`) already carry `sessionId`.

`usePiEvents.ts` is updated to route each event to the matching tab by `sessionId` instead of always updating a single session slice:

```typescript
window.pi.on('pi:token', ({ sessionId, delta }) => {
  appendToken(sessionId, delta)
})
// etc.
```

Events for a sessionId with no matching tab are silently dropped (defensive guard).

---

## 6. Components

### New
| File | Responsibility |
|---|---|
| `src/renderer/src/store/tabs-slice.ts` | Tabs Zustand slice |
| `src/renderer/src/hooks/useActiveTab.ts` | Active tab selector hook |
| `src/renderer/src/components/tabs/TabBar.tsx` | Tab strip; hidden when empty |
| `src/renderer/src/components/tabs/Tab.tsx` | Single tab: dot, label, close button |

### Deleted
| File | Reason |
|---|---|
| `src/renderer/src/store/session-slice.ts` | Replaced by tabs-slice |

### Modified
| File | Change |
|---|---|
| `src/renderer/src/store/index.ts` | Swap session slice for tabs slice |
| `src/renderer/src/App.tsx` | Render `<TabBar />` between sidebar and chat pane |
| `src/renderer/src/components/sidebar/Sidebar.tsx` | Remove `+` button from header |
| `src/renderer/src/components/sidebar/SessionEntry.tsx` | Open past session in new tab with deduplication |
| `src/renderer/src/components/chat/ChatPane.tsx` | Use `useActiveTab()` instead of `store.session.*` |
| `src/renderer/src/components/chat/Toolbar.tsx` | Use `useActiveTab()` |
| `src/renderer/src/components/chat/InputArea.tsx` | Use `useActiveTab()` |
| `src/renderer/src/components/chat/ResumeBar.tsx` | Resume replaces tab in-place |
| `src/renderer/src/hooks/usePiEvents.ts` | Route events to tab by sessionId |

---

## 7. E2E Tests

`e2e/tabs.spec.ts` — implement all retained stubs:

| Test | Notes |
|---|---|
| Tab bar visible after creating a session | TabBar renders, tab count = 1 |
| Tab shows cwd basename and status dot | Label + dot present |
| Status dot yellow while thinking, green while idle | Mock `pi:token` + `pi:idle` events |
| Clicking `+` in tab bar opens New Session dialog | |
| Creating a second session opens new tab, switches to it | Tab count = 2, active = second |
| Clicking a tab switches chat pane to that session | Messages change |
| Each tab maintains independent message history | Tab 1 messages not in tab 2 |
| Closing a tab mid-turn shows confirmation prompt | Mock thinking state |
| Closing last tab returns to empty state | TabBar hidden, empty state shown |
| Clicking a past session in sidebar opens it in new tab | Readonly tab created |
| Clicking same past session again focuses existing tab | Tab count unchanged |

Removed stubs: `Cmd+W`, concurrency warning (cut from scope).

---

## 8. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Flat tab array in Zustand** | Minimal refactor; IPC events already keyed by sessionId; SessionService Map unchanged |
| 2 | **Background sessions buffer fully** | pi sessions are text-only; memory footprint is small; pausing creates confusing stall UX |
| 3 | **Tab bar chat-area-only** | Sidebar header stays as title strip; two rows form one visual band; no layout restructure needed |
| 4 | **Tab bar hidden at zero tabs** | Empty state button handles new-session entry point; ghost tab bar with just `+` is unnecessary |
| 5 | **No keyboard shortcuts** | Cut to keep scope tight; can be added in Phase 3 command palette session |
| 6 | **No concurrency warning** | pi sessions are lightweight; warning creates anxiety without actionable guidance |
| 7 | **Resume replaces tab in-place** | Avoids a ghost readonly tab lingering alongside the new live tab |
| 8 | **Past session deduplication** | Matches browser tab behavior; prevents confusing duplicates from repeated sidebar clicks |
| 9 | **Sidebar `+` removed** | Tab bar `+` is the single entry point; two `+` buttons with the same action is redundant |

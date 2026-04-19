// src/renderer/src/store/tabs-slice.ts
import type { Message, ToolCall, AppThinkingLevel } from '@shared/types'

const uuid = () => crypto.randomUUID()

export type TabMode = 'active' | 'readonly' | 'loading' | 'error'

export interface Tab {
  id: string // tabId == sessionId passed to IPC
  sessionId: string // explicit alias of id for call-site clarity
  cwd: string
  model: string
  provider: string
  thinkingLevel: AppThinkingLevel
  status: 'idle' | 'thinking' | 'error'
  messages: Message[]
  currentStreamingContent: string
  mode: TabMode
  readonlySessionId?: string // past session id for readonly/loading/error tabs
}

export interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
}

export interface TabsActions {
  createTab(tab: Tab): void
  closeTab(tabId: string): void
  setActiveTab(tabId: string): void
  setTabStatus(tabId: string, status: Tab['status']): void
  setTabMode(tabId: string, mode: TabMode): void
  setTabMessages(tabId: string, messages: Message[]): void
  addUserMessage(tabId: string, content: string): void
  appendToken(tabId: string, delta: string): void
  finalizeAssistantMessage(tabId: string): void
  addToolCall(
    tabId: string,
    call: { toolCallId: string; toolName: string; args: Record<string, unknown> }
  ): void
  resolveToolCall(
    tabId: string,
    result: { toolCallId: string; result: string; isError: boolean; durationMs: number }
  ): void
  replaceTab(tabId: string, newTab: Tab): void
}

export const initialTabsState: TabsState = {
  tabs: [],
  activeTabId: null,
}

export const createTabsSlice = (
  set: (fn: (s: { tabs: TabsState }) => void) => void
): TabsActions => ({
  createTab: (tab) =>
    set((s) => {
      s.tabs.tabs.push(tab)
      s.tabs.activeTabId = tab.id
    }),

  closeTab: (tabId) =>
    set((s) => {
      const idx = s.tabs.tabs.findIndex((t) => t.id === tabId)
      if (idx === -1) return
      s.tabs.tabs.splice(idx, 1)
      if (s.tabs.activeTabId === tabId) {
        const next = s.tabs.tabs[idx - 1] ?? s.tabs.tabs[idx] ?? null
        s.tabs.activeTabId = next?.id ?? null
      }
    }),

  setActiveTab: (tabId) =>
    set((s) => {
      s.tabs.activeTabId = tabId
    }),

  setTabStatus: (tabId, status) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (tab) tab.status = status
    }),

  setTabMode: (tabId, mode) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (tab) tab.mode = mode
    }),

  setTabMessages: (tabId, messages) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (tab) tab.messages = messages
    }),

  addUserMessage: (tabId, content) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (!tab) return
      tab.messages.push({
        id: uuid(),
        role: 'user',
        content,
        toolCalls: [],
        createdAt: Date.now(),
      })
    }),

  appendToken: (tabId, delta) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (tab) tab.currentStreamingContent += delta
    }),

  finalizeAssistantMessage: (tabId) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (!tab || !tab.currentStreamingContent) return
      tab.messages.push({
        id: uuid(),
        role: 'assistant',
        content: tab.currentStreamingContent,
        toolCalls: [],
        createdAt: Date.now(),
      })
      tab.currentStreamingContent = ''
    }),

  addToolCall: (tabId, { toolCallId, toolName, args }) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (!tab) return
      const last = tab.messages[tab.messages.length - 1]
      if (!last) return
      const call: ToolCall = {
        id: toolCallId,
        toolName,
        args,
        result: null,
        isError: false,
        durationMs: null,
        status: 'pending',
      }
      last.toolCalls.push(call)
    }),

  resolveToolCall: (tabId, { toolCallId, result, isError, durationMs }) =>
    set((s) => {
      const tab = s.tabs.tabs.find((t) => t.id === tabId)
      if (!tab) return
      for (const msg of tab.messages) {
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

  replaceTab: (tabId, newTab) =>
    set((s) => {
      const idx = s.tabs.tabs.findIndex((t) => t.id === tabId)
      if (idx === -1) return
      s.tabs.tabs[idx] = newTab
      s.tabs.activeTabId = newTab.id
    }),
})

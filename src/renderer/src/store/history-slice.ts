// src/renderer/src/store/history-slice.ts
import type { SessionSummary, Message } from '@shared/types'

export interface HistoryState {
  sessions: SessionSummary[]
  expandedCwds: string[]
  selectedSessionId: string | null
  loadedMessages: Message[]
  loadStatus: 'idle' | 'loading' | 'error'
}

export interface HistoryActions {
  setSessions(sessions: SessionSummary[]): void
  toggleCwdExpanded(cwdSlug: string): void
  selectSession(sessionId: string | null): void
  setLoadedMessages(messages: Message[]): void
  setLoadStatus(status: HistoryState['loadStatus']): void
  clearReadonly(): void
}

export const initialHistoryState: HistoryState = {
  sessions: [],
  expandedCwds: [],
  selectedSessionId: null,
  loadedMessages: [],
  loadStatus: 'idle',
}

export const createHistorySlice = (
  set: (fn: (s: { history: HistoryState }) => void) => void
): HistoryActions => ({
  setSessions: (sessions) =>
    set((s) => {
      s.history.sessions = sessions
    }),

  toggleCwdExpanded: (cwdSlug) =>
    set((s) => {
      const idx = s.history.expandedCwds.indexOf(cwdSlug)
      if (idx === -1) {
        s.history.expandedCwds.push(cwdSlug)
      } else {
        s.history.expandedCwds.splice(idx, 1)
      }
    }),

  selectSession: (sessionId) =>
    set((s) => {
      s.history.selectedSessionId = sessionId
    }),

  setLoadedMessages: (messages) =>
    set((s) => {
      s.history.loadedMessages = messages
      s.history.loadStatus = 'idle'
    }),

  setLoadStatus: (status) =>
    set((s) => {
      s.history.loadStatus = status
    }),

  clearReadonly: () =>
    set((s) => {
      s.history.selectedSessionId = null
      s.history.loadedMessages = []
      s.history.loadStatus = 'idle'
    }),
})

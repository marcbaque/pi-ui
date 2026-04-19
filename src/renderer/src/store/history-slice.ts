// src/renderer/src/store/history-slice.ts
import type { SessionSummary } from '@shared/types'

export interface HistoryState {
  sessions: SessionSummary[]
  expandedCwds: string[]
}

export interface HistoryActions {
  setSessions(sessions: SessionSummary[]): void
  toggleCwdExpanded(cwdSlug: string): void
}

export const initialHistoryState: HistoryState = {
  sessions: [],
  expandedCwds: [],
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
})

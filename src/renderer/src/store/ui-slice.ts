// src/renderer/src/store/ui-slice.ts

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error'

export interface UiState {
  settingsOpen: boolean
  newSessionOpen: boolean
  updateStatus: UpdateStatus
  updateVersion: string | null
  updateProgress: number | null
  updateError: string | null
}

export interface UiActions {
  openSettings(): void
  closeSettings(): void
  openNewSession(): void
  closeNewSession(): void
  setUpdateStatus(
    status: UpdateStatus,
    version?: string | null,
    progress?: number | null,
    error?: string | null
  ): void
}

export const initialUiState: UiState = {
  settingsOpen: false,
  newSessionOpen: false,
  updateStatus: 'idle',
  updateVersion: null,
  updateProgress: null,
  updateError: null,
}

export const createUiSlice = (set: (fn: (s: { ui: UiState }) => void) => void): UiActions => ({
  openSettings: () =>
    set((s) => {
      s.ui.settingsOpen = true
    }),
  closeSettings: () =>
    set((s) => {
      s.ui.settingsOpen = false
    }),
  openNewSession: () =>
    set((s) => {
      s.ui.newSessionOpen = true
    }),
  closeNewSession: () =>
    set((s) => {
      s.ui.newSessionOpen = false
    }),
  setUpdateStatus: (status, version = null, progress = null, error = null) =>
    set((s) => {
      s.ui.updateStatus = status
      if (version !== undefined) s.ui.updateVersion = version
      if (progress !== undefined) s.ui.updateProgress = progress
      if (error !== undefined) s.ui.updateError = error
    }),
})

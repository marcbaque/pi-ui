// src/renderer/src/store/ui-slice.ts
export interface UiState {
  settingsOpen: boolean
  newSessionOpen: boolean
}

export interface UiActions {
  openSettings(): void
  closeSettings(): void
  openNewSession(): void
  closeNewSession(): void
}

export const initialUiState: UiState = {
  settingsOpen: false,
  newSessionOpen: false,
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
})

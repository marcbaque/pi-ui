// src/renderer/src/store/index.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  initialSessionState,
  createSessionSlice,
  type SessionState,
  type SessionActions,
} from './session-slice'
import {
  initialConfigState,
  createConfigSlice,
  type ConfigState,
  type ConfigActions,
} from './config-slice'
import { initialUiState, createUiSlice, type UiState, type UiActions } from './ui-slice'

type AppStore = { session: SessionState; config: ConfigState; ui: UiState } & SessionActions &
  ConfigActions &
  UiActions

const initialState = {
  session: initialSessionState,
  config: initialConfigState,
  ui: initialUiState,
}

export const useStore = create<AppStore>()(
  immer((set) => ({
    ...initialState,
    ...createSessionSlice(set as Parameters<typeof createSessionSlice>[0]),
    ...createConfigSlice(set as Parameters<typeof createConfigSlice>[0]),
    ...createUiSlice(set as Parameters<typeof createUiSlice>[0]),
  }))
)

// Expose initial state for test resets
;(useStore as unknown as { getInitialState: () => typeof initialState }).getInitialState = () => ({
  ...initialState,
  session: { ...initialSessionState, messages: [] },
  config: { ...initialConfigState, providers: [], models: [] },
  ui: { ...initialUiState },
})

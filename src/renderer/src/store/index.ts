// src/renderer/src/store/index.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { initialTabsState, createTabsSlice, type TabsState, type TabsActions } from './tabs-slice'
import {
  initialConfigState,
  createConfigSlice,
  type ConfigState,
  type ConfigActions,
} from './config-slice'
import { initialUiState, createUiSlice, type UiState, type UiActions } from './ui-slice'
import {
  initialHistoryState,
  createHistorySlice,
  type HistoryState,
  type HistoryActions,
} from './history-slice'

type AppStore = {
  tabs: TabsState
  config: ConfigState
  ui: UiState
  history: HistoryState
} & TabsActions &
  ConfigActions &
  UiActions &
  HistoryActions

const initialState = {
  tabs: initialTabsState,
  config: initialConfigState,
  ui: initialUiState,
  history: initialHistoryState,
}

export const useStore = create<AppStore>()(
  immer((set) => ({
    ...initialState,
    ...createTabsSlice(set as Parameters<typeof createTabsSlice>[0]),
    ...createConfigSlice(set as Parameters<typeof createConfigSlice>[0]),
    ...createUiSlice(set as Parameters<typeof createUiSlice>[0]),
    ...createHistorySlice(set as Parameters<typeof createHistorySlice>[0]),
  }))
)
;(useStore as unknown as { getInitialState: () => typeof initialState }).getInitialState = () => ({
  ...initialState,
  tabs: { tabs: [], activeTabId: null },
  config: { ...initialConfigState, providers: [], models: [] },
  ui: { ...initialUiState },
  history: { ...initialHistoryState },
})

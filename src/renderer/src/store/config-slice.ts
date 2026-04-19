// src/renderer/src/store/config-slice.ts
import type { AppConfig, ModelEntry } from '@shared/types'

export interface ConfigState {
  providers: AppConfig['providers']
  defaultModel: string | null
  defaultProvider: string | null
  defaultThinkingLevel: AppConfig['defaultThinkingLevel']
  systemPrompt: string
  homedir: string
  models: ModelEntry[]
}

export interface ConfigActions {
  setConfig(config: AppConfig): void
  setModels(models: ModelEntry[]): void
}

export const initialConfigState: ConfigState = {
  providers: [],
  defaultModel: null,
  defaultProvider: null,
  defaultThinkingLevel: 'low',
  systemPrompt: '',
  homedir: '',
  models: [],
}

export const createConfigSlice = (
  set: (fn: (s: { config: ConfigState }) => void) => void
): ConfigActions => ({
  setConfig: (config) =>
    set((s) => {
      s.config = { ...s.config, ...config }
    }),

  setModels: (models) =>
    set((s) => {
      s.config.models = models
    }),
})

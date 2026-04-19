// e2e/helpers/defaults.ts
// Mirrors the DEFAULT_CONFIG and DEFAULT_MODELS in the preload mock.
// Import these in tests for assertion values.
import type { AppConfig, ModelEntry } from '../../src/shared/types'

export const DEFAULT_CONFIG: AppConfig = {
  providers: [
    { name: 'Anthropic', authType: 'apikey', configured: true },
    { name: 'OpenAI', authType: 'apikey', configured: false },
  ],
  defaultModel: 'claude-sonnet-4-5',
  defaultProvider: 'Anthropic',
  defaultThinkingLevel: 'off',
  systemPrompt: '',
  homedir: '/Users/test',
  defaultWorkingDirectory: null,
}

export const DEFAULT_MODELS: ModelEntry[] = [
  {
    provider: 'Anthropic',
    modelId: 'claude-sonnet-4-5',
    displayName: 'Anthropic / claude-sonnet-4-5',
    supportsThinking: true,
  },
  {
    provider: 'Anthropic',
    modelId: 'claude-opus-4-5',
    displayName: 'Anthropic / claude-opus-4-5',
    supportsThinking: true,
  },
  {
    provider: 'OpenAI',
    modelId: 'gpt-4o',
    displayName: 'OpenAI / gpt-4o',
    supportsThinking: false,
  },
]

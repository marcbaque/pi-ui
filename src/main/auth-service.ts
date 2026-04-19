// src/main/auth-service.ts
import { AuthStorage } from '@mariozechner/pi-coding-agent'
import type { ProviderStatus } from '@shared/types'

const OAUTH_PROVIDERS: string[] = [
  'github-copilot',
  'claude-pro',
  'google-gemini-cli',
  'google-antigravity',
  'openai-codex',
]

const API_KEY_PROVIDERS: string[] = [
  'anthropic',
  'openai',
  'google',
  'mistral',
  'groq',
  'xai',
  'openrouter',
  'cerebras',
  'huggingface',
]

export class AuthService {
  readonly storage: AuthStorage

  constructor() {
    this.storage = AuthStorage.create()
  }

  async getProviderStatuses(): Promise<ProviderStatus[]> {
    const all = this.storage.getAll()

    const oauth: ProviderStatus[] = OAUTH_PROVIDERS.map((name) => ({
      name,
      authType: 'oauth',
      configured: name in all && (all[name] as { type: string }).type === 'oauth',
    }))

    const apikey: ProviderStatus[] = API_KEY_PROVIDERS.map((name) => ({
      name,
      authType: 'apikey',
      configured: name in all && (all[name] as { type: string }).type === 'api_key',
    }))

    return [...oauth, ...apikey]
  }

  async setApiKey(provider: string, key: string): Promise<void> {
    this.storage.set(provider, { type: 'api_key', key })
  }
}

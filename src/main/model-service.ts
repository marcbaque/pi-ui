// src/main/model-service.ts
import { ModelRegistry } from '@mariozechner/pi-coding-agent'
import type { AuthService } from './auth-service'
import type { ModelEntry } from '@shared/types'

export class ModelService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly registry: any

  constructor(authService: AuthService) {
    this.registry = ModelRegistry.create(authService.storage)
  }

  async listAvailable(): Promise<ModelEntry[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.registry.getAvailable().map((m: any) => ({
      provider: m.provider,
      modelId: m.id,
      displayName: m.name,
      supportsThinking: m.reasoning,
    }))
  }

  findModel(provider: string, modelId: string) {
    return this.registry.find(provider, modelId)
  }
}

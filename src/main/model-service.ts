// src/main/model-service.ts
import { ModelRegistry } from '@mariozechner/pi-coding-agent'
import type { AuthService } from './auth-service'
import type { ModelEntry } from '@shared/types'

type Registry = ReturnType<typeof ModelRegistry.create>

export class ModelService {
  private readonly registry: Registry

  constructor(authService: AuthService) {
    this.registry = ModelRegistry.create(authService.storage)
  }

  async listAvailable(): Promise<ModelEntry[]> {
    return this.registry.getAvailable().map((m) => ({
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

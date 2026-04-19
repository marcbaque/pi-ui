// src/renderer/src/hooks/useAvailableModels.ts
import { useStore } from '@/store'
import type { ModelEntry } from '@shared/types'

/**
 * Returns only the models whose provider is currently configured (has a valid key / OAuth).
 * Falls back to the full list if no providers are configured at all (e.g. first launch).
 */
export function useAvailableModels(): ModelEntry[] {
  const models = useStore((s) => s.config.models)
  const providers = useStore((s) => s.config.providers)

  const configuredNames = new Set(
    providers.filter((p) => p.configured).map((p) => p.name.toLowerCase())
  )

  // If nothing is configured yet, show everything rather than an empty list
  if (configuredNames.size === 0) return models

  return models.filter((m) => configuredNames.has(m.provider.toLowerCase()))
}

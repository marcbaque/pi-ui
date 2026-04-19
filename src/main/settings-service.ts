// src/main/settings-service.ts
import { readFile, writeFile, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { join, dirname } from 'path'
import type { AppDefaults, AppThinkingLevel } from '@shared/types'

interface SettingsJson {
  defaultProvider?: string | null
  defaultModel?: string | null
  defaultThinkingLevel?: string
  defaultSystemPrompt?: string
  defaultWorkingDirectory?: string | null
  [key: string]: unknown
}

const SETTINGS_PATH = join(homedir(), '.pi', 'agent', 'settings.json')

export class SettingsService {
  async getDefaults(): Promise<AppDefaults> {
    const settings = await this.read()
    return {
      defaultProvider: settings.defaultProvider ?? null,
      defaultModel: settings.defaultModel ?? null,
      defaultThinkingLevel:
        (settings.defaultThinkingLevel as AppThinkingLevel | undefined) ?? 'low',
      systemPrompt: settings.defaultSystemPrompt ?? '',
      defaultWorkingDirectory: settings.defaultWorkingDirectory ?? null,
    }
  }

  async setDefaults(patch: Partial<AppDefaults>): Promise<void> {
    const settings = await this.read()
    if (patch.defaultProvider !== undefined) settings.defaultProvider = patch.defaultProvider
    if (patch.defaultModel !== undefined) settings.defaultModel = patch.defaultModel
    if (patch.defaultThinkingLevel !== undefined)
      settings.defaultThinkingLevel = patch.defaultThinkingLevel
    if (patch.systemPrompt !== undefined) settings.defaultSystemPrompt = patch.systemPrompt
    if (patch.defaultWorkingDirectory !== undefined)
      settings.defaultWorkingDirectory = patch.defaultWorkingDirectory
    await mkdir(dirname(SETTINGS_PATH), { recursive: true })
    await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
  }

  private async read(): Promise<SettingsJson> {
    try {
      return JSON.parse(await readFile(SETTINGS_PATH, 'utf-8')) as SettingsJson
    } catch {
      return {}
    }
  }
}

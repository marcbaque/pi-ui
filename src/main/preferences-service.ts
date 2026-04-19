// src/main/preferences-service.ts
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import type { Preferences } from '@shared/types'

const DEFAULT_PREFERENCES: Preferences = { lastUsedDirectory: null }

export class PreferencesService {
  private readonly path: string

  /** Pass `app.getPath('userData')` in production; inject a temp path in tests. */
  constructor(userDataPath: string) {
    this.path = join(userDataPath, 'preferences.json')
  }

  async get(): Promise<Preferences> {
    try {
      return {
        ...DEFAULT_PREFERENCES,
        ...(JSON.parse(await readFile(this.path, 'utf-8')) as Preferences),
      }
    } catch {
      return { ...DEFAULT_PREFERENCES }
    }
  }

  async set(patch: Partial<Preferences>): Promise<void> {
    const current = await this.get()
    const updated = { ...current, ...patch }
    await mkdir(dirname(this.path), { recursive: true })
    await writeFile(this.path, JSON.stringify(updated, null, 2), 'utf-8')
  }
}

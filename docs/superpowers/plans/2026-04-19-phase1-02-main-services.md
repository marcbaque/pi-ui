# pi-ui Phase 1 — Plan 2: Main Process Services

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four main-process services that own all pi SDK interaction and OS I/O: `AuthService`, `ModelService`, `SettingsService`, and `PreferencesService`. Each is TDD: test first, then implement.

**Architecture:** All services are plain TypeScript classes instantiated once in the main process. They wrap the pi SDK (`AuthStorage`, `ModelRegistry`) and read/write files directly (`~/.pi/agent/settings.json`, Electron userData). No IPC in this plan — that comes in Plan 3.

**Tech Stack:** `@mariozechner/pi-coding-agent` (AuthStorage, ModelRegistry), Node.js `fs/promises`, Electron `app.getPath`, Vitest 4 (node env via `// @vitest-environment node`).

---

### Task 1: Shared types

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Write types**

```typescript
// src/shared/types.ts

/** Subset of pi SDK ThinkingLevel values exposed in the UI */
export type AppThinkingLevel = 'off' | 'low' | 'high'

export interface ModelEntry {
  provider: string
  modelId: string
  displayName: string
  supportsThinking: boolean
}

export interface ProviderStatus {
  name: string
  /** 'oauth' providers use token-based auth; 'apikey' providers use a stored key */
  authType: 'oauth' | 'apikey'
  configured: boolean
}

export interface AppConfig {
  providers: ProviderStatus[]
  defaultModel: string | null
  defaultProvider: string | null
  defaultThinkingLevel: AppThinkingLevel
  systemPrompt: string
}

export interface AppDefaults {
  defaultModel: string | null
  defaultProvider: string | null
  defaultThinkingLevel: AppThinkingLevel
  systemPrompt: string
}

export interface Preferences {
  lastUsedDirectory: string | null
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls: ToolCall[]
  createdAt: number
}

export interface ToolCall {
  id: string
  toolName: string
  args: Record<string, unknown>
  result: string | null
  isError: boolean
  durationMs: number | null
  status: 'pending' | 'done'
}

/** Events emitted from main process → renderer */
export interface PiEventPayloads {
  'pi:token': { sessionId: string; delta: string }
  'pi:tool-start': { sessionId: string; toolCallId: string; toolName: string; args: Record<string, unknown> }
  'pi:tool-end': { sessionId: string; toolCallId: string; toolName: string; result: string; isError: boolean; durationMs: number }
  'pi:turn-end': { sessionId: string }
  'pi:idle': { sessionId: string }
  'pi:error': { sessionId: string; message: string }
}

export type PiEventName = keyof PiEventPayloads

/** The window.pi API exposed by the preload script */
export interface PiAPI {
  session: {
    create(opts: { cwd: string; model: string; provider: string; thinkingLevel: AppThinkingLevel }): Promise<{ sessionId: string }>
    send(sessionId: string, message: string): Promise<void>
    abort(sessionId: string): Promise<void>
  }
  config: {
    get(): Promise<AppConfig>
    setApiKey(provider: string, key: string): Promise<void>
    setDefaults(opts: Partial<AppDefaults>): Promise<void>
  }
  models: {
    list(): Promise<ModelEntry[]>
  }
  dialog: {
    openDirectory(): Promise<string | null>
  }
  shell: {
    openPath(path: string): Promise<void>
  }
  on<E extends PiEventName>(event: E, handler: (payload: PiEventPayloads[E]) => void): () => void
}
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 2: AuthService (TDD)

**Files:**
- Create: `src/main/auth-service.test.ts`
- Create: `src/main/auth-service.ts`

Known providers are split into two categories matching pi's `auth.json` format:
- **OAuth** providers store `{ type: 'oauth', ... }` entries
- **API key** providers store `{ type: 'api_key', key: '...' }` entries

`AuthStorage.getAll()` returns the live credential map. `AuthStorage.set()` writes a credential back to `auth.json`.

- [ ] **Step 1: Write failing tests**

```typescript
// @vitest-environment node
// src/main/auth-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth-service'

const mockGetAll = vi.fn()
const mockSet = vi.fn()

vi.mock('@mariozechner/pi-coding-agent', () => ({
  AuthStorage: {
    create: vi.fn(() => ({ getAll: mockGetAll, set: mockSet })),
  },
}))

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService()
  })

  describe('getProviderStatuses', () => {
    it('marks oauth provider as configured when entry exists with type oauth', async () => {
      mockGetAll.mockReturnValue({
        'github-copilot': { type: 'oauth', access: 'token' },
      })

      const statuses = await service.getProviderStatuses()
      const copilot = statuses.find((s) => s.name === 'github-copilot')

      expect(copilot).toEqual({ name: 'github-copilot', authType: 'oauth', configured: true })
    })

    it('marks oauth provider as not configured when absent', async () => {
      mockGetAll.mockReturnValue({})

      const statuses = await service.getProviderStatuses()
      const copilot = statuses.find((s) => s.name === 'github-copilot')

      expect(copilot).toEqual({ name: 'github-copilot', authType: 'oauth', configured: false })
    })

    it('marks api key provider as configured when entry exists with type api_key', async () => {
      mockGetAll.mockReturnValue({
        anthropic: { type: 'api_key', key: 'sk-ant-abc' },
      })

      const statuses = await service.getProviderStatuses()
      const anthropic = statuses.find((s) => s.name === 'anthropic')

      expect(anthropic).toEqual({ name: 'anthropic', authType: 'apikey', configured: true })
    })

    it('marks api key provider as not configured when absent', async () => {
      mockGetAll.mockReturnValue({})

      const statuses = await service.getProviderStatuses()
      const anthropic = statuses.find((s) => s.name === 'anthropic')

      expect(anthropic).toEqual({ name: 'anthropic', authType: 'apikey', configured: false })
    })
  })

  describe('setApiKey', () => {
    it('calls AuthStorage.set with an api_key credential', async () => {
      await service.setApiKey('anthropic', 'sk-ant-xyz')

      expect(mockSet).toHaveBeenCalledWith('anthropic', { type: 'api_key', key: 'sk-ant-xyz' })
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/main/auth-service.test.ts
```

Expected: FAIL — `AuthService` not found.

- [ ] **Step 3: Implement AuthService**

```typescript
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/main/auth-service.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/auth-service.ts src/main/auth-service.test.ts
git commit -m "feat: add AuthService with credential status and API key persistence"
```

---

### Task 3: ModelService (TDD)

**Files:**
- Create: `src/main/model-service.test.ts`
- Create: `src/main/model-service.ts`

`ModelRegistry.getAvailable()` returns models that have a valid credential. Each `Model` object has `.id`, `.name`, `.provider`, and `.reasoning` (whether thinking is supported).

- [ ] **Step 1: Write failing tests**

```typescript
// @vitest-environment node
// src/main/model-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModelService } from './model-service'
import type { AuthService } from './auth-service'

const mockGetAvailable = vi.fn()
const mockFind = vi.fn()

vi.mock('@mariozechner/pi-coding-agent', () => ({
  ModelRegistry: {
    create: vi.fn(() => ({ getAvailable: mockGetAvailable, find: mockFind })),
  },
}))

const fakeAuthService = { storage: {} } as unknown as AuthService

describe('ModelService', () => {
  let service: ModelService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ModelService(fakeAuthService)
  })

  describe('listAvailable', () => {
    it('maps SDK models to ModelEntry shape', async () => {
      mockGetAvailable.mockReturnValue([
        { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'github-copilot', reasoning: true },
        { id: 'gpt-5', name: 'GPT-5', provider: 'github-copilot', reasoning: false },
      ])

      const models = await service.listAvailable()

      expect(models).toEqual([
        { provider: 'github-copilot', modelId: 'claude-sonnet-4.6', displayName: 'Claude Sonnet 4.6', supportsThinking: true },
        { provider: 'github-copilot', modelId: 'gpt-5', displayName: 'GPT-5', supportsThinking: false },
      ])
    })

    it('returns empty array when no models available', async () => {
      mockGetAvailable.mockReturnValue([])
      expect(await service.listAvailable()).toEqual([])
    })
  })

  describe('findModel', () => {
    it('returns model when found', () => {
      const fakeModel = { id: 'claude-sonnet-4.6', provider: 'github-copilot', reasoning: true, name: 'Claude' }
      mockFind.mockReturnValue(fakeModel)

      const result = service.findModel('github-copilot', 'claude-sonnet-4.6')

      expect(mockFind).toHaveBeenCalledWith('github-copilot', 'claude-sonnet-4.6')
      expect(result).toBe(fakeModel)
    })

    it('returns undefined when model not found', () => {
      mockFind.mockReturnValue(undefined)
      expect(service.findModel('unknown', 'unknown')).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/main/model-service.test.ts
```

Expected: FAIL — `ModelService` not found.

- [ ] **Step 3: Implement ModelService**

```typescript
// src/main/model-service.ts
import { ModelRegistry } from '@mariozechner/pi-coding-agent'
import type { AuthService } from './auth-service'
import type { ModelEntry } from '@shared/types'

export class ModelService {
  private readonly registry: InstanceType<typeof ModelRegistry>

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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/main/model-service.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/model-service.ts src/main/model-service.test.ts
git commit -m "feat: add ModelService wrapping ModelRegistry"
```

---

### Task 4: SettingsService (TDD)

**Files:**
- Create: `src/main/settings-service.test.ts`
- Create: `src/main/settings-service.ts`

Reads/writes `~/.pi/agent/settings.json` directly. Stores `defaultModel`, `defaultProvider`, `defaultThinkingLevel`, and `defaultSystemPrompt`. Pi reads the first three natively; `defaultSystemPrompt` is our own key that pi ignores.

- [ ] **Step 1: Write failing tests**

```typescript
// @vitest-environment node
// src/main/settings-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsService } from './settings-service'

const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockMkdir = vi.fn()

vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}))

vi.mock('os', () => ({ homedir: () => '/home/test' }))

describe('SettingsService', () => {
  let service: SettingsService

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteFile.mockResolvedValue(undefined)
    mockMkdir.mockResolvedValue(undefined)
    service = new SettingsService()
  })

  describe('getDefaults', () => {
    it('returns parsed defaults from settings.json', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          defaultProvider: 'github-copilot',
          defaultModel: 'claude-sonnet-4.6',
          defaultThinkingLevel: 'low',
          defaultSystemPrompt: 'Be concise.',
        })
      )

      const defaults = await service.getDefaults()

      expect(defaults).toEqual({
        defaultProvider: 'github-copilot',
        defaultModel: 'claude-sonnet-4.6',
        defaultThinkingLevel: 'low',
        systemPrompt: 'Be concise.',
      })
    })

    it('returns safe defaults when settings.json does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'))

      const defaults = await service.getDefaults()

      expect(defaults).toEqual({
        defaultProvider: null,
        defaultModel: null,
        defaultThinkingLevel: 'low',
        systemPrompt: '',
      })
    })
  })

  describe('setDefaults', () => {
    it('merges patch into existing settings and writes back', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ defaultProvider: 'github-copilot', someOtherKey: 'preserved' })
      )

      await service.setDefaults({ defaultModel: 'gpt-5', systemPrompt: 'Be brief.' })

      const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(written.defaultModel).toBe('gpt-5')
      expect(written.defaultSystemPrompt).toBe('Be brief.')
      expect(written.defaultProvider).toBe('github-copilot') // preserved
      expect(written.someOtherKey).toBe('preserved') // preserved
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/main/settings-service.test.ts
```

Expected: FAIL — `SettingsService` not found.

- [ ] **Step 3: Implement SettingsService**

```typescript
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
  [key: string]: unknown
}

const SETTINGS_PATH = join(homedir(), '.pi', 'agent', 'settings.json')

export class SettingsService {
  async getDefaults(): Promise<AppDefaults> {
    const settings = await this.read()
    return {
      defaultProvider: settings.defaultProvider ?? null,
      defaultModel: settings.defaultModel ?? null,
      defaultThinkingLevel: (settings.defaultThinkingLevel as AppThinkingLevel | undefined) ?? 'low',
      systemPrompt: settings.defaultSystemPrompt ?? '',
    }
  }

  async setDefaults(patch: Partial<AppDefaults>): Promise<void> {
    const settings = await this.read()
    if (patch.defaultProvider !== undefined) settings.defaultProvider = patch.defaultProvider
    if (patch.defaultModel !== undefined) settings.defaultModel = patch.defaultModel
    if (patch.defaultThinkingLevel !== undefined) settings.defaultThinkingLevel = patch.defaultThinkingLevel
    if (patch.systemPrompt !== undefined) settings.defaultSystemPrompt = patch.systemPrompt
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/main/settings-service.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/settings-service.ts src/main/settings-service.test.ts
git commit -m "feat: add SettingsService reading and writing ~/.pi/agent/settings.json"
```

---

### Task 5: PreferencesService (TDD)

**Files:**
- Create: `src/main/preferences-service.test.ts`
- Create: `src/main/preferences-service.ts`

Stores lightweight UI preferences (e.g. `lastUsedDirectory`) in Electron's `userData` directory — separate from pi's settings so we never pollute pi's config.

- [ ] **Step 1: Write failing tests**

```typescript
// @vitest-environment node
// src/main/preferences-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PreferencesService } from './preferences-service'

const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockMkdir = vi.fn()

vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}))

// Electron's app.getPath is only available in the main process.
// We inject the userData path via the constructor for testability.
describe('PreferencesService', () => {
  let service: PreferencesService

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteFile.mockResolvedValue(undefined)
    mockMkdir.mockResolvedValue(undefined)
    service = new PreferencesService('/fake/userData')
  })

  describe('get', () => {
    it('returns stored preferences', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ lastUsedDirectory: '/home/user/code' }))

      const prefs = await service.get()

      expect(prefs.lastUsedDirectory).toBe('/home/user/code')
    })

    it('returns null lastUsedDirectory when file does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'))

      const prefs = await service.get()

      expect(prefs.lastUsedDirectory).toBeNull()
    })
  })

  describe('set', () => {
    it('merges patch and writes to userData/preferences.json', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ lastUsedDirectory: '/old/path' }))

      await service.set({ lastUsedDirectory: '/new/path' })

      const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(written.lastUsedDirectory).toBe('/new/path')
      expect(mockWriteFile.mock.calls[0][0]).toBe('/fake/userData/preferences.json')
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm test:run src/main/preferences-service.test.ts
```

Expected: FAIL — `PreferencesService` not found.

- [ ] **Step 3: Implement PreferencesService**

```typescript
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
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(await readFile(this.path, 'utf-8')) } as Preferences
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm test:run src/main/preferences-service.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Run all main-process tests together**

```bash
pnpm test:run src/main/
```

Expected: 14 tests pass across 4 test files.

- [ ] **Step 6: Run full check**

```bash
pnpm check
```

Expected: typecheck, lint, and all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/main/preferences-service.ts src/main/preferences-service.test.ts
git commit -m "feat: add PreferencesService for app UI preferences in userData"
```

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
  homedir: string
  defaultWorkingDirectory: string | null
}

export interface AppDefaults {
  defaultModel: string | null
  defaultProvider: string | null
  defaultThinkingLevel: AppThinkingLevel
  systemPrompt: string
  defaultWorkingDirectory: string | null
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
  'pi:tool-start': {
    sessionId: string
    toolCallId: string
    toolName: string
    args: Record<string, unknown>
  }
  'pi:tool-end': {
    sessionId: string
    toolCallId: string
    toolName: string
    result: string
    isError: boolean
    durationMs: number
  }
  'pi:turn-end': { sessionId: string }
  'pi:idle': { sessionId: string }
  'pi:error': { sessionId: string; message: string }
}

export interface SessionSummary {
  id: string
  path: string // full path to JSONL file
  cwd: string // full working directory path
  cwdSlug: string // basename of the cwd session dir slug
  lastActiveAt: number // modified date of JSONL file in ms
  model: string | null // from SessionInfo
  pinned: boolean // from .meta.json
  tags: string[] // from .meta.json
  name: string | null // from SDK SessionInfo.name; null = display timestamp
  isActive: boolean // true if id matches the current live session
}

export interface SessionMeta {
  [sessionId: string]: {
    tags: string[]
    pinned: boolean
  }
}

export type PiEventName = keyof PiEventPayloads

/** The window.pi API exposed by the preload script */
export interface PiAPI {
  session: {
    create(opts: {
      cwd: string
      model: string
      provider: string
      thinkingLevel: AppThinkingLevel
    }): Promise<{ sessionId: string }>
    send(sessionId: string, message: string): Promise<void>
    abort(sessionId: string): Promise<void>
    close(sessionId: string): Promise<void>
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
  sessions: {
    list(): Promise<SessionSummary[]>
    updateMeta(
      sessionId: string,
      patch: Partial<{ tags: string[]; pinned: boolean }>
    ): Promise<void>
    delete(sessionId: string): Promise<void>
    load(sessionPath: string): Promise<Message[]>
    resume(sessionPath: string): Promise<{ sessionId: string }>
  }
  on<E extends PiEventName>(event: E, handler: (payload: PiEventPayloads[E]) => void): () => void
}

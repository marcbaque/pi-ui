// src/main/session-service.ts
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
} from '@mariozechner/pi-coding-agent'
import { randomUUID } from 'crypto'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'
import type { AppThinkingLevel, PiEventName, PiEventPayloads } from '@shared/types'

type EventCallback = <E extends PiEventName>(event: E, payload: PiEventPayloads[E]) => void

type SdkSession = Awaited<ReturnType<typeof createAgentSession>>['session']

interface ActiveSession {
  session: SdkSession
  unsubscribe: () => void
}

export interface CreateSessionOpts {
  cwd: string
  model: string
  provider: string
  thinkingLevel: AppThinkingLevel
}

export class SessionService {
  private readonly sessions = new Map<string, ActiveSession>()

  constructor(
    private readonly modelService: ModelService,
    private readonly settingsService: SettingsService
  ) {}

  async createSession(
    opts: CreateSessionOpts,
    onEvent: EventCallback
  ): Promise<{ sessionId: string }> {
    const model = this.modelService.findModel(opts.provider, opts.model)
    if (!model) throw new Error(`Model not found: ${opts.provider}/${opts.model}`)

    const loader = new DefaultResourceLoader({ cwd: opts.cwd })

    const { session } = await createAgentSession({
      cwd: opts.cwd,
      model,
      thinkingLevel: opts.thinkingLevel,
      resourceLoader: loader,
      sessionManager: SessionManager.create(opts.cwd),
    })

    const sessionId = randomUUID()

    const unsubscribe = session.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        onEvent('pi:token', { sessionId, delta: event.assistantMessageEvent.delta })
      } else if (event.type === 'tool_execution_start') {
        onEvent('pi:tool-start', {
          sessionId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: event.args as Record<string, unknown>,
        })
      } else if (event.type === 'tool_execution_end') {
        const result =
          typeof event.result === 'string' ? event.result : JSON.stringify(event.result)
        onEvent('pi:tool-end', {
          sessionId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          result,
          isError: event.isError,
          durationMs: 0,
        })
      } else if (event.type === 'turn_end') {
        onEvent('pi:turn-end', { sessionId })
      } else if (event.type === 'agent_end') {
        onEvent('pi:idle', { sessionId })
      }
    })

    this.sessions.set(sessionId, { session, unsubscribe })
    return { sessionId }
  }

  async send(sessionId: string, message: string): Promise<void> {
    await this.getOrThrow(sessionId).session.prompt(message)
  }

  async abort(sessionId: string): Promise<void> {
    await this.getOrThrow(sessionId).session.abort()
  }

  closeSession(sessionId: string): void {
    const entry = this.sessions.get(sessionId)
    if (!entry) return
    entry.unsubscribe()
    entry.session.dispose()
    this.sessions.delete(sessionId)
  }

  private getOrThrow(sessionId: string): ActiveSession {
    const entry = this.sessions.get(sessionId)
    if (!entry) throw new Error(`Session not found: ${sessionId}`)
    return entry
  }
}

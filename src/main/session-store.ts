// src/main/session-store.ts
import {
  SessionManager,
  createAgentSession,
  DefaultResourceLoader,
} from '@mariozechner/pi-coding-agent'
import * as fs from 'fs'
import { dirname, basename, join } from 'path'
import { randomUUID } from 'crypto'
import type {
  SessionSummary,
  SessionMeta,
  Message,
  ToolCall,
  PiEventName,
  PiEventPayloads,
} from '@shared/types'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'

type EventCallback = <E extends PiEventName>(event: E, payload: PiEventPayloads[E]) => void

export type FsLike = Pick<typeof fs, 'existsSync' | 'readFileSync' | 'writeFileSync' | 'mkdirSync'>

export class SessionStore {
  private readonly pathById = new Map<string, string>()

  constructor(private readonly fsImpl: FsLike = fs) {}

  async list(activeSessionIds: string[]): Promise<SessionSummary[]> {
    const infos = await SessionManager.listAll()

    return infos.map((info) => {
      const cwdSlug = basename(dirname(info.path))
      const cwdDir = dirname(info.path)
      const meta = this.readMeta(cwdDir)
      const sessionMeta = meta[info.id]

      this.pathById.set(info.id, cwdDir)

      return {
        id: info.id,
        path: info.path,
        cwd: info.cwd,
        cwdSlug,
        lastActiveAt: info.modified.getTime(),
        model: null,
        pinned: sessionMeta?.pinned ?? false,
        tags: sessionMeta?.tags ?? [],
        name: info.name ?? null,
        isActive: activeSessionIds.includes(info.id),
      }
    })
  }

  async updateMeta(
    cwdDir: string,
    sessionId: string,
    patch: Partial<{ tags: string[]; pinned: boolean }>
  ): Promise<void> {
    const meta = this.readMeta(cwdDir)
    meta[sessionId] = {
      tags: patch.tags ?? meta[sessionId]?.tags ?? [],
      pinned: patch.pinned ?? meta[sessionId]?.pinned ?? false,
    }
    this.writeMeta(cwdDir, meta)
  }

  async updateMetaById(
    sessionId: string,
    patch: Partial<{ tags: string[]; pinned: boolean }>
  ): Promise<void> {
    const cwdDir = this.pathById.get(sessionId)
    if (!cwdDir) throw new Error(`Unknown session: ${sessionId}`)
    await this.updateMeta(cwdDir, sessionId, patch)
  }

  async deleteMeta(cwdDir: string, sessionId: string): Promise<void> {
    const meta = this.readMeta(cwdDir)
    delete meta[sessionId]
    this.writeMeta(cwdDir, meta)
  }

  async deleteMetaById(sessionId: string): Promise<void> {
    const cwdDir = this.pathById.get(sessionId)
    if (!cwdDir) throw new Error(`Unknown session: ${sessionId}`)
    await this.deleteMeta(cwdDir, sessionId)
  }

  async load(sessionPath: string): Promise<Message[]> {
    const manager = SessionManager.open(sessionPath)
    const context = manager.buildSessionContext()
    return this.convertMessages(context.messages)
  }

  async resume(
    sessionPath: string,
    _modelService: ModelService,
    _settingsService: SettingsService,
    _onEvent: EventCallback
  ): Promise<{ sessionId: string; sdkSession: unknown }> {
    const manager = SessionManager.open(sessionPath)
    const cwd = manager.getCwd()
    const loader = new DefaultResourceLoader({ cwd })
    const { session } = await createAgentSession({
      cwd,
      resourceLoader: loader,
      sessionManager: manager,
    })
    const sessionId = randomUUID()
    return { sessionId, sdkSession: session }
  }

  private metaPath(cwdDir: string): string {
    return join(cwdDir, '.meta.json')
  }

  private readMeta(cwdDir: string): SessionMeta {
    const metaFile = this.metaPath(cwdDir)
    if (!this.fsImpl.existsSync(metaFile)) return {}
    try {
      return JSON.parse(this.fsImpl.readFileSync(metaFile, 'utf-8') as string) as SessionMeta
    } catch {
      return {}
    }
  }

  private writeMeta(cwdDir: string, meta: SessionMeta): void {
    const metaFile = this.metaPath(cwdDir)
    this.fsImpl.mkdirSync(dirname(metaFile), { recursive: true })
    this.fsImpl.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8')
  }

  private convertMessages(agentMessages: unknown[]): Message[] {
    const result: Message[] = []
    const pendingToolCalls = new Map<string, { msgIdx: number; callIdx: number }>()

    for (const raw of agentMessages) {
      const msg = raw as { role: string; content: unknown; timestamp?: number }

      if (msg.role === 'user') {
        const content =
          typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? (msg.content as Array<{ type: string; text?: string }>)
                  .filter((c) => c.type === 'text')
                  .map((c) => c.text ?? '')
                  .join('')
              : ''
        result.push({
          id: randomUUID(),
          role: 'user',
          content,
          toolCalls: [],
          createdAt: (msg.timestamp as number) ?? Date.now(),
        })
        pendingToolCalls.clear()
      } else if (msg.role === 'assistant') {
        const parts = Array.isArray(msg.content)
          ? (msg.content as Array<{
              type: string
              text?: string
              id?: string
              name?: string
              arguments?: Record<string, unknown>
            }>)
          : []

        const textContent = parts
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('')

        const toolCalls: ToolCall[] = parts
          .filter((c) => c.type === 'toolCall' || c.type === 'tool_use')
          .map((c) => ({
            id: c.id ?? randomUUID(),
            toolName: c.name ?? '',
            args: c.arguments ?? {},
            result: null,
            isError: false,
            durationMs: null,
            status: 'done' as const,
          }))

        const msgIdx = result.length
        result.push({
          id: randomUUID(),
          role: 'assistant',
          content: textContent,
          toolCalls,
          createdAt: Date.now(),
        })

        toolCalls.forEach((call, callIdx) => {
          pendingToolCalls.set(call.id, { msgIdx, callIdx })
        })
      } else if (msg.role === 'toolResult') {
        const toolResult = msg as {
          role: 'toolResult'
          toolCallId: string
          content: Array<{ type: string; text?: string }>
          isError: boolean
        }
        const location = pendingToolCalls.get(toolResult.toolCallId)
        if (location) {
          const targetMsg = result[location.msgIdx]
          if (targetMsg) {
            const call = targetMsg.toolCalls[location.callIdx]
            if (call) {
              call.result = toolResult.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text ?? '')
                .join('')
              call.isError = toolResult.isError
            }
          }
        }
      }
    }

    return result
  }
}

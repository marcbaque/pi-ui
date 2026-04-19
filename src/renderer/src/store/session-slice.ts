// src/renderer/src/store/session-slice.ts
import type { Message, ToolCall, AppThinkingLevel } from '@shared/types'

const uuid = () => crypto.randomUUID()

export interface SessionState {
  active: boolean
  sessionId: string | null
  cwd: string | null
  model: string | null
  provider: string | null
  thinkingLevel: AppThinkingLevel
  status: 'idle' | 'thinking' | 'error'
  messages: Message[]
  currentStreamingContent: string
}

export interface SessionActions {
  setSessionActive(opts: {
    sessionId: string
    cwd: string
    model: string
    provider: string
    thinkingLevel: AppThinkingLevel
  }): void
  clearSession(): void
  setSessionStatus(status: SessionState['status']): void
  addUserMessage(content: string): void
  appendToken(delta: string): void
  finalizeAssistantMessage(): void
  addToolCall(call: { toolCallId: string; toolName: string; args: Record<string, unknown> }): void
  resolveToolCall(result: {
    toolCallId: string
    result: string
    isError: boolean
    durationMs: number
  }): void
}

export const initialSessionState: SessionState = {
  active: false,
  sessionId: null,
  cwd: null,
  model: null,
  provider: null,
  thinkingLevel: 'low',
  status: 'idle',
  messages: [],
  currentStreamingContent: '',
}

export const createSessionSlice = (
  set: (fn: (s: { session: SessionState }) => void) => void
): SessionActions => ({
  setSessionActive: (opts) =>
    set((s) => {
      s.session = { ...initialSessionState, active: true, ...opts }
    }),

  clearSession: () =>
    set((s) => {
      s.session = { ...initialSessionState }
    }),

  setSessionStatus: (status) =>
    set((s) => {
      s.session.status = status
    }),

  addUserMessage: (content) =>
    set((s) => {
      s.session.messages.push({
        id: uuid(),
        role: 'user',
        content,
        toolCalls: [],
        createdAt: Date.now(),
      })
    }),

  appendToken: (delta) =>
    set((s) => {
      s.session.currentStreamingContent += delta
    }),

  finalizeAssistantMessage: () =>
    set((s) => {
      if (!s.session.currentStreamingContent) return
      s.session.messages.push({
        id: uuid(),
        role: 'assistant',
        content: s.session.currentStreamingContent,
        toolCalls: [],
        createdAt: Date.now(),
      })
      s.session.currentStreamingContent = ''
    }),

  addToolCall: ({ toolCallId, toolName, args }) =>
    set((s) => {
      const last = s.session.messages[s.session.messages.length - 1]
      if (!last) return
      const call: ToolCall = {
        id: toolCallId,
        toolName,
        args,
        result: null,
        isError: false,
        durationMs: null,
        status: 'pending',
      }
      last.toolCalls.push(call)
    }),

  resolveToolCall: ({ toolCallId, result, isError, durationMs }) =>
    set((s) => {
      for (const msg of s.session.messages) {
        const call = msg.toolCalls.find((c) => c.id === toolCallId)
        if (call) {
          call.result = result
          call.isError = isError
          call.durationMs = durationMs
          call.status = 'done'
          break
        }
      }
    }),
})

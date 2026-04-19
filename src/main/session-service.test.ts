// @vitest-environment node
// src/main/session-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionService } from './session-service'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'

// --- SDK mock ---
const mockPrompt = vi.fn()
const mockAbort = vi.fn()
const mockDispose = vi.fn()
let capturedSubscriber: ((event: unknown) => void) | null = null

const mockSession = {
  prompt: mockPrompt,
  abort: mockAbort,
  dispose: mockDispose,
  subscribe: vi.fn((cb: (event: unknown) => void) => {
    capturedSubscriber = cb
    return () => {}
  }),
}

vi.mock('@mariozechner/pi-coding-agent', () => ({
  createAgentSession: vi.fn(async () => ({ session: mockSession })),
  DefaultResourceLoader: vi.fn().mockImplementation(function () {
    return {}
  }),
  SessionManager: { create: vi.fn(() => ({ getSessionId: () => 'sdk-session-1' })) },
}))

const fakeModel = {
  id: 'claude-sonnet-4.6',
  provider: 'github-copilot',
  reasoning: true,
  name: 'Claude',
} as never
const fakeModelService = { findModel: vi.fn(() => fakeModel) } as unknown as ModelService
const fakeSettingsService = {
  getDefaults: vi.fn(async () => ({ systemPrompt: 'Be concise.' })),
} as unknown as SettingsService

describe('SessionService', () => {
  let service: SessionService
  const onEvent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    capturedSubscriber = null
    fakeModelService.findModel = vi.fn(() => fakeModel)
    service = new SessionService(fakeModelService, fakeSettingsService)
  })

  describe('createSession', () => {
    it('returns a sessionId', async () => {
      const result = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      expect(typeof result.sessionId).toBe('string')
      expect(result.sessionId.length).toBeGreaterThan(0)
    })

    it('throws when model is not found', async () => {
      fakeModelService.findModel = vi.fn(() => undefined)

      await expect(
        service.createSession(
          { cwd: '/tmp', model: 'bad-model', provider: 'bad', thinkingLevel: 'low' },
          onEvent
        )
      ).rejects.toThrow('Model not found: bad/bad-model')
    })
  })

  describe('send', () => {
    it('calls session.prompt with the message', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      await service.send(sessionId, 'hello')
      expect(mockPrompt).toHaveBeenCalledWith('hello')
    })

    it('throws for an unknown sessionId', async () => {
      await expect(service.send('bad-id', 'hi')).rejects.toThrow('Session not found: bad-id')
    })
  })

  describe('abort', () => {
    it('calls session.abort', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      await service.abort(sessionId, onEvent)
      expect(mockAbort).toHaveBeenCalled()
    })
  })

  describe('event forwarding', () => {
    it('calls onEvent with pi:token when SDK emits message_update text_delta', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )

      capturedSubscriber!({
        type: 'message_update',
        assistantMessageEvent: { type: 'text_delta', delta: 'hello' },
      })

      expect(onEvent).toHaveBeenCalledWith('pi:token', { sessionId, delta: 'hello' })
    })

    it('calls onEvent with pi:idle when SDK emits agent_end', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )

      capturedSubscriber!({ type: 'agent_end' })

      expect(onEvent).toHaveBeenCalledWith('pi:idle', { sessionId })
    })

    it('calls onEvent with pi:turn-end when SDK emits turn_end', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )

      capturedSubscriber!({ type: 'turn_end' })

      expect(onEvent).toHaveBeenCalledWith('pi:turn-end', { sessionId })
    })
  })

  describe('closeSession', () => {
    it('calls session.dispose and removes the session', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )

      service.closeSession(sessionId)

      expect(mockDispose).toHaveBeenCalled()
      await expect(service.send(sessionId, 'hi')).rejects.toThrow('Session not found')
    })
  })
})

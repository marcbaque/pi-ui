// @vitest-environment node
// src/main/session-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionService } from './session-service'
import type { ModelService } from './model-service'
import type { SettingsService } from './settings-service'

// --- SDK mock ---
const mockPrompt = vi.fn()
const mockSteer = vi.fn()
const mockAbort = vi.fn()
const mockDispose = vi.fn()
const mockAppendSessionInfo = vi.fn()
let capturedSubscriber: ((event: unknown) => void) | null = null

const mockSession = {
  prompt: mockPrompt,
  steer: mockSteer,
  abort: mockAbort,
  dispose: mockDispose,
  subscribe: vi.fn((cb: (event: unknown) => void) => {
    capturedSubscriber = cb
    return () => {}
  }),
  resourceLoader: {
    getSkills: vi.fn(() => ({
      skills: [{ name: 'test-skill', description: 'A test skill' }],
      diagnostics: [],
    })),
    getPrompts: vi.fn(() => ({
      prompts: [{ name: 'my-prompt', description: 'A prompt' }],
      diagnostics: [],
    })),
  },
  extensionRunner: undefined,
  sessionManager: {
    appendSessionInfo: mockAppendSessionInfo,
  },
}

vi.mock('@mariozechner/pi-coding-agent', () => ({
  createAgentSession: vi.fn(async () => ({ session: mockSession })),
  DefaultResourceLoader: vi.fn().mockImplementation(function () {
    return {}
  }),
  SessionManager: {
    create: vi.fn(() => ({
      getSessionId: () => 'sdk-session-1',
      appendSessionInfo: mockAppendSessionInfo,
    })),
  },
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

  describe('steer', () => {
    it('calls session.steer with the message', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      await service.steer(sessionId, 'please stop')
      expect(mockSteer).toHaveBeenCalledWith('please stop')
    })

    it('throws for unknown sessionId', async () => {
      await expect(service.steer('no-such-id', 'msg')).rejects.toThrow('Session not found')
    })
  })

  describe('listCommands', () => {
    it('includes curated builtins', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      const cmds = service.listCommands(sessionId)
      const names = cmds.map((c) => c.name)
      expect(names).toContain('compact')
      expect(names).toContain('name')
      expect(names).toContain('reload')
    })

    it('includes skills from resource loader', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      const cmds = service.listCommands(sessionId)
      const skillCmd = cmds.find((c) => c.source === 'skill')
      expect(skillCmd).toBeDefined()
      expect(skillCmd!.insertText).toBe('/skill:test-skill')
    })

    it('includes prompts from resource loader', async () => {
      const { sessionId } = await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      const cmds = service.listCommands(sessionId)
      const promptCmd = cmds.find((c) => c.source === 'prompt')
      expect(promptCmd).toBeDefined()
      expect(promptCmd!.insertText).toBe('/my-prompt')
    })

    it('throws for unknown sessionId', () => {
      expect(() => service.listCommands('no-such-id')).toThrow('Session not found')
    })
  })

  describe('createSession with name', () => {
    it('calls appendSessionInfo when name is provided', async () => {
      await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
          name: 'My Session',
        },
        onEvent
      )
      expect(mockAppendSessionInfo).toHaveBeenCalledWith('My Session')
    })

    it('does not call appendSessionInfo when name is omitted', async () => {
      await service.createSession(
        {
          cwd: '/tmp',
          model: 'claude-sonnet-4.6',
          provider: 'github-copilot',
          thinkingLevel: 'low',
        },
        onEvent
      )
      expect(mockAppendSessionInfo).not.toHaveBeenCalled()
    })
  })
})

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
        {
          id: 'claude-sonnet-4.6',
          name: 'Claude Sonnet 4.6',
          provider: 'github-copilot',
          reasoning: true,
        },
        { id: 'gpt-5', name: 'GPT-5', provider: 'github-copilot', reasoning: false },
      ])

      const models = await service.listAvailable()

      expect(models).toEqual([
        {
          provider: 'github-copilot',
          modelId: 'claude-sonnet-4.6',
          displayName: 'Claude Sonnet 4.6',
          supportsThinking: true,
        },
        {
          provider: 'github-copilot',
          modelId: 'gpt-5',
          displayName: 'GPT-5',
          supportsThinking: false,
        },
      ])
    })

    it('returns empty array when no models available', async () => {
      mockGetAvailable.mockReturnValue([])
      expect(await service.listAvailable()).toEqual([])
    })
  })

  describe('findModel', () => {
    it('returns model when found', () => {
      const fakeModel = {
        id: 'claude-sonnet-4.6',
        provider: 'github-copilot',
        reasoning: true,
        name: 'Claude',
      }
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

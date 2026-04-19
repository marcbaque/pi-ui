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
